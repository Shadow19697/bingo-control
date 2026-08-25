import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker, { createSessionToken, type Env } from "./index";

const BASE_URL = "https://bingo-control.test";
const TEST_ENV = env as unknown as Env;
const VALID_NUMBERS = [1, 4, 7, 12, 18, 23, 29, 34, 39, 45, 52, 60, 66, 73, 88];

function makeRequest(path: string, init?: RequestInit & { cookie?: string }): Request {
	const headers = new Headers(init?.headers);
	if (init?.cookie) {
		headers.set("cookie", init.cookie);
	}
	if (init?.body && !headers.has("content-type")) {
		headers.set("content-type", "application/json");
	}
	return new Request(`${BASE_URL}${path}`, { ...init, headers });
}

function makeTicket(id: string, numbers: number[] = VALID_NUMBERS) {
	return { id, name: "Mesa test", numbers };
}

async function loginCookie(): Promise<string> {
	const response = await worker.fetch(
		makeRequest("/api/auth/login", {
			method: "POST",
			headers: { "cf-connecting-ip": "198.51.100.1" },
			body: JSON.stringify({ username: "admin", password: "test-password" }),
		}),
		TEST_ENV,
	);
	const setCookie = response.headers.get("set-cookie");
	if (!setCookie) {
		throw new Error("Login de prueba fallo, no se recibio cookie de sesion.");
	}
	return setCookie.split(";")[0];
}

describe("auth", () => {
	it("GET /api/auth/session sin cookie responde authenticated:false", async () => {
		const response = await worker.fetch(makeRequest("/api/auth/session"), TEST_ENV);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ authenticated: false });
	});

	it("login correcto entrega cookie y sesion valida", async () => {
		const cookie = await loginCookie();
		const response = await worker.fetch(makeRequest("/api/auth/session", { cookie }), TEST_ENV);
		expect(await response.json()).toEqual({ authenticated: true, username: "admin" });
	});

	it("login con contrasena incorrecta responde 401", async () => {
		const response = await worker.fetch(
			makeRequest("/api/auth/login", {
				method: "POST",
				headers: { "cf-connecting-ip": "198.51.100.2" },
				body: JSON.stringify({ username: "admin", password: "mala-clave" }),
			}),
			TEST_ENV,
		);
		expect(response.status).toBe(401);
	});

	it("login sin usuario o clave responde 400", async () => {
		const response = await worker.fetch(
			makeRequest("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin" }) }),
			TEST_ENV,
		);
		expect(response.status).toBe(400);
	});

	it("bloquea el login luego de 5 intentos fallidos desde la misma IP", async () => {
		const headers = { "cf-connecting-ip": "198.51.100.99" };
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const response = await worker.fetch(
				makeRequest("/api/auth/login", {
					method: "POST",
					headers,
					body: JSON.stringify({ username: "admin", password: "mala-clave" }),
				}),
				TEST_ENV,
			);
			expect(response.status).toBe(401);
		}

		const blockedResponse = await worker.fetch(
			makeRequest("/api/auth/login", {
				method: "POST",
				headers,
				body: JSON.stringify({ username: "admin", password: "test-password" }),
			}),
			TEST_ENV,
		);
		expect(blockedResponse.status).toBe(429);
	});

	it("cookie de sesion vencida responde authenticated:false", async () => {
		const expiredToken = await createSessionToken("admin", -1, "test-secret-key-for-vitest");
		const response = await worker.fetch(makeRequest("/api/auth/session", { cookie: `bingo_session=${expiredToken}` }), TEST_ENV);
		expect(await response.json()).toEqual({ authenticated: false });
	});

	it("logout limpia la cookie de sesion", async () => {
		const response = await worker.fetch(makeRequest("/api/auth/logout", { method: "POST", body: "{}" }), TEST_ENV);
		const setCookie = response.headers.get("set-cookie");
		expect(setCookie).toContain("Max-Age=0");
	});
});

