import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";
import { parseServerEnv } from "./src/config/server-env-schema";

const nextConfig: NextConfig = {
  /* config options here */
};

export default function configureNext(phase: string): NextConfig {
  if (phase !== PHASE_PRODUCTION_BUILD) {
    parseServerEnv(process.env);
  }

  return nextConfig;
}
