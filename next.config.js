/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'yt3.ggpht.com',    // YouTube profile images
      'i.ytimg.com',      // YouTube video thumbnails
      'yt3.googleusercontent.com'  // Another YouTube image domain
    ],
  },
}

module.exports = nextConfig 