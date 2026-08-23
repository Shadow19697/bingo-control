import { BINGO_MAX, BINGO_MIN, TICKET_NUMBERS_PER_CARD } from "./config";

export type Ticket = {
	id: string;
	name?: string;
	numbers: number[];
};

export type InvalidTicket = {
	index: number;
	reason: string;
	rawId?: string;
};

export type LoadedTicketsResult = {
	tickets: Ticket[];
	invalidTickets: InvalidTicket[];
};

type TicketPayload = {
	id?: unknown;
	name?: unknown;
	numbers?: unknown;
};

function normalizeTicketId(rawId: unknown, index: number): string | null {
	if (typeof rawId === "number" && Number.isFinite(rawId)) {
		return String(rawId);
	}

	if (typeof rawId === "string") {
		const trimmed = rawId.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}

	return `INVALID-${index + 1}`;
}

function validateTicketNumbers(rawNumbers: unknown): number[] | null {
	if (!Array.isArray(rawNumbers) || rawNumbers.length !== TICKET_NUMBERS_PER_CARD) {
		return null;
	}

	const parsed = rawNumbers.map((value) => Number(value));

	if (!parsed.every((value) => Number.isInteger(value))) {
		return null;
	}

	if (!parsed.every((value) => value >= BINGO_MIN && value <= BINGO_MAX)) {
		return null;
	}

	const unique = new Set(parsed);
	if (unique.size !== TICKET_NUMBERS_PER_CARD) {
		return null;
	}

	return Array.from(unique).sort((a, b) => a - b);
}

function normalizeTicketName(rawName: unknown): string | undefined {
	if (typeof rawName !== "string") {
		return undefined;
	}

	const normalized = rawName.trim();
	return normalized.length > 0 ? normalized : undefined;
}

function extractTicketList(payload: unknown): unknown[] {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (payload && typeof payload === "object" && "tickets" in payload) {
		const tickets = (payload as { tickets?: unknown }).tickets;
		return Array.isArray(tickets) ? tickets : [];
	}

	return [];
}

export function parseTicketsPayload(payload: unknown): LoadedTicketsResult {
	const source = extractTicketList(payload);
	const tickets: Ticket[] = [];
	const invalidTickets: InvalidTicket[] = [];
	const usedIds = new Set<string>();

	source.forEach((entry, index) => {
		const raw = entry as TicketPayload;
		const ticketId = normalizeTicketId(raw?.id, index);
		const rawId = ticketId ?? undefined;
		const normalizedNumbers = validateTicketNumbers(raw?.numbers);

		if (!ticketId) {
			invalidTickets.push({
				index,
				reason: "ID faltante o invalido.",
			});
			return;
		}

		if (usedIds.has(ticketId)) {
			invalidTickets.push({
				index,
				rawId,
				reason: `ID duplicado (${ticketId}).`,
			});
			return;
		}

		if (!normalizedNumbers) {
			invalidTickets.push({
				index,
				rawId,
				reason: `Debe tener ${TICKET_NUMBERS_PER_CARD} numeros unicos entre ${BINGO_MIN} y ${BINGO_MAX}.`,
			});
			return;
		}

		usedIds.add(ticketId);
		tickets.push({
			id: ticketId,
			name: normalizeTicketName(raw?.name),
			numbers: normalizedNumbers,
		});
	});

	return {
		tickets,
		invalidTickets,
	};
}

export function countTicketHits(ticket: Ticket, calledNumbers: Set<number>): number {
	return ticket.numbers.reduce((acc, value) => acc + (calledNumbers.has(value) ? 1 : 0), 0);
}

export function sortTicketsById(source: Ticket[]): Ticket[] {
	return [...source].sort((a, b) =>
		a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" })
	);
}
