import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DaiLaunch — Token Launchpad on Base',
  description: 'Deploy tokens on Base chain with GitHub integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
