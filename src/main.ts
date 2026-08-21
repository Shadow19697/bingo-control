import "./style.css";
import { clearCalledNumbers, getTotalBingoNumbers, toggleCalledNumber } from "./bingo";
import { BINGO_MAX, BINGO_MIN, isValidBingoNumber } from "./config";
import { countTicketHits, parseTicketsPayload, sortTicketsById, type Ticket } from "./tickets";
import { querySelectorOrThrow } from "./ui/dom";
import { renderNumbersGrid, resetGridSelection, setNumberButtonState } from "./ui/grid";
import { renderStatus, type StatusElements } from "./ui/status";
import { getAppTemplate } from "./ui/template";
import {
	renderTicketsTable,
	reorderTicketRows,
	resetTicketMatrixState,
	setTicketNumberState,
	updateTicketRowState,
	type TicketTableView,
} from "./ui/tickets";

	type SortMode = "hits" | "fixed";

const app = querySelectorOrThrow<HTMLDivElement>("#app");
const calledNumbers = new Set<number>();
const totalNumbers = getTotalBingoNumbers(BINGO_MIN, BINGO_MAX);

let tickets: Ticket[] = [];
let ticketTableView: TicketTableView = {
	rows: [],
	numberCellIndex: new Map<number, HTMLTableCellElement[]>(),
	tbody: document.createElement("tbody"),
};
let ticketHits: number[] = [];
let ticketIndexByNumber = new Map<number, number[]>();
let sortMode: SortMode = "hits";

app.innerHTML = getAppTemplate(totalNumbers);

const tabControl = querySelectorOrThrow<HTMLButtonElement>("#tab-control", app);
const tabTickets = querySelectorOrThrow<HTMLButtonElement>("#tab-tickets", app);
const tabTicketsAlert = querySelectorOrThrow<HTMLElement>("#tab-tickets-alert", app);
const tabTicketsAlertLabel = querySelectorOrThrow<HTMLElement>("#tab-tickets-alert-label", app);
const panelControl = querySelectorOrThrow<HTMLElement>("#panel-control", app);
const panelTickets = querySelectorOrThrow<HTMLElement>("#panel-tickets", app);

const grid = querySelectorOrThrow<HTMLDivElement>("#numbers-grid", app);
const clearBtn = querySelectorOrThrow<HTMLButtonElement>("#clear-btn", app);
const manualBtn = querySelectorOrThrow<HTMLButtonElement>("#manual-btn", app);
const manualInput = querySelectorOrThrow<HTMLInputElement>("#manual-number", app);
const helpTip = querySelectorOrThrow<HTMLElement>("#help-tip", app);

const statusElements: StatusElements = {
	countLabel: querySelectorOrThrow<HTMLElement>("#count", app),
	pendingLabel: querySelectorOrThrow<HTMLElement>("#pending", app),
	calledList: querySelectorOrThrow<HTMLElement>("#called-list", app),
};

const completedCountLabel = querySelectorOrThrow<HTMLElement>("#completed-count", app);

const ticketsTotal = querySelectorOrThrow<HTMLElement>("#tickets-total", app);
const ticketsStateChip = querySelectorOrThrow<HTMLElement>("#tickets-state-chip", app);
const ticketsStateIcon = querySelectorOrThrow<HTMLElement>("#tickets-state-icon", app);
const ticketsStateText = querySelectorOrThrow<HTMLElement>("#tickets-state-text", app);
const ticketsInvalidList = querySelectorOrThrow<HTMLElement>("#tickets-invalid-list", app);
const ticketsBody = querySelectorOrThrow<HTMLTableSectionElement>("#tickets-body", app);
const sortHitsBtn = querySelectorOrThrow<HTMLButtonElement>("#sort-hits-btn", app);
const sortFixedBtn = querySelectorOrThrow<HTMLButtonElement>("#sort-fixed-btn", app);

const HELP_TEXT = {
	control:
		"Toca un numero para marcarlo o desmarcarlo. Tambien puedes cargarlo manualmente y limpiar la partida cuando quieras.",
	tickets:
		"Explora cartones con orden por aciertos o ID fijo. El encabezado y la columna ID quedan fijos mientras recorres la tabla.",
};

