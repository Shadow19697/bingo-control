import { BINGO_MAX, BINGO_MIN } from '../config';

export function getAppTemplate(totalNumbers: number): string {
  return `
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
            <input
              id="manual-number"
              type="number"
              min="${BINGO_MIN}"
              max="${BINGO_MAX}"
              placeholder="24"
            />
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
          <p class="status-chip"><strong id="pending">${totalNumbers}</strong> faltantes</p>
        </div>

        <p class="called-list" id="called-list">Aun no hay numeros marcados.</p>
      </section>
    </main>
  `;
}
