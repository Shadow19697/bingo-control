import { describe, expect, it } from "vitest";
import { parseTicketNumbersInput } from "./management";

describe("parseTicketNumbersInput", () => {
	it("separa por coma, como en la carga historica", () => {
		expect(parseTicketNumbersInput("1, 4, 7, 12")).toEqual([1, 4, 7, 12]);
	});

	it("separa por espacios, para el teclado numerico del celular", () => {
		expect(parseTicketNumbersInput("1 4 7 12")).toEqual([1, 4, 7, 12]);
	});

	it("acepta separadores mezclados y repetidos", () => {
		expect(parseTicketNumbersInput("1,, 4;7 . 12\n18")).toEqual([1, 4, 7, 12, 18]);
	});

	it("ignora separadores al principio y al final", () => {
		expect(parseTicketNumbersInput("  , 1, 4 ,  ")).toEqual([1, 4]);
	});

	it("devuelve vacio cuando no hay valores", () => {
		expect(parseTicketNumbersInput("   ")).toEqual([]);
	});

	it("mantiene NaN para tokens no numericos, para que la validacion los rechace", () => {
		const values = parseTicketNumbersInput("1, abc, 4");

		expect(values).toHaveLength(3);
		expect(values[0]).toBe(1);
		expect(Number.isNaN(values[1])).toBe(true);
		expect(values[2]).toBe(4);
	});
});
