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
};

function createTicketIdCell(ticket: Ticket): { cell: HTMLTableCellElement; hitCountLabel: HTMLSpanElement } {
	const idCell = document.createElement("td");
	idCell.className = "ticket-id-cell";

	const wrapper = document.createElement("div");
	wrapper.className = "ticket-id-wrap";

	const idLabel = document.createElement("strong");
	idLabel.textContent = ticket.id;

	const hitLabel = document.createElement("span");
	hitLabel.className = "ticket-hit-count";
	hitLabel.textContent = `0/${TICKET_NUMBERS_PER_CARD}`;

	wrapper.appendChild(idLabel);
	wrapper.appendChild(hitLabel);
	idCell.appendChild(wrapper);

	return { cell: idCell, hitCountLabel: hitLabel };
}

function createTicketNameCell(ticket: Ticket): HTMLTableCellElement {
	const nameCell = document.createElement("td");
	nameCell.className = "ticket-name-cell";
	nameCell.textContent = ticket.name ?? "Sin nombre";
	return nameCell;
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

		const nameCell = createTicketNameCell(ticket);
		row.appendChild(nameCell);

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

	return { rows, numberCellIndex };
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
