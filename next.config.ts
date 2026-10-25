import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/interview", destination: "/", permanent: false },
      { source: "/interview/:path*", destination: "/", permanent: false },
      { source: "/banks", destination: "/", permanent: false },
      { source: "/banks/:path*", destination: "/", permanent: false },
      { source: "/announcements", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
