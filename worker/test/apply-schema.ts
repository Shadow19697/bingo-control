import { env } from "cloudflare:workers";

type TestEnv = {
	DB: D1Database;
	TEST_SCHEMA_SQL: string;
};

const testEnv = env as unknown as TestEnv;

// D1Database.exec() expects one statement per line; the schema file is
// pretty-printed across multiple lines per statement, so it needs flattening.
const statements = testEnv.TEST_SCHEMA_SQL.split(";")
	.map((statement) => statement.replace(/\s+/g, " ").trim())
	.filter((statement) => statement.length > 0);

await testEnv.DB.exec(statements.map((statement) => `${statement};`).join("\n"));
