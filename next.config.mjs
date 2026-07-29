/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/residency',
        destination: 'https://residency.4seas.xyz/',
        statusCode: 302,
      },
      {
        source: '/residency/:path*',
        destination: 'https://residency.4seas.xyz/:path*',
        statusCode: 302,
      },
    ]
  },
}

export default nextConfig
