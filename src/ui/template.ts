import { BINGO_MAX, BINGO_MIN } from "../config";

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
          la ronda cuando quieras.
        </div>
      </header>

      <section class="tabs" aria-label="Vistas de control">
        <button id="tab-control" class="tab-btn is-active" type="button" aria-selected="true">
          Control
        </button>
        <button id="tab-tickets" class="tab-btn" type="button" aria-selected="false">
          Cartones
        </button>
      </section>

      <section id="panel-control" class="panel" aria-label="Vista principal de control">
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
      </section>

      <section id="panel-tickets" class="panel" aria-label="Vista de cartones" hidden>
        <section class="summary" aria-live="polite" aria-label="Estado de carga de cartones">
          <div class="status-row">
            <p class="status-chip"><strong id="tickets-total">0</strong> cartones cargados</p>
            <p class="status-chip"><strong id="tickets-invalid">0</strong> cartones invalidos</p>
            <p class="status-chip"><strong id="completed-count">0</strong> cartones completos</p>
          </div>
          <p class="called-list" id="tickets-invalid-list">No hay errores de carga.</p>
        </section>

        <section class="tickets-wrap" aria-label="Matriz de cartones">
          <table class="tickets-table" id="tickets-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>N1</th>
                <th>N2</th>
                <th>N3</th>
                <th>N4</th>
                <th>N5</th>
                <th>N6</th>
                <th>N7</th>
                <th>N8</th>
                <th>N9</th>
                <th>N10</th>
                <th>N11</th>
                <th>N12</th>
                <th>N13</th>
                <th>N14</th>
                <th>N15</th>
              </tr>
            </thead>
            <tbody id="tickets-body"></tbody>
          </table>
        </section>
      </section>
    </main>
  `;
}
