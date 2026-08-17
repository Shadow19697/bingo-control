export const DEFAULT_BINGO_MIN = 0;
export const DEFAULT_BINGO_MAX = 90;

export function getBingoNumbers(
  minNumber: number = DEFAULT_BINGO_MIN,
  maxNumber: number = DEFAULT_BINGO_MAX
): number[] {
  return Array.from({ length: maxNumber - minNumber + 1 }, (_, index) => minNumber + index);
}

export function toggleCalledNumber(
  calledNumbers: Set<number>,
  value: number,
  minNumber: number = DEFAULT_BINGO_MIN,
  maxNumber: number = DEFAULT_BINGO_MAX
): boolean {
  if (value < minNumber || value > maxNumber) {
    return false;
  }

  if (calledNumbers.has(value)) {
    calledNumbers.delete(value);
    return false;
  }

  calledNumbers.add(value);
  return true;
}

export function clearCalledNumbers(calledNumbers: Set<number>): void {
  calledNumbers.clear();
}

export function getSortedCalledNumbers(calledNumbers: Set<number>): number[] {
  return Array.from(calledNumbers).sort((a, b) => a - b);
}

export function getTotalBingoNumbers(
  minNumber: number = DEFAULT_BINGO_MIN,
  maxNumber: number = DEFAULT_BINGO_MAX
): number {
  return maxNumber - minNumber + 1;
}
