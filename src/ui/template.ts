import { BINGO_MAX, BINGO_MIN } from "../config";
import { version } from "../../package.json";

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
        <span class="app-version">v${version}</span>
      </header>

      <section class="tabs" aria-label="Vistas de control">
        <button id="tab-control" class="tab-btn is-active" type="button" aria-selected="true">
          Control
        </button>
        <button id="tab-tickets" class="tab-btn" type="button" aria-selected="false">
          Cartones
          <span id="tab-tickets-alert-label" class="tab-alert-label" hidden>Nuevo</span>
          <span id="tab-tickets-alert" class="tab-alert-dot" hidden aria-hidden="true"></span>
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

        <section class="control-grid-section">
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
          <div class="status-row tickets-status-row">
            <p class="status-chip"><strong id="tickets-total">0</strong> cargados</p>
            <p class="status-chip"><strong id="completed-count">0</strong> completos</p>
            <p id="tickets-state-chip" class="status-chip tickets-state-chip" tabindex="0">
              <span id="tickets-state-icon" aria-hidden="true">✓</span>
              <span id="tickets-state-text">Sin errores</span>
            </p>
          </div>
          <p class="sr-only" id="tickets-invalid-list" aria-label="Estado de validacion">Sin errores de carga.</p>
        </section>

        <section class="tickets-wrap" aria-label="Matriz de cartones">
          <div class="tickets-controls" role="group" aria-label="Orden de cartones">
            <button id="sort-hits-btn" class="sort-btn is-active" type="button" aria-pressed="true">
              Aciertos
            </button>
            <button id="sort-fixed-btn" class="sort-btn" type="button" aria-pressed="false">
              Fijo ID
            </button>
          </div>

          <div class="tickets-table-scroll" aria-label="Tabla de cartones">
            <table class="tickets-table" id="tickets-table">
              <thead>
                <tr>
                  <th>ID</th>
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
          </div>
        </section>
      </section>
    </main>
  `;
}
