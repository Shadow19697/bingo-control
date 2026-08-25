import { describe, expect, it } from "vitest";
import { parseTicketsPayload, TICKET_NAME_MAX_LENGTH } from "./tickets";

const numbers = [1, 4, 7, 12, 18, 23, 29, 34, 39, 45, 52, 60, 66, 73, 88];

describe("parseTicketsPayload", () => {
	it("normaliza un carton valido", () => {
		const parsed = parseTicketsPayload({ tickets: [{ id: " 101 ", name: " Mesa ", numbers: [...numbers].reverse() }] });
		expect(parsed.invalidTickets).toEqual([]);
		expect(parsed.tickets).toEqual([{ id: "101", name: "Mesa", numbers }]);
	});

	it("acepta numeros con ceros a la izquierda (01 equivale a 1)", () => {
		const numbersWithLeadingZero = ["01", 4, 7, 12, 18, 23, 29, 34, 39, 45, 52, 60, 66, 73, 88];
		const parsed = parseTicketsPayload({ tickets: [{ id: "102", numbers: numbersWithLeadingZero }] });
		expect(parsed.invalidTickets).toEqual([]);
		expect(parsed.tickets).toEqual([{ id: "102", name: undefined, numbers }]);
	});

	it("acepta un ID con ceros a la izquierda (01 equivale a 1)", () => {
		const parsed = parseTicketsPayload({ tickets: [{ id: "007", numbers }] });
		expect(parsed.invalidTickets).toEqual([]);
		expect(parsed.tickets).toEqual([{ id: "7", name: undefined, numbers }]);
	});

	it("rechaza IDs duplicados y numeros repetidos", () => {
		const parsed = parseTicketsPayload({ tickets: [{ id: "1", numbers }, { id: "1", numbers }, { id: "2", numbers: [...numbers.slice(0, 14), numbers[0]] }] });
		expect(parsed.tickets).toHaveLength(1);
		expect(parsed.invalidTickets).toHaveLength(2);
		expect(parsed.invalidTickets.every((invalid) => invalid.field === "id" || invalid.field === "numbers")).toBe(true);
	});

	it("rechaza un ID no numerico", () => {
		const parsed = parseTicketsPayload({ tickets: [{ id: "A-01", numbers }] });
		expect(parsed.tickets).toEqual([]);
		expect(parsed.invalidTickets).toEqual([{ index: 0, field: "id", reason: "El ID debe ser un numero entero positivo." }]);
	});

	it("rechaza un nombre que supera el largo maximo", () => {
		const longName = "N".repeat(TICKET_NAME_MAX_LENGTH + 1);
		const parsed = parseTicketsPayload({ tickets: [{ id: "103", name: longName, numbers }] });
		expect(parsed.tickets).toEqual([]);
		expect(parsed.invalidTickets).toHaveLength(1);
		expect(parsed.invalidTickets[0].field).toBe("name");
	});

	it("acumula el error de ID ya cargado y el de numeros invalidos para el mismo carton", () => {
		const numbersWithRepeat = [...numbers.slice(0, 14), numbers[13]];
		const parsed = parseTicketsPayload({ tickets: [{ id: "1", numbers: numbersWithRepeat }] }, new Set(["1"]));
		expect(parsed.tickets).toEqual([]);
		expect(parsed.invalidTickets).toHaveLength(2);
		expect(parsed.invalidTickets.map((invalid) => invalid.field).sort()).toEqual(["id", "numbers"]);
		expect(parsed.invalidTickets.every((invalid) => invalid.index === 0)).toBe(true);
	});
});
