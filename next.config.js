/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tesseract.js'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle Tesseract.js in server environment
      config.externals = config.externals || []
      config.externals.push({
        'tesseract.js': 'commonjs tesseract.js'
      })
    } else {
      // Handle Tesseract.js in client environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        constants: false,
        assert: false,
        util: false,
      }
    }
    
    // Handle other node modules
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    return config
  },
  // Enable static exports if needed
  output: 'standalone',
  
  // Image optimization settings (updated to use remotePatterns)
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/**',
      }
    ],
    dangerouslyAllowSVG: true,
  },
  
  // Headers for better security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 