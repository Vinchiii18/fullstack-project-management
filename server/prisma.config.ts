// prisma.config.ts
import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// Helper to ensure env vars exist
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing in your .env file`);
  return value;
}

export default defineConfig({
  datasource: {
    url: getEnvVar("DATABASE_URL"),
    directUrl: getEnvVar("DIRECT_URL"), // optional
  },
});
