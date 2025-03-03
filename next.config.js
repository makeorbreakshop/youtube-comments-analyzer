/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  output: 'standalone',
  dynamicRoutes: ['/api/:path*'],
  excludeStaticRoutes: ['/**/api/**/*'],
  generateStaticParams: {
    retryCount: 0,
    disableForRoutes: ['/api/**']
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