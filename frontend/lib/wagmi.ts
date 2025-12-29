import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mantleSepolia } from './contracts';

export const config = getDefaultConfig({
  appName: 'Mantle RWA Invoice Factoring',
  projectId: '71668c75085774a54386bb44efa80419',
  chains: [mantleSepolia as any],
  ssr: true,
});
