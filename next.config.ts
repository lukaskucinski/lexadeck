import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  /* config options here */
};

// `npm run analyze` (ANALYZE=true, via a --webpack build since the analyzer is
// webpack-based) emits per-route bundle treemaps to .next/analyze — used to
// inspect module composition (e.g. motion off /welcome). Actual served bytes
// are measured by scripts/perf-probe.ts. A no-op for normal Turbopack builds.
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(
  nextConfig,
);
