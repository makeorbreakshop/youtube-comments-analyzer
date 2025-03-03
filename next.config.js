/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'yt3.ggpht.com'],
  },
  experimental: {
    // Remove serverActions as it's now available by default
  },
  // Disable static generation for pages with auth components
  output: 'standalone',
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
}

module.exports = nextConfig 