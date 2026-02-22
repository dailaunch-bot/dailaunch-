import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DaiLaunch — Token Launchpad on Base',
  description: 'Deploy tokens on Base chain with GitHub integration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}