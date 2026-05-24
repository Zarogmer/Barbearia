/**
 * Setup global do Vitest. Carrega .env.test apenas se rodando integration
 * tests (que precisam de Postgres dedicado). Unit tests não tocam DB.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

const isIntegration = process.argv.some((arg) => arg.includes("integration"));
const envFile = isIntegration ? ".env.test" : ".env";

config({ path: resolve(process.cwd(), envFile), override: false });
