export type Env = {
	DB: D1Database;
	SESSION_SECRET: string;
	ADMIN_USERNAME: string;
	ADMIN_PASSWORD: string;
	SESSION_TTL_MINUTES?: string;
};

type Ticket = {
	id: string;
	name?: string;
	numbers: number[];
};

type SessionPayload = {
	u: string;
	exp: number;
};

const BINGO_MIN = 1;
const BINGO_MAX = 90;
const TICKET_NUMBERS_PER_CARD = 15;
const SESSION_COOKIE_NAME = "bingo_session";
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW_MINUTES = 15;

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
			"x-content-type-options": "nosniff",
		},
	});
}

function errorResponse(message: string, status: number): Response {
	return jsonResponse({ error: message }, status);
}

function base64UrlEncode(input: string): string {
	return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
	const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
	const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
	return atob(normalized + padding);
}

function parseCookies(header: string | null): Map<string, string> {
	const cookies = new Map<string, string>();
	if (!header) {
		return cookies;
	}

	header.split(";").forEach((chunk) => {
		const [rawKey, ...rawValue] = chunk.trim().split("=");
		if (!rawKey) {
			return;
		}
		cookies.set(rawKey, rawValue.join("="));
	});

	return cookies;
}

async function sign(input: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
	const bytes = new Uint8Array(signature);
	let binary = "";
	bytes.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return base64UrlEncode(binary);
}

export async function createSessionToken(username: string, ttlMinutes: number, secret: string): Promise<string> {
	const exp = Date.now() + ttlMinutes * 60_000;
	const payload: SessionPayload = { u: username, exp };
	const encodedPayload = base64UrlEncode(JSON.stringify(payload));
	const signature = await sign(encodedPayload, secret);
	return `${encodedPayload}.${signature}`;
}

