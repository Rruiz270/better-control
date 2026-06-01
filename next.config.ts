import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // Servido sob institutoi10.com.br/better-control (rewrite no LP i10-lp-test).
  // basePath faz assets/_next, rotas, proxy e cookies viverem sob o subpath.
  basePath: "/better-control",
};

export default nextConfig;
