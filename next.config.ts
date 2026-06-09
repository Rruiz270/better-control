import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  // Servido sob institutoi10.com.br/better-control (rewrite no LP i10-lp-test).
  // basePath faz assets/_next, rotas, proxy e cookies viverem sob o subpath.
  basePath: "/better-control",
  // DEV: Raphael acessa do M5 pelo IP Tailscale do Mac mini — libera os
  // recursos de dev (HMR/_next) e Server Actions cross-origin desse host.
  allowedDevOrigins: ["100.95.147.76", "192.168.68.137"],
};

export default nextConfig;
