export const BINGO_MIN = 0;
export const BINGO_MAX = 90;
export const GRID_DIGIT_MIN = 0;
export const GRID_DIGIT_MAX = 9;

export function isValidBingoNumber(value: number): boolean {
  return Number.isInteger(value) && value >= BINGO_MIN && value <= BINGO_MAX;
}