async function validateSessionToken(token: string, secret: string): Promise<SessionPayload | null> {
	const [encodedPayload, signature] = token.split(".");
	if (!encodedPayload || !signature) {
		return null;
	}

	const expected = await sign(encodedPayload, secret);
	if (expected !== signature) {
		return null;
	}

	try {
		const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
		if (typeof payload.u !== "string" || typeof payload.exp !== "number") {
			return null;
		}

		if (Date.now() > payload.exp) {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
}

function toCookie(token: string, ttlMinutes: number): string {
	const maxAge = ttlMinutes * 60;
	return `${SESSION_COOKIE_NAME}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function clearCookie(): string {
	return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function normalizeTicketId(raw: unknown): string | null {
	if (typeof raw === "number" && Number.isFinite(raw)) {
		return String(raw);
	}

	if (typeof raw === "string") {
		const value = raw.trim();
		if (value.length > 0) {
			return value;
		}
	}

	return null;
}

function normalizeTicketName(raw: unknown): string | undefined {
	if (typeof raw !== "string") {
		return undefined;
	}

	const value = raw.trim();
	return value.length > 0 ? value : undefined;
}

function validateNumbers(raw: unknown): number[] | null {
	if (!Array.isArray(raw) || raw.length !== TICKET_NUMBERS_PER_CARD) {
		return null;
	}

	const values = raw.map((value) => Number(value));
	if (!values.every((value) => Number.isInteger(value))) {
		return null;
	}

	if (!values.every((value) => value >= BINGO_MIN && value <= BINGO_MAX)) {
		return null;
	}

	const unique = new Set(values);
	if (unique.size !== TICKET_NUMBERS_PER_CARD) {
		return null;
	}

	return Array.from(unique).sort((a, b) => a - b);
}

function normalizeTicket(raw: unknown): Ticket | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}

	const entry = raw as { id?: unknown; name?: unknown; numbers?: unknown };
	const id = normalizeTicketId(entry.id);
	const numbers = validateNumbers(entry.numbers);

	if (!id || !numbers) {
		return null;
	}

	return {
		id,
		name: normalizeTicketName(entry.name),
		numbers,
	};
}

function parseImportPayload(raw: unknown): Ticket[] | null {
	if (!raw || typeof raw !== "object") {
		return null;
	}

	const payload = raw as { tickets?: unknown };
	if (!Array.isArray(payload.tickets)) {
		return null;
	}

	const normalized: Ticket[] = [];
	const usedIds = new Set<string>();

	for (const entry of payload.tickets) {
		const parsed = normalizeTicket(entry);
		if (!parsed || usedIds.has(parsed.id)) {
			return null;
		}

		normalized.push(parsed);
		usedIds.add(parsed.id);
	}

	return normalized;
}

async function requireSession(request: Request, env: Env): Promise<SessionPayload | null> {
	const cookies = parseCookies(request.headers.get("cookie"));
	const token = cookies.get(SESSION_COOKIE_NAME);
	if (!token) {
		return null;
	}

	return validateSessionToken(token, env.SESSION_SECRET);
}

async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return (await request.json()) as unknown;
	} catch {
		return null;
	}
}

async function getTickets(env: Env): Promise<Ticket[]> {
	const result = await env.DB.prepare("SELECT id, name, numbers_json FROM tickets ORDER BY id COLLATE NOCASE ASC").all<{
		id: string;
		name: string | null;
		numbers_json: string;
	}>();

	const rows = result.results ?? [];
	return rows.map((row) => ({
		id: row.id,
		name: row.name ?? undefined,
		numbers: JSON.parse(row.numbers_json) as number[],
	}));
}

function ticketUpsertStatement(env: Env, ticket: Ticket): D1PreparedStatement {
	return env.DB.prepare("INSERT OR REPLACE INTO tickets (id, name, numbers_json, created_at, updated_at) VALUES (?, ?, ?, COALESCE((SELECT created_at FROM tickets WHERE id = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)").bind(ticket.id, ticket.name ?? null, JSON.stringify(ticket.numbers), ticket.id);
}

function auditStatement(env: Env, action: string, actor: string, ticketId?: string, details: Record<string, unknown> = {}): D1PreparedStatement {
	return env.DB.prepare("INSERT INTO audit_logs (action, actor, ticket_id, details_json) VALUES (?, ?, ?, ?)").bind(action, actor, ticketId ?? null, JSON.stringify(details));
}

function getClientIp(request: Request): string {
	return request.headers.get("cf-connecting-ip") ?? "unknown";
}

async function countRecentFailedLogins(env: Env, ip: string): Promise<number> {
	const row = await env.DB.prepare(
		`SELECT COUNT(*) as count FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)`,
	)
		.bind(ip, `-${LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes`)
		.first<{ count: number }>();

	return row?.count ?? 0;
}

async function recordLoginAttempt(env: Env, username: string, ip: string, success: boolean): Promise<void> {
	await env.DB.prepare("INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)").bind(username, ip, success ? 1 : 0).run();
}

async function upsertTicket(env: Env, previousId: string | null, ticket: Ticket, audit: D1PreparedStatement): Promise<void> {
	if (previousId && previousId !== ticket.id) {
		await env.DB.batch([env.DB.prepare("UPDATE tickets SET id = ?, name = ?, numbers_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(ticket.id, ticket.name ?? null, JSON.stringify(ticket.numbers), previousId), audit]);
		return;
	}
	await env.DB.batch([ticketUpsertStatement(env, ticket), audit]);
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const ttl = Number(env.SESSION_TTL_MINUTES ?? "30");

	if (request.method === "GET" && url.pathname === "/api/auth/session") {
		const session = await requireSession(request, env);
		if (!session) {
			return jsonResponse({ authenticated: false });
		}
		return jsonResponse({ authenticated: true, username: session.u });
	}

	if (request.method === "POST" && url.pathname === "/api/auth/login") {
		const payload = (await readJsonBody(request)) as { username?: unknown; password?: unknown } | null;
		const username = typeof payload?.username === "string" ? payload.username.trim() : "";
		const password = typeof payload?.password === "string" ? payload.password : "";

		if (!username || !password) {
			return errorResponse("Credenciales incompletas.", 400);
		}

		const ip = getClientIp(request);
		const recentFailedAttempts = await countRecentFailedLogins(env, ip);
		if (recentFailedAttempts >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
			return errorResponse("Demasiados intentos. Espera unos minutos e intenta nuevamente.", 429);
		}

		const isValidLogin = username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD;
		await recordLoginAttempt(env, username, ip, isValidLogin);

		if (!isValidLogin) {
			return errorResponse("Credenciales invalidas.", 401);
		}

		const token = await createSessionToken(username, ttl, env.SESSION_SECRET);
		const response = jsonResponse({ authenticated: true, username });
		response.headers.append("set-cookie", toCookie(token, ttl));
		return response;
	}

	if (request.method === "POST" && url.pathname === "/api/auth/logout") {
		const response = jsonResponse({ ok: true });
		response.headers.append("set-cookie", clearCookie());
		return response;
	}

	return errorResponse("Ruta de autenticacion no encontrada.", 404);
}

async function handleTickets(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const session = await requireSession(request, env);

	if (!session) {
		return errorResponse("No autenticado.", 401);
	}

	if (request.method === "GET" && url.pathname === "/api/tickets") {
		const tickets = await getTickets(env);
		return jsonResponse({ tickets });
	}

	if (request.method === "POST" && url.pathname === "/api/tickets") {
		const ticket = normalizeTicket(await readJsonBody(request));
		if (!ticket) {
			return errorResponse("Carton invalido. Debe incluir ID unico y 15 numeros entre 1 y 90.", 400);
		}

		const existing = await env.DB.prepare("SELECT id FROM tickets WHERE id = ?").bind(ticket.id).first<{ id: string }>();
		if (existing) {
			return errorResponse(`ID duplicado (${ticket.id}).`, 409);
		}

		await upsertTicket(env, null, ticket, auditStatement(env, "ticket_created", session.u, ticket.id));
		return jsonResponse({ ok: true });
	}

	if (request.method === "PUT" && url.pathname.startsWith("/api/tickets/")) {
		const currentId = decodeURIComponent(url.pathname.replace("/api/tickets/", "")).trim();
		if (!currentId) {
			return errorResponse("ID de carton invalido.", 400);
		}

		const ticket = normalizeTicket(await readJsonBody(request));
		if (!ticket) {
			return errorResponse("Carton invalido. Debe incluir ID unico y 15 numeros entre 1 y 90.", 400);
		}

		const current = await env.DB.prepare("SELECT id FROM tickets WHERE id = ?").bind(currentId).first<{ id: string }>();
		if (!current) {
			return errorResponse("Carton no encontrado.", 404);
		}

		if (ticket.id !== currentId) {
			const duplicate = await env.DB.prepare("SELECT id FROM tickets WHERE id = ?").bind(ticket.id).first<{ id: string }>();
			if (duplicate) {
				return errorResponse(`ID duplicado (${ticket.id}).`, 409);
			}
		}

		await upsertTicket(env, currentId, ticket, auditStatement(env, "ticket_updated", session.u, ticket.id, { previousId: currentId }));
		return jsonResponse({ ok: true });
	}

	if (request.method === "DELETE" && url.pathname.startsWith("/api/tickets/")) {
		const targetId = decodeURIComponent(url.pathname.replace("/api/tickets/", "")).trim();
		if (!targetId) {
			return errorResponse("ID de carton invalido.", 400);
		}

		await env.DB.batch([env.DB.prepare("DELETE FROM tickets WHERE id = ?").bind(targetId), auditStatement(env, "ticket_deleted", session.u, targetId)]);

		return jsonResponse({ ok: true });
	}

	if (request.method === "DELETE" && url.pathname === "/api/tickets") {
		const payload = (await readJsonBody(request)) as { confirm?: unknown } | null;
		const confirm = typeof payload?.confirm === "string" ? payload.confirm : "";
		if (confirm !== "BORRAR TODO") {
			return errorResponse("Confirmacion invalida para borrado total.", 400);
		}

		const countRow = await env.DB.prepare("SELECT COUNT(*) as count FROM tickets").first<{ count: number }>();
		const count = countRow?.count ?? 0;

		await env.DB.batch([env.DB.prepare("DELETE FROM tickets"), auditStatement(env, "tickets_deleted_all", session.u, undefined, { count })]);
		return jsonResponse({ ok: true });
	}

	if (request.method === "POST" && url.pathname === "/api/tickets/import") {
		const payload = parseImportPayload(await readJsonBody(request));
		if (!payload) {
			return errorResponse("Carga masiva invalida. Revisa formato JSON/CSV normalizado.", 400);
		}

		const existingIds = new Set((await getTickets(env)).map((ticket) => ticket.id));
		const duplicates = payload.filter((ticket) => existingIds.has(ticket.id)).map((ticket) => ticket.id);
		if (duplicates.length > 0) {
			return errorResponse(`ID duplicado (${duplicates.join(", ")}).`, 409);
		}

		await env.DB.batch([...payload.map((ticket) => ticketUpsertStatement(env, ticket)), auditStatement(env, "tickets_imported", session.u, undefined, { count: payload.length })]);

		return jsonResponse({ ok: true });
	}

	return errorResponse("Ruta de cartones no encontrada.", 404);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith("/api/auth/")) {
			return handleAuth(request, env);
		}

		if (url.pathname.startsWith("/api/tickets")) {
			return handleTickets(request, env);
		}

		return errorResponse("Ruta API no encontrada.", 404);
	},
};
