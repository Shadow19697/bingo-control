import { readFile, writeFile } from "node:fs/promises";

const sourcePath = new URL("../public/tickets.json", import.meta.url);
const outputPath = new URL("../worker/seed.local.sql", import.meta.url);
const payload = JSON.parse(await readFile(sourcePath, "utf8"));

if (!payload || !Array.isArray(payload.tickets)) {
	throw new Error("public/tickets.json debe contener un arreglo tickets.");
}

const ids = new Set();
const escapeSql = (value) => String(value).replaceAll("'", "''");
const rows = payload.tickets.map((ticket, index) => {
	const id = typeof ticket.id === "number" || typeof ticket.id === "string" ? String(ticket.id).trim() : "";
	const numbers = ticket.numbers;
	if (!id || ids.has(id) || !Array.isArray(numbers) || numbers.length !== 15 || new Set(numbers).size !== 15 || !numbers.every((value) => Number.isInteger(value) && value >= 1 && value <= 90)) {
		throw new Error(`Carton invalido en la fila ${index + 1}.`);
	}
	ids.add(id);
	const name = typeof ticket.name === "string" && ticket.name.trim() ? `'${escapeSql(ticket.name.trim())}'` : "NULL";
	return `INSERT INTO tickets (id, name, numbers_json) VALUES ('${escapeSql(id)}', ${name}, '${escapeSql(JSON.stringify([...numbers].sort((a, b) => a - b)))}');`;
});

const sql = [
	"BEGIN TRANSACTION;",
	"DELETE FROM tickets;",
	...rows,
	`INSERT INTO audit_logs (action, actor, details_json) VALUES ('seed_local', 'local-script', '{"count":${rows.length}}');`,
	"COMMIT;",
	"",
].join("\n");

await writeFile(outputPath, sql, "utf8");
console.log(`Seed local creado: ${rows.length} cartones en worker/seed.local.sql`);