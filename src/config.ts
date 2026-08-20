export const BINGO_MIN = 1;
export const BINGO_MAX = 90;

export const CONTROL_COLUMN_MIN = 1;
export const CONTROL_COLUMN_MAX = 10;
export const CONTROL_ROW_BASE_MIN = 1;
export const CONTROL_ROW_BASE_MAX = 81;
export const CONTROL_ROW_STEP = 10;

export const TICKET_NUMBERS_PER_CARD = 15;

export function isValidBingoNumber(value: number): boolean {
	return Number.isInteger(value) && value >= BINGO_MIN && value <= BINGO_MAX;
}
