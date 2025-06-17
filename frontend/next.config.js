/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'lh3.googleusercontent.com'],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  // Enable static exports for Netlify
  trailingSlash: true,
  // Disable image optimization during build
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig 