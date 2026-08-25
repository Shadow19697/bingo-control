import { parseTicketsPayload, type Ticket } from "./tickets";

export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

type SessionPayload = {
	authenticated: boolean;
	username?: string;
};

type TicketPayload = {
	tickets?: unknown;
};

type AuthPayload = {
	username: string;
	password: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		credentials: "include",
		headers: {
			"content-type": "application/json",
			...(init?.headers ?? {}),
		},
		...init,
	});

	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok) {
		const message =
			payload && typeof payload === "object" && "error" in payload && typeof (payload as { error?: unknown }).error === "string"
				? (payload as { error: string }).error
				: `Error HTTP ${response.status}`;
		throw new ApiError(message, response.status);
	}

	return payload as T;
}

export async function getSession(): Promise<SessionPayload> {
	return requestJson<SessionPayload>("/api/auth/session", {
		method: "GET",
		headers: {},
	});
}

export async function login(payload: AuthPayload): Promise<SessionPayload> {
	return requestJson<SessionPayload>("/api/auth/login", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function logout(): Promise<void> {
	await requestJson<{ ok: true }>("/api/auth/logout", {
		method: "POST",
		body: JSON.stringify({}),
	});
}

export async function fetchTicketsFromApi(): Promise<Ticket[]> {
	const payload = await requestJson<TicketPayload>("/api/tickets", {
		method: "GET",
		headers: {},
	});
	const parsed = parseTicketsPayload(payload);
	return parsed.tickets;
}

export async function createTicket(ticket: Ticket): Promise<void> {
	await requestJson<{ ok: true }>("/api/tickets", {
		method: "POST",
		body: JSON.stringify(ticket),
	});
}

export async function updateTicket(ticketId: string, ticket: Ticket): Promise<void> {
	await requestJson<{ ok: true }>(`/api/tickets/${encodeURIComponent(ticketId)}`, {
		method: "PUT",
		body: JSON.stringify(ticket),
	});
}

export async function deleteTicket(ticketId: string): Promise<void> {
	await requestJson<{ ok: true }>(`/api/tickets/${encodeURIComponent(ticketId)}`, {
		method: "DELETE",
		body: JSON.stringify({}),
	});
}

export async function deleteAllTickets(confirmText: string): Promise<void> {
	await requestJson<{ ok: true }>("/api/tickets", {
		method: "DELETE",
		body: JSON.stringify({ confirm: confirmText }),
	});
}

export async function importTickets(tickets: Ticket[]): Promise<void> {
	await requestJson<{ ok: true }>("/api/tickets/import", {
		method: "POST",
		body: JSON.stringify({ tickets }),
	});
}
