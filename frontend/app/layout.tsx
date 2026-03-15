import type { Metadata } from 'next';
import './globals.css';

const appUrl =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://agenda-planner.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Agenda Planner — Collaborative time-slotted plans',
    template: '%s | Agenda Planner',
  },
  description:
    'Create time-slotted agendas, share via link, and collaborate with comments and role-based permissions. Like a lightweight calendar you can share.',
  keywords: [
    'agenda planner',
    'calendar',
    'schedule',
    'collaborative',
    'share agenda',
    'time slots',
    'meeting agenda',
    'team planning',
  ],
  authors: [{ name: 'Agenda Planner' }],
  creator: 'Agenda Planner',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'Agenda Planner',
    title: 'Agenda Planner — Collaborative time-slotted plans',
    description:
      'Create time-slotted agendas, share via link, and collaborate with comments and role-based permissions.',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'Agenda Planner',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Agenda Planner — Collaborative time-slotted plans',
    description:
      'Create time-slotted agendas, share via link, and collaborate with comments and role-based permissions.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
