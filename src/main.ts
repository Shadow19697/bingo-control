import './style.css';
import {
  clearCalledNumbers,
  DEFAULT_BINGO_MAX,
  DEFAULT_BINGO_MIN,
  getBingoNumbers,
  getTotalBingoNumbers,
  toggleCalledNumber
} from './bingo';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontro el contenedor principal de la app.');
}

const calledNumbers = new Set<number>();

app.innerHTML = `
  <main class="layout">
    <header class="hero">
      <h1>Control de numeros</h1>
      <button
        type="button"
        class="help-btn"
        aria-label="Como funciona este control"
        aria-describedby="help-tip"
      >
        ?
      </button>
      <div class="help-tip" id="help-tip" role="tooltip">
        Toca un numero para marcarlo o desmarcarlo. Tambien puedes cargarlo manualmente y limpiar
        la partida cuando quieras.
      </div>
    </header>

    <section class="toolbar" aria-label="Controles de partida">
      <div class="controls-row">
        <label class="manual-input" for="manual-number">
          <span>Numero</span>
          <input id="manual-number" type="number" min="0" max="90" placeholder="24" />
        </label>
        <button id="manual-btn" class="btn alt">Aplicar</button>
        <button id="clear-btn" class="btn">Limpiar</button>
      </div>
    </section>

    <section>
      <div class="grid-wrap">
        <div class="grid" id="numbers-grid" aria-label="Grilla de numeros de bingo"></div>
      </div>
    </section>

    <section class="summary" aria-live="polite" aria-label="Resumen de numeros">
      <div class="status-row">
        <p class="status-chip"><strong id="count">0</strong> marcados</p>
        <p class="status-chip"><strong id="pending">91</strong> faltantes</p>
      </div>

      <p class="called-list" id="called-list">Aun no hay numeros marcados.</p>
    </section>
  </main>
`;

const grid = document.querySelector<HTMLDivElement>('#numbers-grid');
const countLabel = document.querySelector<HTMLElement>('#count');
const pendingLabel = document.querySelector<HTMLElement>('#pending');
const calledList = document.querySelector<HTMLElement>('#called-list');
const clearBtn = document.querySelector<HTMLButtonElement>('#clear-btn');
const manualBtn = document.querySelector<HTMLButtonElement>('#manual-btn');
const manualInput = document.querySelector<HTMLInputElement>('#manual-number');

if (
  !grid ||
  !countLabel ||
  !pendingLabel ||
  !calledList ||
  !clearBtn ||
  !manualBtn ||
  !manualInput
) {
  throw new Error('No se pudieron inicializar todos los elementos de la interfaz.');
}

const totalNumbers = getTotalBingoNumbers(DEFAULT_BINGO_MIN, DEFAULT_BINGO_MAX);

const refreshStatus = (): void => {
  const chronological = Array.from(calledNumbers);
  const count = chronological.length;

  countLabel.textContent = String(count);
  pendingLabel.textContent = String(totalNumbers - count);
  calledList.textContent =
    count > 0 ? `Salida: ${chronological.join(', ')}` : 'Aun no hay numeros marcados.';
};

const createNumberButton = (value: number): HTMLButtonElement => {
  const button = document.createElement('button');
  button.className = 'ball';
  button.type = 'button';
  button.textContent = String(value);
  button.dataset.value = String(value);
  button.setAttribute('aria-pressed', 'false');

  button.addEventListener('click', () => {
    const isNowMarked = toggleCalledNumber(
      calledNumbers,
      value,
      DEFAULT_BINGO_MIN,
      DEFAULT_BINGO_MAX
    );
    button.classList.toggle('active', isNowMarked);
    button.setAttribute('aria-pressed', String(isNowMarked));
    refreshStatus();
  });

  return button;
};

const renderGrid = (): void => {
  const fragment = document.createDocumentFragment();
  const digits = getBingoNumbers(0, 9);

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

  for (let rowBase = 0; rowBase <= DEFAULT_BINGO_MAX; rowBase += 10) {
    const rowHeader = document.createElement('div');
    rowHeader.className = 'axis axis-row';
    rowHeader.textContent = String(rowBase);
    fragment.appendChild(rowHeader);

    digits.forEach((digit) => {
      const value = rowBase + digit;

      if (value > DEFAULT_BINGO_MAX) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        fragment.appendChild(empty);
        return;
      }

      fragment.appendChild(createNumberButton(value));
    });
  }

  grid.innerHTML = '';
  grid.appendChild(fragment);
};

clearBtn.addEventListener('click', () => {
  clearCalledNumbers(calledNumbers);

  const buttons = grid.querySelectorAll<HTMLButtonElement>('.ball');
  buttons.forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });

  refreshStatus();
  manualInput.focus();
});

manualBtn.addEventListener('click', () => {
  const parsed = Number(manualInput.value);

  if (
    !Number.isInteger(parsed) ||
    parsed < DEFAULT_BINGO_MIN ||
    parsed > DEFAULT_BINGO_MAX
  ) {
    manualInput.focus();
    return;
  }

  const target = grid.querySelector<HTMLButtonElement>(`.ball[data-value="${parsed}"]`);
  if (!target) {
    return;
  }

  const isNowMarked = toggleCalledNumber(
    calledNumbers,
    parsed,
    DEFAULT_BINGO_MIN,
    DEFAULT_BINGO_MAX
  );
  target.classList.toggle('active', isNowMarked);
  target.setAttribute('aria-pressed', String(isNowMarked));

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

renderGrid();
refreshStatus();
