import { BINGO_MAX, BINGO_MIN } from "../config";
import { actionIcons, authIcons, themeIcons } from "../icons";
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
        <div class="hero-actions">
          <button id="theme-toggle-btn" class="hero-icon-btn icon-btn" type="button" aria-label="Cambiar a modo oscuro" title="Modo oscuro">
            <span id="theme-toggle-icon" aria-hidden="true">${themeIcons.dark}</span>
          </button>
          <button id="auth-open-btn" class="auth-open-btn hero-icon-btn icon-btn" type="button" aria-label="Abrir ingreso" title="Ingreso">
            <span id="auth-open-icon" aria-hidden="true">${authIcons.login}</span>
          </button>
        </div>
        <span class="app-version">v${version}</span>
      </header>

      <div id="auth-modal" class="modal" hidden>
        <button id="auth-modal-backdrop" class="modal-backdrop" type="button" aria-label="Cerrar modal"></button>
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div class="modal-head">
            <h2 id="auth-modal-title">Ingreso</h2>
            <button id="auth-close-btn" class="modal-close-btn icon-btn" type="button" aria-label="Cerrar ingreso" title="Cerrar">
              <span aria-hidden="true">${authIcons.close}</span>
            </button>
          </div>
          <p id="auth-error" class="auth-error" role="alert" hidden></p>
          <form id="auth-form" class="auth-form" autocomplete="off">
            <label>
              <span>Usuario</span>
              <input id="auth-user" name="username" type="text" autocomplete="username" required />
            </label>
            <label>
              <span>Clave</span>
              <input id="auth-pass" name="password" type="password" autocomplete="current-password" required />
            </label>
            <button id="auth-login-btn" class="btn alt" type="submit">Ingresar</button>
          </form>
        </section>
      </div>

      <div id="ticket-modal" class="modal" hidden>
        <button id="ticket-modal-backdrop" class="modal-backdrop" type="button" aria-label="Cerrar modal"></button>
        <section class="modal-card is-wide" role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
          <div class="modal-head">
            <h2 id="ticket-modal-title">Cargar carton</h2>
            <button id="ticket-modal-close-btn" class="modal-close-btn icon-btn" type="button" aria-label="Cerrar" title="Cerrar">
              <span aria-hidden="true">${authIcons.close}</span>
            </button>
          </div>
          <form id="ticket-form" class="ticket-form" autocomplete="off">
            <div class="ticket-form-grid">
              <label>
                <span>ID</span>
                <input id="ticket-id-input" name="ticketId" type="text" inputmode="numeric" required />
              </label>
              <label>
                <span>Nombre (opcional)</span>
                <input id="ticket-name-input" name="ticketName" type="text" maxlength="60" />
              </label>
              <label class="ticket-form-full">
                <span>Numeros (15 valores, separados por coma o espacio)</span>
                <input id="ticket-numbers-input" name="ticketNumbers" type="text" inputmode="decimal" placeholder="1, 4, 7, 12, ..." required />
              </label>
            </div>
            <div class="ticket-form-actions">
              <button id="ticket-save-btn" class="btn alt" type="submit">Guardar</button>
              <button id="ticket-clear-form-btn" class="sort-btn" type="button">Limpiar formulario</button>
            </div>
            <div class="field-error" id="ticket-form-error" role="alert" hidden></div>
          </form>
        </section>
      </div>

      <div id="bulk-modal" class="modal" hidden>
        <button id="bulk-modal-backdrop" class="modal-backdrop" type="button" aria-label="Cerrar modal"></button>
        <section class="modal-card is-wide" role="dialog" aria-modal="true" aria-labelledby="bulk-modal-title">
          <div class="modal-head">
            <h2 id="bulk-modal-title">Cargar cartones</h2>
            <button id="bulk-modal-close-btn" class="modal-close-btn icon-btn" type="button" aria-label="Cerrar" title="Cerrar">
              <span aria-hidden="true">${authIcons.close}</span>
            </button>
          </div>
          <section class="bulk-wrap" aria-label="Carga masiva">
            <p class="bulk-hint">Acepta JSON con clave tickets o CSV por linea: id,nombre,n1..n15</p>
            <p class="bulk-hint">Ejemplo CSV: 1001,Juan Perez,1,4,7,12,18,23,29,34,39,45,52,60,66,73,88</p>
            <textarea id="bulk-input" rows="6" placeholder='{"tickets":[{"id":"1001","name":"Juan Perez","numbers":[1,4,7,12,18,23,29,34,39,45,52,60,66,73,88]}]}'></textarea>
            <div class="ticket-form-actions">
              <button id="bulk-load-btn" class="btn alt" type="button">Cargar cartones</button>
              <button id="bulk-clear-btn" class="sort-btn" type="button">Limpiar bloque</button>
            </div>
            <div class="field-error" id="bulk-error" role="alert" hidden></div>
          </section>
        </section>
      </div>

      <div id="toast" class="toast" role="status" aria-live="polite"></div>

      <section class="tabs" aria-label="Vistas de control">
        <button id="tab-control" class="tab-btn is-active" type="button" aria-selected="true">
          Control
        </button>
        <button id="tab-tickets" class="tab-btn" type="button" aria-selected="false" hidden>
          Cartones
          <span id="tab-tickets-alert-label" class="tab-alert-label" hidden></span>
          <span id="tab-tickets-alert" class="tab-alert-dot" hidden aria-hidden="true"></span>
        </button>
        <button id="tab-management" class="tab-btn" type="button" aria-selected="false" hidden>
          Gestion
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

      <section id="panel-management" class="panel" aria-label="Gestion de cartones" hidden>
        <section class="management-wrap" aria-label="ABM de cartones">
          <section class="ticket-list-wrap" aria-label="Cartones actuales para editar o borrar">
            <div class="ticket-list-head">
              <h2>Cartones actuales</h2>
              <span id="management-count" class="mgmt-count" aria-live="polite" aria-label="Cartones cargados">0</span>
              <div class="ticket-list-actions">
                <button id="open-ticket-modal-btn" class="btn alt" type="button" aria-label="Cargar carton" title="Cargar carton">
                  <span class="btn-icon" aria-hidden="true">${actionIcons.addOne}</span>
                  <span class="btn-label">Cargar carton</span>
                </button>
                <button id="open-bulk-modal-btn" class="btn alt" type="button" aria-label="Cargar cartones" title="Cargar cartones">
                  <span class="btn-icon" aria-hidden="true">${actionIcons.addMany}</span>
                  <span class="btn-label">Cargar cartones</span>
                </button>
                <button id="delete-all-btn" class="btn" type="button" aria-label="Borrar todos" title="Borrar todos">
                  <span class="btn-icon" aria-hidden="true">${actionIcons.delete}</span>
                  <span class="btn-label">Borrar todos</span>
                </button>
              </div>
            </div>
            <div class="management-search">
              <span class="management-search-icon" aria-hidden="true">${actionIcons.search}</span>
              <input id="management-search" type="search" autocomplete="off" placeholder="Buscar por ID o nombre" aria-label="Buscar cartones por ID o nombre" />
              <button id="management-search-clear" class="management-search-clear" type="button" aria-label="Limpiar busqueda" title="Limpiar busqueda" hidden>${authIcons.close}</button>
            </div>
            <div class="management-table-scroll">
              <table class="management-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Numeros</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="management-tickets-body"></tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </main>
  `;
}
