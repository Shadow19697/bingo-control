import { getBingoNumbers } from '../bingo';
import { BINGO_MAX, GRID_DIGIT_MAX, GRID_DIGIT_MIN } from '../config';

type NumberToggleHandler = (value: number, isNowMarked: boolean) => void;

function createNumberButton(value: number, onToggle: NumberToggleHandler): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'ball';
  button.type = 'button';
  button.textContent = String(value);
  button.dataset.value = String(value);
  button.setAttribute('aria-pressed', 'false');

  button.addEventListener('click', () => {
    const isNowMarked = !button.classList.contains('active');
    button.classList.toggle('active', isNowMarked);
    button.setAttribute('aria-pressed', String(isNowMarked));
    onToggle(value, isNowMarked);
  });

  return button;
}

export function renderNumbersGrid(container: HTMLDivElement, onToggle: NumberToggleHandler): void {
  const fragment = document.createDocumentFragment();
  const digits = getBingoNumbers(GRID_DIGIT_MIN, GRID_DIGIT_MAX);

  const corner = document.createElement('div');
  corner.className = 'axis corner';
  corner.textContent = 'x10';
  fragment.appendChild(corner);

  digits.forEach((digit) => {
    const header = document.createElement('div');
    header.className = 'axis axis-col';
    header.textContent = String(digit);
    fragment.appendChild(header);
  });

  for (let rowBase = 0; rowBase <= BINGO_MAX; rowBase += 10) {
    const rowHeader = document.createElement('div');
    rowHeader.className = 'axis axis-row';
    rowHeader.textContent = String(rowBase);
    fragment.appendChild(rowHeader);

    digits.forEach((digit) => {
      const value = rowBase + digit;

      if (value > BINGO_MAX) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        fragment.appendChild(empty);
        return;
      }

      fragment.appendChild(createNumberButton(value, onToggle));
    });
  }

  container.innerHTML = '';
  container.appendChild(fragment);
}

export function resetGridSelection(container: HTMLDivElement): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>('.ball');

  buttons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
}

export function setNumberButtonState(
  container: HTMLDivElement,
  value: number,
  isNowMarked: boolean
): void {
  const target = container.querySelector<HTMLButtonElement>(`.ball[data-value="${value}"]`);

  if (!target) {
    return;
  }

  target.classList.toggle('active', isNowMarked);
  target.setAttribute('aria-pressed', String(isNowMarked));
}
