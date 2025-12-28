import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepolia } from './contracts';

export const config = getDefaultConfig({
  appName: 'Mantle RWA Invoice Factoring',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [mantleSepolia as any],
  ssr: true,
});
