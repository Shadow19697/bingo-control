import { TICKET_NUMBERS_PER_CARD } from "../config";
import type { Ticket } from "../tickets";

type TicketRowRefs = {
	row: HTMLTableRowElement;
	hitCountLabel: HTMLSpanElement;
	numberCells: HTMLTableCellElement[];
};

export type TicketTableView = {
	rows: TicketRowRefs[];
	numberCellIndex: Map<number, HTMLTableCellElement[]>;
	tbody: HTMLTableSectionElement;
};

let isGlobalTooltipDismissBound = false;
let tooltipPortal: HTMLDivElement | null = null;
let portalOwner: HTMLDetailsElement | null = null;

function ensureTooltipPortal(): HTMLDivElement {
	if (tooltipPortal) {
		return tooltipPortal;
	}

	const portal = document.createElement("div");
	portal.className = "ticket-tooltip-portal";
	portal.hidden = true;
	document.body.appendChild(portal);
	tooltipPortal = portal;

	return portal;
}

function hideTooltipPortal(owner?: HTMLDetailsElement): void {
	if (!tooltipPortal) {
		portalOwner = null;
		return;
	}

	if (owner && portalOwner !== owner) {
		return;
	}

	tooltipPortal.hidden = true;
	tooltipPortal.textContent = "";
	portalOwner?.classList.remove("is-portal-open");
	portalOwner = null;
}

function positionTooltipPortal(details: HTMLDetailsElement, portal: HTMLDivElement): void {
	portal.hidden = false;
	portal.style.left = "0px";
	portal.style.top = "0px";

	const triggerRect = details.getBoundingClientRect();
	const portalRect = portal.getBoundingClientRect();
	const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const gap = 12;

	let top = triggerRect.bottom + gap;
	if (top + portalRect.height > viewportHeight - gap) {
		top = triggerRect.top - portalRect.height - gap;
	}

	top = Math.max(gap, Math.min(top, viewportHeight - portalRect.height - gap));

	let left = triggerRect.left + 6;
	left = Math.max(gap, Math.min(left, viewportWidth - portalRect.width - gap));

	portal.style.left = `${left}px`;
	portal.style.top = `${top}px`;
}

function showTooltipPortal(details: HTMLDetailsElement, content: string): void {
	const portal = ensureTooltipPortal();
	portal.textContent = content;
	portalOwner = details;
	details.classList.add("is-portal-open");
	positionTooltipPortal(details, portal);
}

function closeOpenTicketTooltips(except?: HTMLDetailsElement): void {
	const openedTooltips = document.querySelectorAll<HTMLDetailsElement>(".ticket-name-details[open]");

	openedTooltips.forEach((entry) => {
		if (entry === except) {
			return;
		}

		entry.open = false;
		entry.classList.remove("is-tooltip-up");
		entry.classList.remove("is-portal-open");
		entry.closest<HTMLTableCellElement>(".ticket-id-cell")?.classList.remove("tooltip-open");
	});

	if (!except || except !== portalOwner) {
		hideTooltipPortal();
	}
}

function bindGlobalTooltipDismiss(): void {
	if (isGlobalTooltipDismissBound) {
		return;
	}

	isGlobalTooltipDismissBound = true;

	document.addEventListener("pointerdown", (event) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest(".ticket-name-details")) {
			return;
		}

		closeOpenTicketTooltips();
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeOpenTicketTooltips();
		}
	});
}

function updateTicketTooltipPlacement(details: HTMLDetailsElement): void {
	const tooltip = details.querySelector<HTMLElement>(".ticket-name-tooltip");

	if (!tooltip || !details.open) {
		details.classList.remove("is-tooltip-up");
		details.classList.remove("is-portal-open");
		hideTooltipPortal(details);
		return;
	}

	const triggerRect = details.getBoundingClientRect();
	const tooltipHeight = tooltip.offsetHeight;
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const spaceBelow = viewportHeight - triggerRect.bottom;
	const spaceAbove = triggerRect.top;
	const minGap = 12;
	const isMobilePortrait = window.matchMedia("(max-width: 640px) and (orientation: portrait)").matches;
	const hasRoomAbove = spaceAbove >= tooltipHeight + minGap;
	const hasRoomBelow = spaceBelow >= tooltipHeight + minGap;
	const tableScroll = details.closest<HTMLElement>(".tickets-table-scroll");
	const stickyHeaderCell = tableScroll?.querySelector<HTMLTableCellElement>("thead th");
	const stickyHeaderBottom = stickyHeaderCell?.getBoundingClientRect().bottom ?? Number.NEGATIVE_INFINITY;
	const row = details.closest<HTMLTableRowElement>("tr");
	const nextRow = row?.nextElementSibling as HTMLTableRowElement | null;
	const nextRowTop = nextRow?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;

	let shouldFlipUp = isMobilePortrait ? hasRoomAbove || (!hasRoomBelow && spaceAbove > spaceBelow) : !hasRoomBelow && spaceAbove > spaceBelow;
	let shouldUsePortal = false;

	if (shouldFlipUp) {
		const nextTooltipTop = triggerRect.top - tooltipHeight - minGap;
		if (nextTooltipTop < stickyHeaderBottom + 6) {
			shouldFlipUp = false;
			shouldUsePortal = true;
		}
	}

	if (!shouldFlipUp) {
		const tooltipBottom = triggerRect.bottom + minGap + tooltipHeight;
		const collidesNextRow = tooltipBottom > nextRowTop - 4;
		if (collidesNextRow || (!hasRoomAbove && !hasRoomBelow)) {
			shouldUsePortal = true;
		}
	}

	if (shouldUsePortal) {
		details.classList.remove("is-tooltip-up");
		showTooltipPortal(details, tooltip.textContent ?? "");
		return;
	}

	details.classList.remove("is-portal-open");
	hideTooltipPortal(details);

	details.classList.toggle("is-tooltip-up", shouldFlipUp);
}

