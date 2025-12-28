// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title InvoiceNFT
 * @dev ERC-721 contract for tokenizing B2B invoices
 * @notice Each invoice becomes a unique NFT with on-chain metadata
 */
contract InvoiceNFT is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    enum InvoiceStatus {
        PENDING,      // Invoice minted, awaiting verification
        VERIFIED,     // Oracle verified invoice authenticity
        FUNDED,       // Invoice added to vault and funded
        PAID,         // Debtor paid invoice in full
        DEFAULTED,    // Invoice past maturity date without payment
        PARTIAL_PAID  // Invoice partially paid
    }

    struct Invoice {
        uint256 tokenId;
        uint256 faceValue;        // Original invoice amount
        uint256 discountedValue;  // Amount business receives (face value minus discount)
        uint256 maturityDate;     // When payment is due
        address debtor;           // Debtor address (could be hash for privacy)
        bytes32 invoiceHash;      // IPFS hash of invoice PDF
        InvoiceStatus status;
        uint256 paidAmount;       // Tracking partial payments
        uint256 issuedAt;         // Timestamp when invoice was minted
        address issuer;           // Business that issued the invoice
        string debtorName;        // Off-chain debtor identifier
        uint256 discountRate;     // Discount rate in basis points (e.g., 500 = 5%)
    }

    mapping(uint256 => Invoice) public invoices;
    mapping(bytes32 => bool) public usedInvoiceHashes; // Prevent duplicate invoices

    uint256 private _nextTokenId = 1;

    // Statistics
    uint256 public totalInvoicesFunded;
    uint256 public totalValueFunded;
    uint256 public totalValuePaid;
    uint256 public totalDefaulted;

    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed issuer,
        uint256 faceValue,
        uint256 discountedValue,
        uint256 maturityDate,
        bytes32 invoiceHash
    );

    event InvoiceVerified(
        uint256 indexed tokenId,
        address indexed oracle,
        uint256 timestamp
    );

    event InvoiceFunded(
        uint256 indexed tokenId,
        address indexed vault,
        uint256 timestamp
    );

    event InvoiceRepaid(
        uint256 indexed tokenId,
        uint256 amount,
        uint256 totalPaid,
        InvoiceStatus newStatus
    );

    event InvoiceDefaulted(
        uint256 indexed tokenId,
        uint256 timestamp,
        uint256 amountUnpaid
    );

    constructor() ERC721("Invoice NFT", "iNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new invoice NFT
     * @param _faceValue The full value of the invoice
     * @param _maturityDate When the invoice is due
     * @param _debtor Address representing the debtor
     * @param _invoiceHash IPFS hash of the invoice document
     * @param _debtorName Human-readable debtor identifier
     * @param _discountRate Discount rate in basis points
     * @return tokenId The ID of the newly minted invoice NFT
     */
    function mintInvoice(
        uint256 _faceValue,
        uint256 _maturityDate,
        address _debtor,
        bytes32 _invoiceHash,
        string memory _debtorName,
        uint256 _discountRate
    ) external onlyRole(ISSUER_ROLE) nonReentrant returns (uint256) {
        require(_maturityDate > block.timestamp, "Maturity must be in future");
        require(_faceValue > 0, "Face value must be positive");
        require(_debtor != address(0), "Invalid debtor address");
        require(_invoiceHash != bytes32(0), "Invalid invoice hash");
        require(!usedInvoiceHashes[_invoiceHash], "Invoice already exists");
        require(_discountRate > 0 && _discountRate <= 5000, "Discount rate must be 0-50%"); // Max 50% discount

        uint256 tokenId = _nextTokenId++;
        uint256 discountedValue = (_faceValue * (10000 - _discountRate)) / 10000;

        invoices[tokenId] = Invoice({
            tokenId: tokenId,
            faceValue: _faceValue,
            discountedValue: discountedValue,
            maturityDate: _maturityDate,
            debtor: _debtor,
            invoiceHash: _invoiceHash,
            status: InvoiceStatus.PENDING,
            paidAmount: 0,
            issuedAt: block.timestamp,
            issuer: msg.sender,
            debtorName: _debtorName,
            discountRate: _discountRate
        });

        usedInvoiceHashes[_invoiceHash] = true;

        _safeMint(msg.sender, tokenId);

        emit InvoiceMinted(
            tokenId,
            msg.sender,
            _faceValue,
            discountedValue,
            _maturityDate,
            _invoiceHash
        );

        return tokenId;
    }

    /**
     * @dev Oracle verifies invoice authenticity
     * @param _tokenId The invoice token ID to verify
     */
    function verifyInvoice(uint256 _tokenId) external onlyRole(ORACLE_ROLE) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        Invoice storage invoice = invoices[_tokenId];
        require(invoice.status == InvoiceStatus.PENDING, "Invoice not in PENDING status");
        require(block.timestamp < invoice.maturityDate, "Invoice already matured");

        invoice.status = InvoiceStatus.VERIFIED;

        emit InvoiceVerified(_tokenId, msg.sender, block.timestamp);
    }

    /**
     * @dev Mark invoice as funded (called by vault)
     * @param _tokenId The invoice token ID
     */
    function markAsFunded(uint256 _tokenId) external onlyRole(VAULT_ROLE) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        Invoice storage invoice = invoices[_tokenId];
        require(invoice.status == InvoiceStatus.VERIFIED, "Invoice not verified");

        invoice.status = InvoiceStatus.FUNDED;
        totalInvoicesFunded++;
        totalValueFunded += invoice.faceValue;

        emit InvoiceFunded(_tokenId, msg.sender, block.timestamp);
    }

    /**
     * @dev Record payment on an invoice (partial or full)
     * @param _tokenId The invoice token ID
     * @param _amount The amount paid
     */
    function recordPayment(uint256 _tokenId, uint256 _amount)
        external
        onlyRole(ORACLE_ROLE)
        nonReentrant
    {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        require(_amount > 0, "Payment amount must be positive");

        Invoice storage invoice = invoices[_tokenId];
        require(
            invoice.status == InvoiceStatus.FUNDED ||
            invoice.status == InvoiceStatus.PARTIAL_PAID,
            "Invoice not in valid state for payment"
        );
        require(invoice.paidAmount + _amount <= invoice.faceValue, "Payment exceeds face value");

        invoice.paidAmount += _amount;
        totalValuePaid += _amount;

        InvoiceStatus newStatus;
        if (invoice.paidAmount >= invoice.faceValue) {
            newStatus = InvoiceStatus.PAID;
        } else {
            newStatus = InvoiceStatus.PARTIAL_PAID;
        }

        invoice.status = newStatus;

        emit InvoiceRepaid(_tokenId, _amount, invoice.paidAmount, newStatus);
    }

    /**
     * @dev Mark invoice as defaulted (past maturity without full payment)
     * @param _tokenId The invoice token ID
     */
    function markAsDefaulted(uint256 _tokenId) external onlyRole(ORACLE_ROLE) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");

        Invoice storage invoice = invoices[_tokenId];
        require(block.timestamp > invoice.maturityDate, "Invoice not yet matured");
        require(invoice.status != InvoiceStatus.PAID, "Invoice already paid");
        require(invoice.status != InvoiceStatus.DEFAULTED, "Already marked as defaulted");

        invoice.status = InvoiceStatus.DEFAULTED;
        uint256 amountUnpaid = invoice.faceValue - invoice.paidAmount;
        totalDefaulted += amountUnpaid;

        emit InvoiceDefaulted(_tokenId, block.timestamp, amountUnpaid);
    }

    /**
     * @dev Get invoice details
     * @param _tokenId The invoice token ID
     * @return Invoice struct
     */
    function getInvoice(uint256 _tokenId) external view returns (Invoice memory) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        return invoices[_tokenId];
    }

    /**
     * @dev Get invoice status
     * @param _tokenId The invoice token ID
     * @return InvoiceStatus enum value
     */
    function getInvoiceStatus(uint256 _tokenId) external view returns (InvoiceStatus) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        return invoices[_tokenId].status;
    }

    /**
     * @dev Get remaining days until maturity
     * @param _tokenId The invoice token ID
     * @return Days until maturity (0 if matured)
     */
    function getDaysUntilMaturity(uint256 _tokenId) external view returns (uint256) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        Invoice memory invoice = invoices[_tokenId];

        if (block.timestamp >= invoice.maturityDate) {
            return 0;
        }

        return (invoice.maturityDate - block.timestamp) / 1 days;
    }

    /**
     * @dev Calculate expected yield for an invoice
     * @param _tokenId The invoice token ID
     * @return Expected yield amount
     */
    function getExpectedYield(uint256 _tokenId) external view returns (uint256) {
        require(_ownerOf(_tokenId) != address(0), "Invoice does not exist");
        Invoice memory invoice = invoices[_tokenId];
        return invoice.faceValue - invoice.discountedValue;
    }

    /**
     * @dev Get platform statistics
     * @return Statistics tuple
     */
    function getStatistics() external view returns (
        uint256 totalFunded,
        uint256 valueFunded,
        uint256 valuePaid,
        uint256 valueDefaulted,
        uint256 totalSupply
    ) {
        return (
            totalInvoicesFunded,
            totalValueFunded,
            totalValuePaid,
            totalDefaulted,
            _nextTokenId - 1
        );
    }

    // Override functions required by Solidity

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
