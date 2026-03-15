import type { MetadataRoute } from 'next';

const baseUrl =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://agenda-planner.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/login', '/signup', '/dashboard', '/agendas/', '/share/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/login', '/signup', '/dashboard', '/agendas/', '/share/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
