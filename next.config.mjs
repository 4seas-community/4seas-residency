/** @type {import('next').NextConfig} */
// The app is served at 4seas.xyz/residency — the root of that domain is a separate
// Webflow site. Next prefixes routes, chunks and <Link> automatically; anything
// written as a literal string (public/ asset URLs, metadata icons, middleware
// redirects) has to spell out /residency itself.
const nextConfig = {
  basePath: '/residency',
}

export default nextConfig
