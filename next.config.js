/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Optimize webpack cache to reduce serialization warnings
  webpack: (config, { isServer }) => {
    // Use memory cache for better performance during development
    if (!isServer && process.env.NODE_ENV === 'development') {
      config.cache = {
        type: 'memory',
      }
    }
    return config
  },
}

module.exports = nextConfig
