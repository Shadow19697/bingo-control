import { parseTicketsPayload, type LoadedTicketsResult } from "./tickets";

type CsvTicketRow = {
	id: string;
	name?: string;
	numbers: number[];
};

function parseNumbersFromCsvCells(cells: string[]): number[] {
	return cells.map((entry) => Number(entry.trim()));
}

function parseCsvLine(line: string, rowIndex: number): CsvTicketRow {
	const cells = line.split(",").map((entry) => entry.trim());
	if (cells.length < 16) {
		throw new Error(`Carton ${rowIndex + 1} (CSV) invalido. Debe contener id,nombre,n1..n15.`);
	}

	const [idCell, nameCell, ...numbersCells] = cells;
	const numbers = parseNumbersFromCsvCells(numbersCells);

	return {
		id: idCell,
		name: nameCell.length > 0 ? nameCell : undefined,
		numbers,
	};
}

function parseCsvPayload(input: string): unknown {
	const lines = input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const parsedRows = lines.map((line, index) => parseCsvLine(line, index));
	return { tickets: parsedRows };
}

function parseRawPayload(input: string): unknown {
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		throw new Error("No hay datos para procesar en carga masiva.");
	}

	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return JSON.parse(trimmed) as unknown;
	}

	return parseCsvPayload(trimmed);
}

// Los valores validos son enteros de 1 a 90, asi que ningun separador puede formar parte de un
// numero. Aceptamos coma, espacio, salto de linea, punto y coma o punto para que el campo funcione
// con cualquier tecla de separador que ofrezca el teclado numerico del celular.
export function parseTicketNumbersInput(input: string): number[] {
	const values = input
		.split(/[\s,;.]+/)
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.map((entry) => Number(entry));

	return values;
}

export function parseBulkTicketsInput(input: string, existingIds?: ReadonlySet<string>): LoadedTicketsResult {
	const rawPayload = parseRawPayload(input);
	return parseTicketsPayload(rawPayload, existingIds);
}
