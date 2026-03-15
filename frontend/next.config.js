/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon.png' }];
  },
};
