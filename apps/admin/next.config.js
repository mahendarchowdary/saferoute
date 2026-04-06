/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001'
  }
};

module.exports = nextConfig;
