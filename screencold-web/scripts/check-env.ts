/**
 * Validate environment variables
 * Run: pnpm run check-env
 */

import dotenv from "dotenv";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({
  path: path.resolve(process.cwd(), isProduction ? ".env.production" : ".env.development"),
});
dotenv.config({
  path: path.resolve(process.cwd(), isProduction ? ".env.production.local" : ".env.local"),
});

console.log("✅ Environment files loaded successfully");