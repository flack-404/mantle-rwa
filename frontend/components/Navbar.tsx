'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
  return (
    <nav className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-white">
              Mantle RWA
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/business"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition"
              >
                Business
              </Link>
              <Link
                href="/investor"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition"
              >
                Investor
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition"
              >
                Dashboard
              </Link>
            </div>
          </div>
          <div>
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
