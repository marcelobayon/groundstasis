/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lint locally / in CI with `npm run lint`, not as a deploy gate.
  eslint: { ignoreDuringBuilds: true },
  // Ground Stasis keeps the surface area small on purpose. No image CDN, no
  // custom webpack. The heavy lifting (satellite stats) happens in async jobs,
  // never inside a page render.
  async headers() {
    return [
      {
        // Never let private site/dashboard routes be indexed.
        source: "/(demo|admin|dashboard)(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
