import "./style.css";
import { clearCalledNumbers, getTotalBingoNumbers, toggleCalledNumber } from "./bingo";
import { BINGO_MAX, BINGO_MIN, isValidBingoNumber } from "./config";
import { countTicketHits, parseTicketsPayload, sortTicketsByNameThenId, type Ticket } from "./tickets";
import { querySelectorOrThrow } from "./ui/dom";
import { renderNumbersGrid, resetGridSelection, setNumberButtonState } from "./ui/grid";
import { renderStatus, type StatusElements } from "./ui/status";
import { getAppTemplate } from "./ui/template";
import { renderTicketsTable, resetTicketMatrixState, setTicketNumberState, updateTicketRowState, type TicketTableView } from "./ui/tickets";

const app = querySelectorOrThrow<HTMLDivElement>("#app");
const calledNumbers = new Set<number>();
const totalNumbers = getTotalBingoNumbers(BINGO_MIN, BINGO_MAX);

let tickets: Ticket[] = [];
let ticketTableView: TicketTableView = { rows: [], numberCellIndex: new Map<number, HTMLTableCellElement[]>() };
let ticketHits: number[] = [];
let ticketIndexByNumber = new Map<number, number[]>();

app.innerHTML = getAppTemplate(totalNumbers);

const tabControl = querySelectorOrThrow<HTMLButtonElement>("#tab-control", app);
const tabTickets = querySelectorOrThrow<HTMLButtonElement>("#tab-tickets", app);
const panelControl = querySelectorOrThrow<HTMLElement>("#panel-control", app);
const panelTickets = querySelectorOrThrow<HTMLElement>("#panel-tickets", app);

const grid = querySelectorOrThrow<HTMLDivElement>("#numbers-grid", app);
const clearBtn = querySelectorOrThrow<HTMLButtonElement>("#clear-btn", app);
const manualBtn = querySelectorOrThrow<HTMLButtonElement>("#manual-btn", app);
const manualInput = querySelectorOrThrow<HTMLInputElement>("#manual-number", app);

const statusElements: StatusElements = {
	countLabel: querySelectorOrThrow<HTMLElement>("#count", app),
	pendingLabel: querySelectorOrThrow<HTMLElement>("#pending", app),
	calledList: querySelectorOrThrow<HTMLElement>("#called-list", app),
};

const completedCountLabel = querySelectorOrThrow<HTMLElement>("#completed-count", app);

const ticketsTotal = querySelectorOrThrow<HTMLElement>("#tickets-total", app);
const ticketsInvalid = querySelectorOrThrow<HTMLElement>("#tickets-invalid", app);
const ticketsInvalidList = querySelectorOrThrow<HTMLElement>("#tickets-invalid-list", app);
const ticketsBody = querySelectorOrThrow<HTMLTableSectionElement>("#tickets-body", app);

const updateTabs = (showTickets: boolean): void => {
	tabControl.classList.toggle("is-active", !showTickets);
	tabControl.setAttribute("aria-selected", String(!showTickets));
	tabTickets.classList.toggle("is-active", showTickets);
	tabTickets.setAttribute("aria-selected", String(showTickets));

	panelControl.hidden = showTickets;
	panelTickets.hidden = !showTickets;
};

const refreshStatus = (): void => {
	renderStatus(statusElements, calledNumbers, totalNumbers);
};

const updateCompletedCount = (): void => {
	const completedCount = ticketHits.filter((hits) => hits === 15).length;
	completedCountLabel.textContent = String(completedCount);
};

const recalculateTicketHits = (): void => {
	ticketHits = tickets.map((ticket) => countTicketHits(ticket, calledNumbers));

	ticketHits.forEach((hits, index) => {
		updateTicketRowState(ticketTableView, index, hits, hits === 15);
	});

	updateCompletedCount();
};

const clearRound = (): void => {
	clearCalledNumbers(calledNumbers);
	resetGridSelection(grid);
	resetTicketMatrixState(ticketTableView);
	recalculateTicketHits();
	refreshStatus();
};