describe("tickets sin sesion", () => {
	it("responde 401 en todos los endpoints de cartones", async () => {
		const responses = await Promise.all([
			worker.fetch(makeRequest("/api/tickets"), TEST_ENV),
			worker.fetch(makeRequest("/api/tickets", { method: "POST", body: "{}" }), TEST_ENV),
			worker.fetch(makeRequest("/api/tickets/A-1", { method: "PUT", body: "{}" }), TEST_ENV),
			worker.fetch(makeRequest("/api/tickets/A-1", { method: "DELETE", body: "{}" }), TEST_ENV),
			worker.fetch(makeRequest("/api/tickets", { method: "DELETE", body: "{}" }), TEST_ENV),
			worker.fetch(makeRequest("/api/tickets/import", { method: "POST", body: "{}" }), TEST_ENV),
		]);

		responses.forEach((response) => expect(response.status).toBe(401));
	});
});

describe("tickets CRUD", () => {
	it("crea un carton valido", async () => {
		const cookie = await loginCookie();
		const response = await worker.fetch(
			makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-CREATE-1")) }),
			TEST_ENV,
		);
		expect(response.status).toBe(200);

		const listResponse = await worker.fetch(makeRequest("/api/tickets", { cookie }), TEST_ENV);
		const { tickets } = (await listResponse.json()) as { tickets: Array<{ id: string }> };
		expect(tickets.some((ticket) => ticket.id === "TEST-CREATE-1")).toBe(true);
	});

	it("rechaza un ID duplicado con 409", async () => {
		const cookie = await loginCookie();
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-DUP-1")) }), TEST_ENV);
		const response = await worker.fetch(
			makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-DUP-1")) }),
			TEST_ENV,
		);
		expect(response.status).toBe(409);
	});

	it("rechaza un carton con numeros invalidos con 400", async () => {
		const cookie = await loginCookie();
		const response = await worker.fetch(
			makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify({ id: "TEST-INVALID-1", numbers: [1, 2, 3] }) }),
			TEST_ENV,
		);
		expect(response.status).toBe(400);
	});

	it("edita un carton existente", async () => {
		const cookie = await loginCookie();
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-EDIT-1")) }), TEST_ENV);

		const response = await worker.fetch(
			makeRequest("/api/tickets/TEST-EDIT-1", {
				method: "PUT",
				cookie,
				body: JSON.stringify(makeTicket("TEST-EDIT-1", [...VALID_NUMBERS].reverse())),
			}),
			TEST_ENV,
		);
		expect(response.status).toBe(200);
	});

	it("editar un ID inexistente responde 404", async () => {
		const cookie = await loginCookie();
		const response = await worker.fetch(
			makeRequest("/api/tickets/NO-EXISTE", { method: "PUT", cookie, body: JSON.stringify(makeTicket("NO-EXISTE")) }),
			TEST_ENV,
		);
		expect(response.status).toBe(404);
	});

	it("editar cambiando el ID a uno duplicado responde 409", async () => {
		const cookie = await loginCookie();
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-EDIT-A")) }), TEST_ENV);
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-EDIT-B")) }), TEST_ENV);

		const response = await worker.fetch(
			makeRequest("/api/tickets/TEST-EDIT-A", { method: "PUT", cookie, body: JSON.stringify(makeTicket("TEST-EDIT-B")) }),
			TEST_ENV,
		);
		expect(response.status).toBe(409);
	});

	it("borra un carton y registra auditoria", async () => {
		const cookie = await loginCookie();
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-DELETE-1")) }), TEST_ENV);

		const response = await worker.fetch(makeRequest("/api/tickets/TEST-DELETE-1", { method: "DELETE", cookie, body: "{}" }), TEST_ENV);
		expect(response.status).toBe(200);

		const auditRow = await TEST_ENV.DB.prepare("SELECT * FROM audit_logs WHERE action = 'ticket_deleted' AND ticket_id = ? ORDER BY id DESC LIMIT 1")
			.bind("TEST-DELETE-1")
			.first();
		expect(auditRow).toBeTruthy();
	});

	it("borrado total sin confirmacion exacta responde 400", async () => {
		const cookie = await loginCookie();
		const response = await worker.fetch(
			makeRequest("/api/tickets", { method: "DELETE", cookie, body: JSON.stringify({ confirm: "borrar todo" }) }),
			TEST_ENV,
		);
		expect(response.status).toBe(400);
	});

	it("borrado total con confirmacion correcta vacia la tabla y audita el conteo", async () => {
		const cookie = await loginCookie();
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-WIPE-1")) }), TEST_ENV);
		await worker.fetch(makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-WIPE-2")) }), TEST_ENV);

		const response = await worker.fetch(
			makeRequest("/api/tickets", { method: "DELETE", cookie, body: JSON.stringify({ confirm: "BORRAR TODO" }) }),
			TEST_ENV,
		);
		expect(response.status).toBe(200);

		const listResponse = await worker.fetch(makeRequest("/api/tickets", { cookie }), TEST_ENV);
		const { tickets } = (await listResponse.json()) as { tickets: unknown[] };
		expect(tickets).toHaveLength(0);

		const auditRow = await TEST_ENV.DB.prepare("SELECT details_json FROM audit_logs WHERE action = 'tickets_deleted_all' ORDER BY id DESC LIMIT 1").first<{
			details_json: string;
		}>();
		expect(auditRow).toBeTruthy();
		expect(JSON.parse(auditRow!.details_json).count).toBeGreaterThanOrEqual(2);
	});

	it("importa cartones sumandolos a los ya existentes", async () => {
		const cookie = await loginCookie();

		const createResponse = await worker.fetch(
			makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-IMPORT-PREVIOUS")) }),
			TEST_ENV,
		);
		expect(createResponse.status).toBe(200);

		const payload = { tickets: [makeTicket("TEST-IMPORT-1"), makeTicket("TEST-IMPORT-2", [...VALID_NUMBERS].reverse())] };
		const response = await worker.fetch(makeRequest("/api/tickets/import", { method: "POST", cookie, body: JSON.stringify(payload) }), TEST_ENV);
		expect(response.status).toBe(200);

		const listResponse = await worker.fetch(makeRequest("/api/tickets", { cookie }), TEST_ENV);
		const { tickets } = (await listResponse.json()) as { tickets: Array<{ id: string }> };
		expect(tickets.map((ticket) => ticket.id).sort()).toEqual(["TEST-IMPORT-1", "TEST-IMPORT-2", "TEST-IMPORT-PREVIOUS"]);

		const auditRow = await TEST_ENV.DB.prepare("SELECT details_json FROM audit_logs WHERE action = 'tickets_imported' ORDER BY id DESC LIMIT 1").first<{
			details_json: string;
		}>();
		expect(auditRow).toBeTruthy();
		expect(JSON.parse(auditRow!.details_json).count).toBe(2);
	});

	it("rechaza la importacion si algun ID ya existe, sin tocar la base", async () => {
		const cookie = await loginCookie();

		const createResponse = await worker.fetch(
			makeRequest("/api/tickets", { method: "POST", cookie, body: JSON.stringify(makeTicket("TEST-IMPORT-DUP")) }),
			TEST_ENV,
		);
		expect(createResponse.status).toBe(200);

		const payload = { tickets: [makeTicket("TEST-IMPORT-DUP"), makeTicket("TEST-IMPORT-NEW")] };
		const response = await worker.fetch(makeRequest("/api/tickets/import", { method: "POST", cookie, body: JSON.stringify(payload) }), TEST_ENV);
		expect(response.status).toBe(409);

		const listResponse = await worker.fetch(makeRequest("/api/tickets", { cookie }), TEST_ENV);
		const { tickets } = (await listResponse.json()) as { tickets: Array<{ id: string }> };
		expect(tickets.map((ticket) => ticket.id)).not.toContain("TEST-IMPORT-NEW");
	});

	it("rechaza un payload de importacion invalido con 400", async () => {
		const cookie = await loginCookie();
		const response = await worker.fetch(
			makeRequest("/api/tickets/import", { method: "POST", cookie, body: JSON.stringify({ tickets: [{ id: "X" }] }) }),
			TEST_ENV,
		);
		expect(response.status).toBe(400);
	});
});
