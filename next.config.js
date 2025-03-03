/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // This enables dynamic rendering for routes that need it
    // rather than attempting to statically generate everything
    serverActions: true,
  },
  images: {
    domains: [
      'yt3.ggpht.com',    // YouTube profile images
      'i.ytimg.com',      // YouTube video thumbnails
      'yt3.googleusercontent.com'  // Another YouTube image domain
    ],
  },
}

module.exports = nextConfig 