import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Virgil — AI résumé tailoring + auto-apply',
  description:
    'Upload your résumé, get 10 hand-matched jobs free, then auto-apply to hundreds with one click.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
