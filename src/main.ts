import './style.css';
import { clearCalledNumbers, getTotalBingoNumbers, toggleCalledNumber } from './bingo';
import { BINGO_MAX, BINGO_MIN, isValidBingoNumber } from './config';
import { querySelectorOrThrow } from './ui/dom';
import { renderNumbersGrid, resetGridSelection, setNumberButtonState } from './ui/grid';
import { renderStatus, type StatusElements } from './ui/status';
import { getAppTemplate } from './ui/template';

const app = querySelectorOrThrow<HTMLDivElement>('#app');
const calledNumbers = new Set<number>();
const totalNumbers = getTotalBingoNumbers(BINGO_MIN, BINGO_MAX);

app.innerHTML = getAppTemplate(totalNumbers);

const grid = querySelectorOrThrow<HTMLDivElement>('#numbers-grid', app);
const clearBtn = querySelectorOrThrow<HTMLButtonElement>('#clear-btn', app);
const manualBtn = querySelectorOrThrow<HTMLButtonElement>('#manual-btn', app);
const manualInput = querySelectorOrThrow<HTMLInputElement>('#manual-number', app);

const statusElements: StatusElements = {
  countLabel: querySelectorOrThrow<HTMLElement>('#count', app),
  pendingLabel: querySelectorOrThrow<HTMLElement>('#pending', app),
  calledList: querySelectorOrThrow<HTMLElement>('#called-list', app)
};

const refreshStatus = (): void => {
  renderStatus(statusElements, calledNumbers, totalNumbers);
};

renderNumbersGrid(grid, (value, isNowMarked) => {
  if (isNowMarked) {
    calledNumbers.add(value);
  } else {
    calledNumbers.delete(value);
  }

  refreshStatus();
});

clearBtn.addEventListener('click', () => {
  clearCalledNumbers(calledNumbers);
  resetGridSelection(grid);
  refreshStatus();
  manualInput.focus();
});

manualBtn.addEventListener('click', () => {
  const parsed = Number(manualInput.value);

  if (!isValidBingoNumber(parsed)) {
    manualInput.focus();
    return;
  }

  const isNowMarked = toggleCalledNumber(calledNumbers, parsed, BINGO_MIN, BINGO_MAX);
  setNumberButtonState(grid, parsed, isNowMarked);

  refreshStatus();
  manualInput.value = '';
  manualInput.focus();
});

manualInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    manualBtn.click();
  }
});

refreshStatus();