const updateHelpTip = (showTickets: boolean): void => {
	helpTip.textContent = showTickets ? HELP_TEXT.tickets : HELP_TEXT.control;
};

const updateSortButtons = (): void => {
	sortHitsBtn.classList.toggle("is-active", sortMode === "hits");
	sortFixedBtn.classList.toggle("is-active", sortMode === "fixed");
	sortHitsBtn.setAttribute("aria-pressed", String(sortMode === "hits"));
	sortFixedBtn.setAttribute("aria-pressed", String(sortMode === "fixed"));
};

const updateTabs = (showTickets: boolean): void => {
	tabControl.classList.toggle("is-active", !showTickets);
	tabControl.setAttribute("aria-selected", String(!showTickets));
	tabTickets.classList.toggle("is-active", showTickets);
	tabTickets.setAttribute("aria-selected", String(showTickets));

	panelControl.hidden = showTickets;
	panelTickets.hidden = !showTickets;
	app.classList.toggle("is-tickets-view", showTickets);
	updateHelpTip(showTickets);
};

const refreshStatus = (): void => {
	renderStatus(statusElements, calledNumbers, totalNumbers);
};

const getRankedTicketIndexes = (): number[] => {
	const ranked = ticketHits.map((hits, index) => ({ hits, index }));

	ranked.sort((a, b) => {
		if (sortMode === "hits" && b.hits !== a.hits) {
			return b.hits - a.hits;
		}

		return tickets[a.index].id.localeCompare(tickets[b.index].id, undefined, {
			numeric: true,
			sensitivity: "base",
		});
	});

	return ranked.map((item) => item.index);
};

const updateTicketsTabAlert = (hasCompletedTickets: boolean): void => {
	tabTickets.classList.toggle("has-alert", hasCompletedTickets);
	tabTicketsAlert.hidden = !hasCompletedTickets;
	tabTicketsAlertLabel.hidden = !hasCompletedTickets;
};

const updateCompletedCount = (): void => {
	const completedCount = ticketHits.filter((hits) => hits === 15).length;
	completedCountLabel.textContent = String(completedCount);
	updateTicketsTabAlert(completedCount > 0);
};

const recalculateTicketHits = (): void => {
	ticketHits = tickets.map((ticket) => countTicketHits(ticket, calledNumbers));

	ticketHits.forEach((hits, index) => {
		updateTicketRowState(ticketTableView, index, hits, hits === 15);
	});

	reorderTicketRows(ticketTableView, getRankedTicketIndexes());

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

	reorderTicketRows(ticketTableView, getRankedTicketIndexes());

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
	const invalidCount = invalidRows.length;
	const summaryDetail = invalidRows.join(" | ");

	ticketsTotal.textContent = String(tickets.length);
	ticketsStateChip.classList.toggle("is-ok", invalidCount === 0);
	ticketsStateChip.classList.toggle("is-error", invalidCount > 0);
	ticketsStateChip.setAttribute("aria-label", invalidCount === 0 ? "Sin errores de carga" : `Errores de carga detectados: ${invalidCount}`);
	ticketsStateChip.setAttribute("title", invalidCount === 0 ? "Sin errores de carga" : summaryDetail);

	if (invalidCount === 0) {
		ticketsStateIcon.textContent = "✓";
		ticketsStateText.textContent = "Sin errores";
		ticketsInvalidList.textContent = "Sin errores de carga.";
		return;
	}

	ticketsStateIcon.textContent = "!";
	ticketsStateText.textContent = `${invalidCount} error${invalidCount > 1 ? "es" : ""}`;
	ticketsInvalidList.textContent = `Invalidos: ${summaryDetail}`;
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
		tickets = sortTicketsById(parsed.tickets);

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

sortHitsBtn.addEventListener("click", () => {
	sortMode = "hits";
	updateSortButtons();
	reorderTicketRows(ticketTableView, getRankedTicketIndexes());
});

sortFixedBtn.addEventListener("click", () => {
	sortMode = "fixed";
	updateSortButtons();
	reorderTicketRows(ticketTableView, getRankedTicketIndexes());
});

void loadTickets();
updateSortButtons();
refreshStatus();
updateHelpTip(false);
