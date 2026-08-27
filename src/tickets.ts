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
	field?: "id" | "name" | "numbers";
};

export const TICKET_NAME_MAX_LENGTH = 60;

export type LoadedTicketsResult = {
	tickets: Ticket[];
	invalidTickets: InvalidTicket[];
};

type TicketPayload = {
	id?: unknown;
	name?: unknown;
	numbers?: unknown;
};

const POSITIVE_INTEGER_ID_PATTERN = /^0*([1-9]\d*)$/;

function normalizeTicketId(rawId: unknown): string | null {
	if (typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0) {
		return String(rawId);
	}

	if (typeof rawId === "string") {
		const trimmed = rawId.trim();
		const match = POSITIVE_INTEGER_ID_PATTERN.exec(trimmed);
		if (match) {
			return match[1];
		}
	}

	return null;
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

export function parseTicketsPayload(payload: unknown, existingIds?: ReadonlySet<string>): LoadedTicketsResult {
	const source = extractTicketList(payload);
	const tickets: Ticket[] = [];
	const invalidTickets: InvalidTicket[] = [];
	const usedIds = new Set<string>();

	source.forEach((entry, index) => {
		const raw = entry as TicketPayload;
		const ticketId = normalizeTicketId(raw?.id);
		const rawId = ticketId ?? undefined;
		let hasError = false;

		if (!ticketId) {
			invalidTickets.push({
				index,
				field: "id",
				reason: "El ID debe ser un numero entero positivo.",
			});
			hasError = true;
		} else if (usedIds.has(ticketId)) {
			invalidTickets.push({
				index,
				rawId,
				field: "id",
				reason: `ID duplicado (${ticketId}).`,
			});
			hasError = true;
		} else if (existingIds?.has(ticketId)) {
			invalidTickets.push({
				index,
				rawId,
				field: "id",
				reason: `El ID ${ticketId} ya fue ingresado.`,
			});
			hasError = true;
		}

		const trimmedName = typeof raw?.name === "string" ? raw.name.trim() : "";
		if (trimmedName.length > TICKET_NAME_MAX_LENGTH) {
			invalidTickets.push({
				index,
				rawId,
				field: "name",
				reason: `El nombre no puede superar los ${TICKET_NAME_MAX_LENGTH} caracteres.`,
			});
			hasError = true;
		}

		const normalizedNumbers = validateTicketNumbers(raw?.numbers);
		if (!normalizedNumbers) {
			invalidTickets.push({
				index,
				rawId,
				field: "numbers",
				reason: `Debe tener ${TICKET_NUMBERS_PER_CARD} numeros unicos entre ${BINGO_MIN} y ${BINGO_MAX}.`,
			});
			hasError = true;
		}

		if (!ticketId || !normalizedNumbers || hasError) {
			return;
		}

		usedIds.add(ticketId);
		tickets.push({
			id: ticketId,
			name: trimmedName.length > 0 ? trimmedName : undefined,
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

const COMPLETED_ALERT_DETAIL_LIMIT = 8;

// El aviso de la pestaña Cartones nombra el carton completo en vez de un generico "Nuevo".
// `label` va en el chip (poco espacio, se recorta por CSS) y `detail` en el title/aria-label.
// Se espera `completedIds` ya ordenado por ID (sortTicketsById), asi que el primero es el menor:
// determinístico sin guardar estado de "quien completo ultimo".
export function formatCompletedTicketsAlert(completedIds: string[]): { label: string; detail: string } {
	if (completedIds.length === 0) {
		return { label: "", detail: "" };
	}

	const [first] = completedIds;
	const others = completedIds.length - 1;

	if (others === 0) {
		return { label: `#${first}`, detail: `Carton ${first} completo` };
	}

	const shown = completedIds.slice(0, COMPLETED_ALERT_DETAIL_LIMIT).join(", ");
	const hidden = completedIds.length - COMPLETED_ALERT_DETAIL_LIMIT;
	const list = hidden > 0 ? `${shown} y ${hidden} mas` : shown;

	return { label: `#${first} +${others}`, detail: `Cartones completos: ${list}` };
}
