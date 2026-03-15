import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agenda Planner',
  description: 'Collaborative agenda planner',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#111111] text-[#fafafa] antialiased">
        {children}
      </body>
    </html>
  );
}