function bindTicketTooltipBehavior(details: HTMLDetailsElement): void {
	bindGlobalTooltipDismiss();

	const ownerCell = details.closest<HTMLTableCellElement>(".ticket-id-cell");

	details.addEventListener("toggle", () => {
		if (details.open) {
			closeOpenTicketTooltips(details);
		}

		ownerCell?.classList.toggle("tooltip-open", details.open);
		updateTicketTooltipPlacement(details);
	});

	window.addEventListener("resize", () => {
		if (details.open) {
			updateTicketTooltipPlacement(details);
		}
	});

	document.addEventListener(
		"scroll",
		() => {
			if (details.open) {
				updateTicketTooltipPlacement(details);
			}
		},
		{ passive: true, capture: true },
	);
}

function createTicketNameDetails(name: string): HTMLDetailsElement {
	const details = document.createElement("details");
	details.className = "ticket-name-details";

	const summary = document.createElement("summary");
	summary.className = "ticket-id-trigger";
	summary.setAttribute("aria-label", "Ver nombre del carton");
	summary.textContent = "i";

	const tooltip = document.createElement("span");
	tooltip.className = "ticket-name-tooltip";
	tooltip.textContent = name;

	details.appendChild(summary);
	details.appendChild(tooltip);
	bindTicketTooltipBehavior(details);

	return details;
}

function createTicketIdCell(ticket: Ticket): { cell: HTMLTableCellElement; hitCountLabel: HTMLSpanElement } {
	const idCell = document.createElement("td");
	idCell.className = "ticket-id-cell";

	const idLabel = document.createElement("strong");
	idLabel.className = "ticket-id-value";
	idLabel.textContent = ticket.id;

	const hitLabel = document.createElement("span");
	hitLabel.className = "ticket-hit-count";
	hitLabel.textContent = `0/${TICKET_NUMBERS_PER_CARD}`;

	if (ticket.name) {
		const details = createTicketNameDetails(ticket.name);
		const summary = details.querySelector("summary");

		if (summary) {
			summary.innerHTML = "";
			summary.appendChild(idLabel);
			summary.appendChild(hitLabel);
		}

		idCell.appendChild(details);
	} else {
		const wrapper = document.createElement("div");
		wrapper.className = "ticket-id-row";
		wrapper.appendChild(idLabel);
		wrapper.appendChild(hitLabel);
		idCell.appendChild(wrapper);
	}

	return { cell: idCell, hitCountLabel: hitLabel };
}

export function renderTicketsTable(container: HTMLTableSectionElement, tickets: Ticket[]): TicketTableView {
	const fragment = document.createDocumentFragment();
	const rows: TicketRowRefs[] = [];
	const numberCellIndex = new Map<number, HTMLTableCellElement[]>();

	tickets.forEach((ticket) => {
		const row = document.createElement("tr");
		row.dataset.ticketId = ticket.id;

		const { cell: idCell, hitCountLabel } = createTicketIdCell(ticket);
		row.appendChild(idCell);

		const numberCells: HTMLTableCellElement[] = [];

		ticket.numbers.forEach((value) => {
			const numberCell = document.createElement("td");
			numberCell.className = "ticket-number-cell";
			numberCell.dataset.value = String(value);
			numberCell.textContent = String(value);

			row.appendChild(numberCell);
			numberCells.push(numberCell);

			const indexedCells = numberCellIndex.get(value) ?? [];
			indexedCells.push(numberCell);
			numberCellIndex.set(value, indexedCells);
		});

		fragment.appendChild(row);
		rows.push({ row, hitCountLabel, numberCells });
	});

	container.innerHTML = "";
	container.appendChild(fragment);

	return { rows, numberCellIndex, tbody: container };
}

export function updateTicketRowState(ticketTableView: TicketTableView, rowIndex: number, hits: number, isCompleted: boolean): void {
	const rowRef = ticketTableView.rows[rowIndex];

	if (!rowRef) {
		return;
	}

	rowRef.hitCountLabel.textContent = `${hits}/${TICKET_NUMBERS_PER_CARD}`;
	rowRef.row.classList.toggle("ticket-complete", isCompleted);
}

export function setTicketNumberState(ticketTableView: TicketTableView, value: number, isCalled: boolean): void {
	const targets = ticketTableView.numberCellIndex.get(value);

	if (!targets) {
		return;
	}

	targets.forEach((cell) => {
		cell.classList.toggle("called", isCalled);
	});
}

export function resetTicketMatrixState(ticketTableView: TicketTableView): void {
	ticketTableView.rows.forEach((rowRef) => {
		rowRef.row.classList.remove("ticket-complete");
		rowRef.hitCountLabel.textContent = `0/${TICKET_NUMBERS_PER_CARD}`;
		rowRef.numberCells.forEach((numberCell) => {
			numberCell.classList.remove("called");
		});
	});
}

export function reorderTicketRows(ticketTableView: TicketTableView, rankedIndexes: number[]): void {
	const fragment = document.createDocumentFragment();

	rankedIndexes.forEach((index) => {
		const rowRef = ticketTableView.rows[index];

		if (rowRef) {
			fragment.appendChild(rowRef.row);
		}
	});

	ticketTableView.tbody.innerHTML = "";
	ticketTableView.tbody.appendChild(fragment);
}
