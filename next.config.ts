import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Keep Prisma external so OpenNext can patch the generated client for the
  // workerd runtime. Without this, Next.js bundles the Node binary engine and
  // the Worker fails with "could not locate the Query Engine".
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
