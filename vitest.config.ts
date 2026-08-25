import { readFileSync } from "node:fs";
import path from "node:path";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const schemaSql = readFileSync(path.join(__dirname, "worker/schema.sql"), "utf8");

export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./worker/index.ts",
			miniflare: {
				compatibilityDate: "2026-08-20",
				d1Databases: ["DB"],
				bindings: {
					ADMIN_USERNAME: "admin",
					ADMIN_PASSWORD: "test-password",
					SESSION_SECRET: "test-secret-key-for-vitest",
					SESSION_TTL_MINUTES: "30",
					TEST_SCHEMA_SQL: schemaSql,
				},
			},
		}),
	],
	test: {
		setupFiles: ["./worker/test/apply-schema.ts"],
	},
});
