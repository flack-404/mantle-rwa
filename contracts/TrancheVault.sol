// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./InvoiceNFT.sol";
import "./KYCGate.sol";

/**
 * @title TrancheVault
 * @dev ERC-4626 vault for pooling invoices into tranches
 * @notice Senior and junior tranches for different risk/return profiles
 */
contract TrancheVault is ERC4626, Ownable, ReentrancyGuard {

    InvoiceNFT public invoiceNFT;
    KYCGate public kycGate;

    bool public isSenior;           // true = senior tranche, false = junior
    uint256 public targetAPY;       // Target APY in basis points (e.g., 800 = 8%)
    uint256 public totalInvoiceValue;
    uint256 public totalInvoiceDiscountedValue;

    uint256[] public invoiceIds;
    mapping(uint256 => bool) public containsInvoice;

    uint256 public totalYieldDistributed;
    uint256 public lastDistributionTime;
    uint256 public epochCounter;

    // Vault parameters
    uint256 public minDeposit = 100 * 10**6; // Minimum deposit (100 USDC assuming 6 decimals)
    uint256 public depositCap;               // Maximum total deposits (0 = unlimited)
    bool public depositsEnabled = true;
    bool public withdrawalsEnabled = true;

    // Performance tracking
    uint256 public totalDefaultLoss;
    uint256 public cumulativeYield;

    struct InvoiceAllocation {
        uint256 invoiceId;
        uint256 faceValue;
        uint256 addedAt;
        bool isActive;
    }

    mapping(uint256 => InvoiceAllocation) public allocations;

    event InvoiceAdded(
        uint256 indexed invoiceId,
        uint256 faceValue,
        uint256 discountedValue,
        uint256 timestamp
    );

    event InvoiceRemoved(
        uint256 indexed invoiceId,
        uint256 timestamp,
        string reason
    );

    event YieldDistributed(
        uint256 amount,
        uint256 timestamp,
        uint256 epoch,
        uint256 newSharePrice
    );

    event LossRecorded(
        uint256 indexed invoiceId,
        uint256 lossAmount,
        uint256 timestamp
    );

    event VaultParametersUpdated(
        uint256 minDeposit,
        uint256 depositCap,
        bool depositsEnabled,
        bool withdrawalsEnabled
    );

    constructor(
        address _invoiceNFT,
        address _kycGate,
        address _asset,
        bool _isSenior,
        uint256 _targetAPY,
        string memory _name,
        string memory _symbol
    ) ERC4626(IERC20(_asset)) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_invoiceNFT != address(0), "Invalid InvoiceNFT address");
        require(_kycGate != address(0), "Invalid KYCGate address");
        require(_asset != address(0), "Invalid asset address");
        require(_targetAPY > 0 && _targetAPY <= 10000, "Invalid APY (0-100%)");

        invoiceNFT = InvoiceNFT(_invoiceNFT);
        kycGate = KYCGate(_kycGate);
        isSenior = _isSenior;
        targetAPY = _targetAPY;
        lastDistributionTime = block.timestamp;
    }

    /**
     * @dev Deposit assets with KYC check
     */
    function deposit(uint256 assets, address receiver)
        public
        virtual
        override
        nonReentrant
        returns (uint256)
    {
        require(depositsEnabled, "Deposits are currently disabled");
        require(kycGate.isVerified(receiver), "Receiver not KYC verified");
        require(assets >= minDeposit, "Below minimum deposit");

        if (depositCap > 0) {
            require(totalAssets() + assets <= depositCap, "Deposit exceeds cap");
        }

        return super.deposit(assets, receiver);
    }

    /**
     * @dev Mint shares with KYC check
     */
    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        nonReentrant
        returns (uint256)
    {
        require(depositsEnabled, "Deposits are currently disabled");
        require(kycGate.isVerified(receiver), "Receiver not KYC verified");

        uint256 assets = previewMint(shares);
        require(assets >= minDeposit, "Below minimum deposit");

        if (depositCap > 0) {
            require(totalAssets() + assets <= depositCap, "Deposit exceeds cap");
        }

        return super.mint(shares, receiver);
    }

    /**
     * @dev Redeem shares with KYC check
     */
    function redeem(uint256 shares, address receiver, address owner)
        public
        virtual
        override
        nonReentrant
        returns (uint256)
    {
        require(withdrawalsEnabled, "Withdrawals are currently disabled");
        require(kycGate.isVerified(receiver), "Receiver not KYC verified");

        return super.redeem(shares, receiver, owner);
    }

    /**
     * @dev Withdraw assets with KYC check
     */
    function withdraw(uint256 assets, address receiver, address owner)
        public
        virtual
        override
        nonReentrant
        returns (uint256)
    {
        require(withdrawalsEnabled, "Withdrawals are currently disabled");
        require(kycGate.isVerified(receiver), "Receiver not KYC verified");

        return super.withdraw(assets, receiver, owner);
    }

    /**
     * @dev Add invoice to vault portfolio
     * @param _invoiceId Invoice token ID to add
     */
    function addInvoice(uint256 _invoiceId) external onlyOwner nonReentrant {
        require(!containsInvoice[_invoiceId], "Invoice already in vault");

        InvoiceNFT.Invoice memory invoice = invoiceNFT.getInvoice(_invoiceId);
        require(
            invoice.status == InvoiceNFT.InvoiceStatus.VERIFIED,
            "Invoice not verified"
        );
        require(invoice.maturityDate > block.timestamp, "Invoice already matured");

        invoiceIds.push(_invoiceId);
        containsInvoice[_invoiceId] = true;
        totalInvoiceValue += invoice.faceValue;
        totalInvoiceDiscountedValue += invoice.discountedValue;

        allocations[_invoiceId] = InvoiceAllocation({
            invoiceId: _invoiceId,
            faceValue: invoice.faceValue,
            addedAt: block.timestamp,
            isActive: true
        });

        emit InvoiceAdded(
            _invoiceId,
            invoice.faceValue,
            invoice.discountedValue,
            block.timestamp
        );
    }

    /**
     * @dev Remove invoice from vault (when paid or defaulted)
     * @param _invoiceId Invoice token ID to remove
     * @param _reason Reason for removal
     */
    function removeInvoice(uint256 _invoiceId, string memory _reason)
        external
        onlyOwner
        nonReentrant
    {
        require(containsInvoice[_invoiceId], "Invoice not in vault");

        InvoiceNFT.Invoice memory invoice = invoiceNFT.getInvoice(_invoiceId);

        containsInvoice[_invoiceId] = false;
        allocations[_invoiceId].isActive = false;

        // Adjust totals
        if (totalInvoiceValue >= invoice.faceValue) {
            totalInvoiceValue -= invoice.faceValue;
        }
        if (totalInvoiceDiscountedValue >= invoice.discountedValue) {
            totalInvoiceDiscountedValue -= invoice.discountedValue;
        }

        emit InvoiceRemoved(_invoiceId, block.timestamp, _reason);
    }

    /**
     * @dev Distribute yield to vault (when invoices are paid)
     * @param _amount Amount of yield to distribute
     */
    function distributeYield(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Yield amount must be positive");

        // Transfer yield from sender to vault
        IERC20(asset()).transferFrom(msg.sender, address(this), _amount);

        totalYieldDistributed += _amount;
        cumulativeYield += _amount;
        lastDistributionTime = block.timestamp;
        epochCounter++;

        uint256 newSharePrice = convertToAssets(10**decimals());

        emit YieldDistributed(_amount, block.timestamp, epochCounter, newSharePrice);
    }

    /**
     * @dev Record loss from defaulted invoice
     * @param _invoiceId Invoice that defaulted
     * @param _lossAmount Amount of loss
     */
    function recordLoss(uint256 _invoiceId, uint256 _lossAmount)
        external
        onlyOwner
        nonReentrant
    {
        require(containsInvoice[_invoiceId], "Invoice not in vault");
        require(_lossAmount > 0, "Loss amount must be positive");

        totalDefaultLoss += _lossAmount;

        emit LossRecorded(_invoiceId, _lossAmount, block.timestamp);
    }

    /**
     * @dev Calculate expected APY based on current portfolio
     * @return Expected APY in basis points
     */
    function getExpectedAPY() external view returns (uint256) {
        if (totalInvoiceValue == 0 || invoiceIds.length == 0) {
            return 0;
        }

        uint256 totalExpectedYield = 0;
        uint256 totalDuration = 0;
        uint256 activeInvoices = 0;

        for (uint256 i = 0; i < invoiceIds.length; i++) {
            if (!allocations[invoiceIds[i]].isActive) continue;

            InvoiceNFT.Invoice memory invoice = invoiceNFT.getInvoice(invoiceIds[i]);

            if (invoice.status != InvoiceNFT.InvoiceStatus.PAID &&
                invoice.status != InvoiceNFT.InvoiceStatus.DEFAULTED) {

                uint256 yieldAmount = invoice.faceValue - invoice.discountedValue;
                uint256 duration = invoice.maturityDate > invoice.issuedAt ?
                    invoice.maturityDate - invoice.issuedAt : 90 days;

                totalExpectedYield += yieldAmount;
                totalDuration += duration;
                activeInvoices++;
            }
        }

        if (activeInvoices == 0 || totalDuration == 0) {
            return 0;
        }

        uint256 avgDuration = totalDuration / activeInvoices;
        if (avgDuration == 0) return 0;

        // APY = (totalYield / totalValue) * (365 days / avgDuration) * 10000
        uint256 apy = (totalExpectedYield * 365 days * 10000) /
                      (totalInvoiceValue * avgDuration);

        return apy;
    }

    /**
     * @dev Get vault statistics
     */
    function getVaultStats() external view returns (
        uint256 tvl,
        uint256 invoiceCount,
        uint256 activeInvoiceValue,
        uint256 totalYield,
        uint256 totalLoss,
        uint256 sharePrice,
        uint256 expectedAPY
    ) {
        tvl = totalAssets();
        invoiceCount = invoiceIds.length;
        activeInvoiceValue = totalInvoiceValue;
        totalYield = totalYieldDistributed;
        totalLoss = totalDefaultLoss;
        sharePrice = totalSupply() > 0 ? convertToAssets(10**decimals()) : 10**decimals();
        expectedAPY = this.getExpectedAPY();
    }

    /**
     * @dev Get all invoice IDs in vault
     */
    function getAllInvoiceIds() external view returns (uint256[] memory) {
        return invoiceIds;
    }

    /**
     * @dev Get active invoice IDs only
     */
    function getActiveInvoiceIds() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active invoices
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            if (allocations[invoiceIds[i]].isActive) {
                activeCount++;
            }
        }

        // Create array of active IDs
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < invoiceIds.length; i++) {
            if (allocations[invoiceIds[i]].isActive) {
                activeIds[index] = invoiceIds[i];
                index++;
            }
        }

        return activeIds;
    }

    /**
     * @dev Update vault parameters
     */
    function updateVaultParameters(
        uint256 _minDeposit,
        uint256 _depositCap,
        bool _depositsEnabled,
        bool _withdrawalsEnabled
    ) external onlyOwner {
        minDeposit = _minDeposit;
        depositCap = _depositCap;
        depositsEnabled = _depositsEnabled;
        withdrawalsEnabled = _withdrawalsEnabled;

        emit VaultParametersUpdated(
            _minDeposit,
            _depositCap,
            _depositsEnabled,
            _withdrawalsEnabled
        );
    }

    /**
     * @dev Update target APY
     */
    function updateTargetAPY(uint256 _newTargetAPY) external onlyOwner {
        require(_newTargetAPY > 0 && _newTargetAPY <= 10000, "Invalid APY");
        targetAPY = _newTargetAPY;
    }

    /**
     * @dev Get current share price
     */
    function getSharePrice() external view returns (uint256) {
        return totalSupply() > 0 ? convertToAssets(10**decimals()) : 10**decimals();
    }

    /**
     * @dev Get user's position value
     */
    function getUserPosition(address _user) external view returns (
        uint256 shares,
        uint256 assets,
        uint256 percentageOfVault
    ) {
        shares = balanceOf(_user);
        assets = convertToAssets(shares);
        percentageOfVault = totalSupply() > 0 ?
            (shares * 10000) / totalSupply() : 0;
    }
}
