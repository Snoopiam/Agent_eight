/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable transpiling of shared types from parent directory
  transpilePackages: ['../shared'],
};

module.exports = nextConfig;