const rebuildTicketIndexes = (): void => {
	ticketIndexByNumber = new Map<number, number[]>();

	tickets.forEach((ticket, index) => {
		ticket.numbers.forEach((value) => {
			const indexes = ticketIndexByNumber.get(value) ?? [];
			indexes.push(index);
			ticketIndexByNumber.set(value, indexes);
		});
	});
};

const updateTicketHitsByToggle = (value: number, isNowMarked: boolean): void => {
	const impactedIndexes = ticketIndexByNumber.get(value) ?? [];

	impactedIndexes.forEach((ticketIndex) => {
		const nextHits = ticketHits[ticketIndex] + (isNowMarked ? 1 : -1);
		const boundedHits = Math.min(15, Math.max(0, nextHits));
		ticketHits[ticketIndex] = boundedHits;
		updateTicketRowState(ticketTableView, ticketIndex, boundedHits, boundedHits === 15);
	});

	updateCompletedCount();
};

const applyNumberToggle = (value: number, isNowMarked: boolean): void => {
	if (isNowMarked) {
		calledNumbers.add(value);
	} else {
		calledNumbers.delete(value);
	}

	setTicketNumberState(ticketTableView, value, isNowMarked);
	updateTicketHitsByToggle(value, isNowMarked);
	refreshStatus();
};

const renderTicketLoadStatus = (invalidRows: string[]): void => {
	ticketsTotal.textContent = String(tickets.length);
	ticketsInvalid.textContent = String(invalidRows.length);

	if (invalidRows.length === 0) {
		ticketsInvalidList.textContent = "No hay errores de carga.";
		return;
	}

	ticketsInvalidList.textContent = `Invalidos: ${invalidRows.join(" | ")}`;
};

const loadTickets = async (): Promise<void> => {
	try {
		const response = await fetch("/tickets.json", { cache: "no-store" });

		if (!response.ok) {
			renderTicketLoadStatus([`No se pudo cargar tickets.json (HTTP ${response.status}).`]);
			return;
		}

		const payload = (await response.json()) as unknown;
		const parsed = parseTicketsPayload(payload);
		tickets = sortTicketsByNameThenId(parsed.tickets);

		rebuildTicketIndexes();
		ticketTableView = renderTicketsTable(ticketsBody, tickets);
		ticketHits = tickets.map((ticket) => countTicketHits(ticket, calledNumbers));
		recalculateTicketHits();

		const invalidRows = parsed.invalidTickets.map((entry) => {
			const idPart = entry.rawId ? `ID ${entry.rawId}` : `fila ${entry.index + 1}`;
			return `${idPart}: ${entry.reason}`;
		});

		renderTicketLoadStatus(invalidRows);
	} catch {
		renderTicketLoadStatus(["No se pudo leer tickets.json. Revisa el formato JSON."]);
	}
};

renderNumbersGrid(grid, (value, isNowMarked) => {
	applyNumberToggle(value, isNowMarked);
});

clearBtn.addEventListener("click", () => {
	clearRound();
	manualInput.focus();
});

manualBtn.addEventListener("click", () => {
	const parsed = Number(manualInput.value);

	if (!isValidBingoNumber(parsed)) {
		manualInput.focus();
		return;
	}

	const isNowMarked = toggleCalledNumber(calledNumbers, parsed, BINGO_MIN, BINGO_MAX);
	setNumberButtonState(grid, parsed, isNowMarked);
	setTicketNumberState(ticketTableView, parsed, isNowMarked);
	updateTicketHitsByToggle(parsed, isNowMarked);
	refreshStatus();
	manualInput.value = "";
	manualInput.focus();
});

manualInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		manualBtn.click();
	}
});

tabControl.addEventListener("click", () => {
	updateTabs(false);
});

tabTickets.addEventListener("click", () => {
	updateTabs(true);
});

void loadTickets();
refreshStatus();
