import "./style.css";
import { ApiError, createTicket, deleteAllTickets, deleteTicket, fetchTicketsFromApi, getSession, importTickets, login, logout, updateTicket } from "./api";
import { clearCalledNumbers, getTotalBingoNumbers, toggleCalledNumber } from "./bingo";
import { BINGO_MAX, BINGO_MIN, isValidBingoNumber } from "./config";
import { actionIcons, authIcons, themeIcons } from "./icons";
import { parseBulkTicketsInput, parseTicketNumbersInput } from "./management";
import { countTicketHits, formatCompletedTicketsAlert, parseTicketsPayload, sortTicketsById, type InvalidTicket, type Ticket } from "./tickets";
import { querySelectorOrThrow } from "./ui/dom";
import { renderNumbersGrid, resetGridSelection, setNumberButtonState } from "./ui/grid";
import { renderStatus, type StatusElements } from "./ui/status";
import { getAppTemplate } from "./ui/template";
import { renderTicketsTable, reorderTicketRows, resetTicketMatrixState, setTicketNumberState, updateTicketRowState, type TicketTableView } from "./ui/tickets";

type SortMode = "hits" | "fixed";
type ActiveTab = "control" | "tickets" | "management";
type Theme = "light" | "dark";

const app = querySelectorOrThrow<HTMLDivElement>("#app");
const calledNumbers = new Set<number>();
const totalNumbers = getTotalBingoNumbers(BINGO_MIN, BINGO_MAX);

let tickets: Ticket[] = [];
let editingTicketId: string | null = null;
let ticketTableView: TicketTableView = {
	rows: [],
	numberCellIndex: new Map<number, HTMLTableCellElement[]>(),
	tbody: document.createElement("tbody"),
};
let ticketHits: number[] = [];
let ticketIndexByNumber = new Map<number, number[]>();
let sortMode: SortMode = "hits";
let isAuthenticated = false;
let managementSearchTerm = "";

app.innerHTML = getAppTemplate(totalNumbers);

const tabControl = querySelectorOrThrow<HTMLButtonElement>("#tab-control", app);
const tabTickets = querySelectorOrThrow<HTMLButtonElement>("#tab-tickets", app);
const tabManagement = querySelectorOrThrow<HTMLButtonElement>("#tab-management", app);
const tabTicketsAlert = querySelectorOrThrow<HTMLElement>("#tab-tickets-alert", app);
const tabTicketsAlertLabel = querySelectorOrThrow<HTMLElement>("#tab-tickets-alert-label", app);
const panelControl = querySelectorOrThrow<HTMLElement>("#panel-control", app);
const panelTickets = querySelectorOrThrow<HTMLElement>("#panel-tickets", app);
const panelManagement = querySelectorOrThrow<HTMLElement>("#panel-management", app);

const grid = querySelectorOrThrow<HTMLDivElement>("#numbers-grid", app);
const clearBtn = querySelectorOrThrow<HTMLButtonElement>("#clear-btn", app);
const manualBtn = querySelectorOrThrow<HTMLButtonElement>("#manual-btn", app);
const manualInput = querySelectorOrThrow<HTMLInputElement>("#manual-number", app);
const helpTip = querySelectorOrThrow<HTMLElement>("#help-tip", app);
const themeToggleBtn = querySelectorOrThrow<HTMLButtonElement>("#theme-toggle-btn", app);
const themeToggleIcon = querySelectorOrThrow<HTMLElement>("#theme-toggle-icon", app);
const authOpenBtn = querySelectorOrThrow<HTMLButtonElement>("#auth-open-btn", app);
const authOpenIcon = querySelectorOrThrow<HTMLElement>("#auth-open-icon", app);
const authModal = querySelectorOrThrow<HTMLElement>("#auth-modal", app);
const authModalBackdrop = querySelectorOrThrow<HTMLButtonElement>("#auth-modal-backdrop", app);
const authCloseBtn = querySelectorOrThrow<HTMLButtonElement>("#auth-close-btn", app);
const authError = querySelectorOrThrow<HTMLElement>("#auth-error", app);
const authForm = querySelectorOrThrow<HTMLFormElement>("#auth-form", app);
const authUserInput = querySelectorOrThrow<HTMLInputElement>("#auth-user", app);
const authPassInput = querySelectorOrThrow<HTMLInputElement>("#auth-pass", app);
const authLoginBtn = querySelectorOrThrow<HTMLButtonElement>("#auth-login-btn", app);

const statusElements: StatusElements = {
	countLabel: querySelectorOrThrow<HTMLElement>("#count", app),
	pendingLabel: querySelectorOrThrow<HTMLElement>("#pending", app),
	calledList: querySelectorOrThrow<HTMLElement>("#called-list", app),
};

const completedCountLabel = querySelectorOrThrow<HTMLElement>("#completed-count", app);

const ticketsTotal = querySelectorOrThrow<HTMLElement>("#tickets-total", app);
const ticketsStateChip = querySelectorOrThrow<HTMLElement>("#tickets-state-chip", app);
const ticketsStateIcon = querySelectorOrThrow<HTMLElement>("#tickets-state-icon", app);
const ticketsStateText = querySelectorOrThrow<HTMLElement>("#tickets-state-text", app);
const ticketsInvalidList = querySelectorOrThrow<HTMLElement>("#tickets-invalid-list", app);
const ticketsBody = querySelectorOrThrow<HTMLTableSectionElement>("#tickets-body", app);
const sortHitsBtn = querySelectorOrThrow<HTMLButtonElement>("#sort-hits-btn", app);
const sortFixedBtn = querySelectorOrThrow<HTMLButtonElement>("#sort-fixed-btn", app);

const ticketModal = querySelectorOrThrow<HTMLElement>("#ticket-modal", app);
const ticketModalBackdrop = querySelectorOrThrow<HTMLButtonElement>("#ticket-modal-backdrop", app);
const ticketModalCloseBtn = querySelectorOrThrow<HTMLButtonElement>("#ticket-modal-close-btn", app);
const ticketModalTitle = querySelectorOrThrow<HTMLElement>("#ticket-modal-title", app);
const openTicketModalBtn = querySelectorOrThrow<HTMLButtonElement>("#open-ticket-modal-btn", app);
const ticketForm = querySelectorOrThrow<HTMLFormElement>("#ticket-form", app);
const ticketIdInput = querySelectorOrThrow<HTMLInputElement>("#ticket-id-input", app);
const ticketNameInput = querySelectorOrThrow<HTMLInputElement>("#ticket-name-input", app);
const ticketNumbersInput = querySelectorOrThrow<HTMLInputElement>("#ticket-numbers-input", app);
const ticketFormError = querySelectorOrThrow<HTMLElement>("#ticket-form-error", app);
const ticketClearFormBtn = querySelectorOrThrow<HTMLButtonElement>("#ticket-clear-form-btn", app);
const toast = querySelectorOrThrow<HTMLElement>("#toast", app);
const managementTicketsBody = querySelectorOrThrow<HTMLTableSectionElement>("#management-tickets-body", app);
const managementCount = querySelectorOrThrow<HTMLElement>("#management-count", app);
const managementSearchInput = querySelectorOrThrow<HTMLInputElement>("#management-search", app);
const managementSearchClearBtn = querySelectorOrThrow<HTMLButtonElement>("#management-search-clear", app);
const bulkModal = querySelectorOrThrow<HTMLElement>("#bulk-modal", app);
const bulkModalBackdrop = querySelectorOrThrow<HTMLButtonElement>("#bulk-modal-backdrop", app);
const bulkModalCloseBtn = querySelectorOrThrow<HTMLButtonElement>("#bulk-modal-close-btn", app);
const openBulkModalBtn = querySelectorOrThrow<HTMLButtonElement>("#open-bulk-modal-btn", app);
const bulkInput = querySelectorOrThrow<HTMLTextAreaElement>("#bulk-input", app);
const bulkLoadBtn = querySelectorOrThrow<HTMLButtonElement>("#bulk-load-btn", app);
const bulkClearBtn = querySelectorOrThrow<HTMLButtonElement>("#bulk-clear-btn", app);
const bulkError = querySelectorOrThrow<HTMLElement>("#bulk-error", app);
const deleteAllBtn = querySelectorOrThrow<HTMLButtonElement>("#delete-all-btn", app);

const HELP_TEXT = {
	control: "Toca un numero para marcarlo o desmarcarlo. Tambien puedes cargarlo manualmente y limpiar la partida cuando quieras.",
	tickets: "Explora cartones con orden por aciertos o ID fijo. El encabezado y la columna ID quedan fijos mientras recorres la tabla.",
	management: "Gestiona cartones con alta, edicion y borrado. Las acciones impactan de inmediato en la vista de Cartones.",
};

const updateHelpTip = (tab: ActiveTab): void => {
	if (tab === "tickets") {
		helpTip.textContent = HELP_TEXT.tickets;
		return;
	}

	if (tab === "management") {
		helpTip.textContent = HELP_TEXT.management;
		return;
	}

	helpTip.textContent = HELP_TEXT.control;
};

const updateSortButtons = (): void => {
	sortHitsBtn.classList.toggle("is-active", sortMode === "hits");
	sortFixedBtn.classList.toggle("is-active", sortMode === "fixed");
	sortHitsBtn.setAttribute("aria-pressed", String(sortMode === "hits"));
	sortFixedBtn.setAttribute("aria-pressed", String(sortMode === "fixed"));
};

const setProtectedTabsVisibility = (visible: boolean): void => {
	tabTickets.hidden = !visible;
	tabManagement.hidden = !visible;
};

const updateTabs = (nextTab: ActiveTab): void => {
	const showControl = nextTab === "control";
	const showTickets = nextTab === "tickets";
	const showManagement = nextTab === "management";

	tabControl.classList.toggle("is-active", showControl);
	tabControl.setAttribute("aria-selected", String(showControl));
	tabTickets.classList.toggle("is-active", showTickets);
	tabTickets.setAttribute("aria-selected", String(showTickets));
	tabManagement.classList.toggle("is-active", showManagement);
	tabManagement.setAttribute("aria-selected", String(showManagement));

	panelControl.hidden = !showControl;
	panelTickets.hidden = !showTickets;
	panelManagement.hidden = !showManagement;
	app.classList.toggle("is-tickets-view", showTickets);
	app.classList.toggle("is-management-view", showManagement);
	updateHelpTip(nextTab);
};

const refreshStatus = (): void => {
	renderStatus(statusElements, calledNumbers, totalNumbers);
};

const getRankedTicketIndexes = (): number[] => {
	const ranked = ticketHits.map((hits, index) => ({ hits, index }));

	ranked.sort((a, b) => {
		if (sortMode === "hits" && b.hits !== a.hits) {
			return b.hits - a.hits;
		}

		return tickets[a.index].id.localeCompare(tickets[b.index].id, undefined, {
			numeric: true,
			sensitivity: "base",
		});
	});

	return ranked.map((item) => item.index);
};

const updateTicketsTabAlert = (completedIds: string[]): void => {
	const hasCompletedTickets = completedIds.length > 0;
	const { label, detail } = formatCompletedTicketsAlert(completedIds);

	tabTickets.classList.toggle("has-alert", hasCompletedTickets);
	tabTicketsAlert.hidden = !hasCompletedTickets;
	tabTicketsAlertLabel.hidden = !hasCompletedTickets;
	tabTicketsAlertLabel.textContent = label;

	if (hasCompletedTickets) {
		tabTickets.title = detail;
		// El nombre accesible arranca con el texto visible de la pestaña (WCAG "label in name").
		tabTickets.setAttribute("aria-label", `Cartones. ${detail}`);
		return;
	}

	tabTickets.removeAttribute("title");
	tabTickets.removeAttribute("aria-label");
};

const updateCompletedCount = (): void => {
	// tickets ya viene ordenado por ID (sortTicketsById), asi que el primer completo es el menor.
	const completedIds = tickets.filter((_, index) => ticketHits[index] === 15).map((ticket) => ticket.id);
	completedCountLabel.textContent = String(completedIds.length);
	updateTicketsTabAlert(completedIds);
};

const resetTicketForm = (): void => {
	ticketForm.reset();
	editingTicketId = null;
	ticketModalTitle.textContent = "Cargar carton";
};

const clearTicketFormMessages = (): void => {
	ticketFormError.hidden = true;
};

const FIELD_LABELS: Record<"id" | "name" | "numbers", string> = {
	id: "ID",
	name: "Nombre",
	numbers: "Numeros",
};

const showTicketFormError = (message: string, field?: "id" | "name" | "numbers"): void => {
	ticketFormError.textContent = field ? `${FIELD_LABELS[field]}: ${message}` : message;
	ticketFormError.hidden = false;
};

const showTicketFormErrors = (invalidTickets: InvalidTicket[]): void => {
	const list = document.createElement("ul");
	list.className = "bulk-preview-list";

	invalidTickets.forEach((invalid) => {
		const item = document.createElement("li");
		const fieldLabel = invalid.field ? FIELD_LABELS[invalid.field] : "Formato";
		item.textContent = `${fieldLabel}: ${invalid.reason}`;
		list.appendChild(item);
	});

	ticketFormError.innerHTML = "";
	ticketFormError.appendChild(list);
	ticketFormError.hidden = false;
};

let toastTimeoutId: number | undefined;

const showToast = (message: string, variant: "success" | "error" = "success"): void => {
	toast.textContent = message;
	toast.classList.toggle("is-error", variant === "error");
	toast.classList.add("is-visible");

	if (toastTimeoutId) {
		window.clearTimeout(toastTimeoutId);
	}

	toastTimeoutId = window.setTimeout(() => {
		toast.classList.remove("is-visible");
	}, 3200);
};

const clearBulkMessages = (): void => {
	bulkError.hidden = true;
	bulkError.innerHTML = "";
};

const showBulkError = (message: string): void => {
	bulkError.textContent = message;
	bulkError.hidden = false;
};

const showBulkFieldErrors = (invalidTickets: InvalidTicket[]): void => {
	const list = document.createElement("ul");
	list.className = "bulk-preview-list";

	invalidTickets.forEach((invalid) => {
		const item = document.createElement("li");
		const fieldLabel = invalid.field ? FIELD_LABELS[invalid.field] : "Formato";
		item.textContent = `Carton ${invalid.index + 1}: ${fieldLabel} — ${invalid.reason}`;
		list.appendChild(item);
	});

	bulkError.innerHTML = "";
	bulkError.appendChild(list);
	bulkError.hidden = false;
};

const openAuthModal = (): void => {
	authModal.hidden = false;
	authUserInput.focus();
};

const closeAuthModal = (): void => {
	authModal.hidden = true;
};

const openTicketModal = (mode: "create" | "edit", ticket?: Ticket): void => {
	clearTicketFormMessages();

	if (mode === "edit" && ticket) {
		editingTicketId = ticket.id;
		ticketIdInput.value = ticket.id;
		ticketNameInput.value = ticket.name ?? "";
		ticketNumbersInput.value = ticket.numbers.join(", ");
		ticketModalTitle.textContent = `Editar carton ${ticket.id}`;
	} else {
		resetTicketForm();
	}

	ticketModal.hidden = false;
	ticketIdInput.focus();
};

const closeTicketModal = (): void => {
	ticketModal.hidden = true;
	resetTicketForm();
	clearTicketFormMessages();
};

const openBulkModal = (): void => {
	bulkModal.hidden = false;
};

const closeBulkModal = (): void => {
	bulkModal.hidden = true;
	bulkInput.value = "";
	clearBulkMessages();
};

const clearAuthError = (): void => {
	authError.hidden = true;
	authError.textContent = "";
};

const showAuthError = (message: string): void => {
	authError.textContent = message;
	authError.hidden = false;
};

const getLoginErrorMessage = (error: unknown): string => {
	if (error instanceof ApiError) {
		if (error.status === 401) {
			return "Usuario o clave incorrectos.";
		}

		if (error.status === 404) {
			return "El servicio de ingreso no esta disponible en este entorno.";
		}
	}

	return "No se pudo iniciar sesion. Intenta nuevamente.";
};

const setAuthUi = (nextAuth: boolean): void => {
	isAuthenticated = nextAuth;
	authForm.hidden = nextAuth;
	authOpenIcon.innerHTML = nextAuth ? authIcons.logout : authIcons.login;
	authOpenBtn.classList.toggle("is-logout", nextAuth);
	authOpenBtn.setAttribute("aria-label", nextAuth ? "Cerrar sesion" : "Abrir ingreso");
	authOpenBtn.title = nextAuth ? "Cerrar sesion" : "Ingreso";
	clearAuthError();
	setProtectedTabsVisibility(nextAuth);

	if (!nextAuth) {
		updateTabs("control");
		closeAuthModal();
		cancelIdleExpiry();
	}
};

// Marcas diacriticas combinantes (U+0300 a U+036F): se quitan para que "jose" matchee "José".
const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

const normalizeSearchText = (value: string): string =>
	value
		.toLowerCase()
		.normalize("NFD")
		.replace(DIACRITICS_PATTERN, "");

const matchesManagementSearch = (ticket: Ticket, term: string): boolean =>
	normalizeSearchText(ticket.id).includes(term) || normalizeSearchText(ticket.name ?? "").includes(term);

// Va pegado al titulo "Cartones actuales", asi que el numero solo ya se entiende.
const renderManagementCount = (visibleCount: number): void => {
	managementCount.textContent = managementSearchTerm.length > 0 ? `${visibleCount} de ${tickets.length}` : String(tickets.length);
};

const clearManagementSearch = (): void => {
	managementSearchTerm = "";
	managementSearchInput.value = "";
	managementSearchClearBtn.hidden = true;
};

const createManagementEmptyRow = (): HTMLTableRowElement => {
	const row = document.createElement("tr");
	const cell = document.createElement("td");
	cell.colSpan = 4;
	cell.className = "management-empty";
	cell.textContent =
		managementSearchTerm.length > 0
			? `Sin resultados para "${managementSearchInput.value.trim()}".`
			: "No hay cartones cargados.";
	row.appendChild(cell);

	return row;
};

const renderManagementRows = (): void => {
	managementTicketsBody.innerHTML = "";
	const fragment = document.createDocumentFragment();
	const visibleTickets =
		managementSearchTerm.length > 0 ? tickets.filter((ticket) => matchesManagementSearch(ticket, managementSearchTerm)) : tickets;

	renderManagementCount(visibleTickets.length);

	if (visibleTickets.length === 0) {
		managementTicketsBody.appendChild(createManagementEmptyRow());
		return;
	}

	visibleTickets.forEach((ticket) => {
		const row = document.createElement("tr");

		const idCell = document.createElement("td");
		idCell.textContent = ticket.id;

		const nameCell = document.createElement("td");
		nameCell.textContent = ticket.name ?? "-";

		const numbersCell = document.createElement("td");

		const numbersText = document.createElement("span");
		numbersText.className = "mgmt-numbers-text";
		numbersText.textContent = ticket.numbers.join(", ");

		const numbersGrid = document.createElement("div");
		numbersGrid.className = "mgmt-numbers-grid";
		ticket.numbers.forEach((value) => {
			const chip = document.createElement("span");
			chip.className = "mgmt-number-chip";
			chip.textContent = String(value);
			numbersGrid.appendChild(chip);
		});

		numbersCell.append(numbersText, numbersGrid);

		const actionsCell = document.createElement("td");
		const actionsWrap = document.createElement("div");
		actionsWrap.className = "management-actions";

		const editBtn = document.createElement("button");
		editBtn.type = "button";
		editBtn.className = "row-icon-btn";
		editBtn.innerHTML = actionIcons.edit;
		editBtn.setAttribute("aria-label", `Editar carton ${ticket.id}`);
		editBtn.title = "Editar";
		editBtn.addEventListener("click", () => {
			openTicketModal("edit", ticket);
		});

		const deleteBtn = document.createElement("button");
		deleteBtn.type = "button";
		deleteBtn.className = "row-icon-btn is-danger";
		deleteBtn.innerHTML = actionIcons.delete;
		deleteBtn.setAttribute("aria-label", `Borrar carton ${ticket.id}`);
		deleteBtn.title = "Borrar";
		deleteBtn.addEventListener("click", async () => {
			const confirmed = window.confirm(`Vas a borrar el carton ${ticket.id}. Esta accion no se puede deshacer. ¿Continuar?`);

			if (!confirmed) {
				return;
			}

			try {
				await deleteTicket(ticket.id);
				await reloadTicketsAndViews();
			} catch (error) {
				handleError(error, "No se pudo borrar el carton.");
			}
		});

		actionsWrap.appendChild(editBtn);
		actionsWrap.appendChild(deleteBtn);
		actionsCell.appendChild(actionsWrap);

		row.appendChild(idCell);
		row.appendChild(nameCell);
		row.appendChild(numbersCell);
		row.appendChild(actionsCell);
		fragment.appendChild(row);
	});

	managementTicketsBody.appendChild(fragment);
};

const recalculateTicketHits = (): void => {
	ticketHits = tickets.map((ticket) => countTicketHits(ticket, calledNumbers));

	ticketHits.forEach((hits, index) => {
		updateTicketRowState(ticketTableView, index, hits, hits === 15);
	});

	reorderTicketRows(ticketTableView, getRankedTicketIndexes());

	updateCompletedCount();
};

const syncTicketNumberHighlights = (): void => {
	calledNumbers.forEach((value) => {
		setTicketNumberState(ticketTableView, value, true);
	});
};

const clearRound = (): void => {
	clearCalledNumbers(calledNumbers);
	resetGridSelection(grid);
	resetTicketMatrixState(ticketTableView);
	recalculateTicketHits();
	refreshStatus();
};

const rebuildTicketIndexes = (): void => {
	ticketIndexByNumber = new Map<number, number[]>();

	tickets.forEach((ticket, index) => {
		ticket.numbers.forEach((value) => {
			const indexes = ticketIndexByNumber.get(value) ?? [];
			indexes.push(index);
			ticketIndexByNumber.set(value, indexes);
		});
	});
};

const updateTicketHitsByToggle = (value: number, isNowMarked: boolean): void => {
	const impactedIndexes = ticketIndexByNumber.get(value) ?? [];

	impactedIndexes.forEach((ticketIndex) => {
		const nextHits = ticketHits[ticketIndex] + (isNowMarked ? 1 : -1);
		const boundedHits = Math.min(15, Math.max(0, nextHits));
		ticketHits[ticketIndex] = boundedHits;
		updateTicketRowState(ticketTableView, ticketIndex, boundedHits, boundedHits === 15);
	});

	reorderTicketRows(ticketTableView, getRankedTicketIndexes());

	updateCompletedCount();
};

const applyNumberToggle = (value: number, isNowMarked: boolean): void => {
	if (isNowMarked) {
		calledNumbers.add(value);
	} else {
		calledNumbers.delete(value);
	}

	setTicketNumberState(ticketTableView, value, isNowMarked);
	updateTicketHitsByToggle(value, isNowMarked);
	refreshStatus();
};

const renderTicketLoadStatus = (invalidRows: string[]): void => {
	const invalidCount = invalidRows.length;
	const summaryDetail = invalidRows.join(" | ");

	ticketsTotal.textContent = String(tickets.length);
	ticketsStateChip.classList.toggle("is-ok", invalidCount === 0);
	ticketsStateChip.classList.toggle("is-error", invalidCount > 0);
	ticketsStateChip.setAttribute("aria-label", invalidCount === 0 ? "Sin errores de carga" : `Errores de carga detectados: ${invalidCount}`);
	ticketsStateChip.setAttribute("title", invalidCount === 0 ? "Sin errores de carga" : summaryDetail);

	if (invalidCount === 0) {
		ticketsStateIcon.textContent = "✓";
		ticketsStateText.textContent = "Sin errores";
		ticketsInvalidList.textContent = "Sin errores de carga.";
		return;
	}

	ticketsStateIcon.textContent = "!";
	ticketsStateText.textContent = `${invalidCount} error${invalidCount > 1 ? "es" : ""}`;
	ticketsInvalidList.textContent = `Invalidos: ${summaryDetail}`;
};

const SESSION_EXPIRED_STORAGE_KEY = "bingo-session-expired";
const THEME_STORAGE_KEY = "bingo-theme";

// El tema inicial ya lo resuelve el script inline de index.html, antes del primer paint.
const getCurrentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

const readStoredTheme = (): Theme | null => {
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
		return stored === "dark" || stored === "light" ? stored : null;
	} catch {
		return null;
	}
};

const applyTheme = (theme: Theme, persist: boolean): void => {
	const isDark = theme === "dark";
	document.documentElement.dataset.theme = theme;
	themeToggleIcon.innerHTML = isDark ? themeIcons.light : themeIcons.dark;
	themeToggleBtn.setAttribute("aria-label", isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
	themeToggleBtn.title = isDark ? "Modo claro" : "Modo oscuro";

	if (!persist) {
		return;
	}

	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Modo privado o storage bloqueado: el tema vale para esta sesion y no se persiste.
	}
};

const initializeTheme = (): void => {
	applyTheme(getCurrentTheme(), false);

	const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
	darkQuery.addEventListener("change", (event) => {
		// Solo seguimos al sistema mientras el usuario no haya elegido explicitamente.
		if (readStoredTheme() === null) {
			applyTheme(event.matches ? "dark" : "light", false);
		}
	});
};

const forceSessionExpired = (): void => {
	window.sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, "1");
	window.location.reload();
};

const handleUnauthorized = (error: unknown): boolean => {
	if (error instanceof ApiError && error.status === 401) {
		forceSessionExpired();
		return true;
	}

	return false;
};

// La sesion vive por inactividad (el Worker renueva la cookie en cada request autenticada), pero
// llenar el formulario de un carton no genera requests. Este ping convierte la interaccion real del
// usuario en actividad para el servidor.
const SESSION_KEEPALIVE_THROTTLE_MS = 5 * 60_000;
let lastSessionTouchAt = 0;
let sessionTouchInFlight = false;

// Ademas del ping, un timer local dispara el cierre por su cuenta al vencer la inactividad, sin
// esperar a que el usuario vuelva a tocar la pantalla: evita dejar cartones (datos sensibles) visibles
// en una pantalla desatendida. El ping sigue siendo el respaldo que confirma contra el servidor.
const DEFAULT_SESSION_TTL_MINUTES = 30;
let sessionTtlMinutes = DEFAULT_SESSION_TTL_MINUTES;
let idleTimeoutId: number | undefined;

const scheduleIdleExpiry = (): void => {
	if (idleTimeoutId) {
		window.clearTimeout(idleTimeoutId);
	}
	idleTimeoutId = window.setTimeout(forceSessionExpired, sessionTtlMinutes * 60_000);
};

const cancelIdleExpiry = (): void => {
	if (idleTimeoutId) {
		window.clearTimeout(idleTimeoutId);
		idleTimeoutId = undefined;
	}
};

const touchSession = (): void => {
	if (!isAuthenticated || sessionTouchInFlight) {
		return;
	}

	const now = Date.now();
	if (now - lastSessionTouchAt < SESSION_KEEPALIVE_THROTTLE_MS) {
		return;
	}

	sessionTouchInFlight = true;
	lastSessionTouchAt = now;

	void getSession()
		.then((session) => {
			// El servidor responde 200 con authenticated:false cuando la cookie ya vencio, no 401.
			if (!session.authenticated) {
				forceSessionExpired();
			}
		})
		.catch(() => {
			// Sin red no cerramos sesion: se reintenta en la proxima interaccion pasado el throttle.
		})
		.finally(() => {
			sessionTouchInFlight = false;
		});
};

const onUserActivity = (): void => {
	// El timer local mide "tiempo desde la ultima interaccion" sin el throttle del ping, para que el
	// cierre proactivo no se corra por eso.
	if (isAuthenticated) {
		scheduleIdleExpiry();
	}
	touchSession();
};

const initializeSessionKeepalive = (): void => {
	// Solo interaccion intencional: un mousemove (o un mouse que se mueve solo) no deberia mantener
	// viva la sesion. `capture` para que dispare aunque un handler corte la propagacion.
	const options: AddEventListenerOptions = { passive: true, capture: true };
	document.addEventListener("pointerdown", onUserActivity, options);
	document.addEventListener("keydown", onUserActivity, options);
	document.addEventListener("visibilitychange", () => {
		// Al volver a la pestaña conviene detectar el vencimiento antes de que el usuario tipee un
		// carton entero y lo pierda en el reload del Guardar.
		if (document.visibilityState === "visible") {
			onUserActivity();
		}
	});
};

const checkSessionExpiredNotice = (): void => {
	if (window.sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY)) {
		window.sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
		showToast("La sesion expiro. Inicia sesion nuevamente.", "error");
	}
};

function handleError(error: unknown, fallbackMessage: string): void {
	if (handleUnauthorized(error)) {
		return;
	}

	if (error instanceof ApiError) {
		renderTicketLoadStatus([error.message]);
		return;
	}

	if (error instanceof Error) {
		renderTicketLoadStatus([error.message]);
		return;
	}

	renderTicketLoadStatus([fallbackMessage]);
}

const reloadTicketsAndViews = async (): Promise<void> => {
	try {
		tickets = sortTicketsById(await fetchTicketsFromApi());

		rebuildTicketIndexes();
		ticketTableView = renderTicketsTable(ticketsBody, tickets);
		ticketHits = tickets.map((ticket) => countTicketHits(ticket, calledNumbers));
		recalculateTicketHits();
		syncTicketNumberHighlights();
		renderManagementRows();
		renderTicketLoadStatus([]);
		// Esta request ya renovo la cookie del lado del servidor: no hace falta un ping ademas.
		lastSessionTouchAt = Date.now();
		scheduleIdleExpiry();
	} catch (error) {
		handleError(error, "No se pudo cargar cartones desde la API.");
	}
};

const initializeSession = async (): Promise<void> => {
	try {
		const session = await getSession();

		if (!session.authenticated) {
			setAuthUi(false);
			return;
		}

		sessionTtlMinutes = session.ttlMinutes ?? DEFAULT_SESSION_TTL_MINUTES;
		setAuthUi(true);
		await reloadTicketsAndViews();
	} catch {
		setAuthUi(false);
	}
};

renderNumbersGrid(grid, (value, isNowMarked) => {
	applyNumberToggle(value, isNowMarked);
});

clearBtn.addEventListener("click", () => {
	clearRound();
	manualInput.focus();
});

manualBtn.addEventListener("click", () => {
	const parsed = Number(manualInput.value);

	if (!isValidBingoNumber(parsed)) {
		manualInput.focus();
		return;
	}

	const isNowMarked = toggleCalledNumber(calledNumbers, parsed, BINGO_MIN, BINGO_MAX);
	setNumberButtonState(grid, parsed, isNowMarked);
	setTicketNumberState(ticketTableView, parsed, isNowMarked);
	updateTicketHitsByToggle(parsed, isNowMarked);
	refreshStatus();
	manualInput.value = "";
	manualInput.focus();
});

manualInput.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		manualBtn.click();
	}
});

authForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	const username = authUserInput.value.trim();
	const password = authPassInput.value;

	if (!username || !password) {
		showAuthError("Completa usuario y clave.");
		return;
	}

	clearAuthError();

	authLoginBtn.disabled = true;

	try {
		const session = await login({ username, password });
		sessionTtlMinutes = session.ttlMinutes ?? DEFAULT_SESSION_TTL_MINUTES;
		setAuthUi(true);
		authUserInput.value = "";
		authPassInput.value = "";
		await reloadTicketsAndViews();
		closeAuthModal();
		updateTabs("tickets");
	} catch (error) {
		showAuthError(getLoginErrorMessage(error));
	} finally {
		authLoginBtn.disabled = false;
	}
});

const handleLogout = async (): Promise<void> => {
	try {
		await logout();
	} finally {
		setAuthUi(false);
		tickets = [];
		// Sin esto ticketHits queda con los aciertos de la sesion anterior y el aviso de la pestaña
		// sigue nombrando un carton que ya no esta cargado.
		ticketHits = [];
		rebuildTicketIndexes();
		clearManagementSearch();
		ticketTableView = renderTicketsTable(ticketsBody, tickets);
		updateCompletedCount();
		renderManagementRows();
		renderTicketLoadStatus([]);
	}
};

authOpenBtn.addEventListener("click", () => {
	if (isAuthenticated) {
		void handleLogout();
		return;
	}

	openAuthModal();
});

managementSearchInput.addEventListener("input", () => {
	managementSearchTerm = normalizeSearchText(managementSearchInput.value.trim());
	managementSearchClearBtn.hidden = managementSearchInput.value.length === 0;
	renderManagementRows();
});

managementSearchClearBtn.addEventListener("click", () => {
	clearManagementSearch();
	renderManagementRows();
	managementSearchInput.focus();
});

themeToggleBtn.addEventListener("click", () => {
	applyTheme(getCurrentTheme() === "dark" ? "light" : "dark", true);
});

authCloseBtn.addEventListener("click", () => {
	closeAuthModal();
});

authModalBackdrop.addEventListener("click", () => {
	closeAuthModal();
});

openTicketModalBtn.addEventListener("click", () => {
	openTicketModal("create");
});

ticketModalCloseBtn.addEventListener("click", () => {
	closeTicketModal();
});

ticketModalBackdrop.addEventListener("click", () => {
	closeTicketModal();
});

openBulkModalBtn.addEventListener("click", () => {
	openBulkModal();
});

bulkModalCloseBtn.addEventListener("click", () => {
	closeBulkModal();
});

bulkModalBackdrop.addEventListener("click", () => {
	closeBulkModal();
});

document.addEventListener("keydown", (event) => {
	if (event.key !== "Escape") {
		return;
	}

	if (!authModal.hidden) {
		closeAuthModal();
		return;
	}

	if (!ticketModal.hidden) {
		closeTicketModal();
		return;
	}

	if (!bulkModal.hidden) {
		closeBulkModal();
	}
});

tabControl.addEventListener("click", () => {
	updateTabs("control");
});

tabTickets.addEventListener("click", () => {
	if (!isAuthenticated) {
		return;
	}

	updateTabs("tickets");
});

tabManagement.addEventListener("click", () => {
	if (!isAuthenticated) {
		return;
	}

	updateTabs("management");
});

sortHitsBtn.addEventListener("click", () => {
	sortMode = "hits";
	updateSortButtons();
	reorderTicketRows(ticketTableView, getRankedTicketIndexes());
});

sortFixedBtn.addEventListener("click", () => {
	sortMode = "fixed";
	updateSortButtons();
	reorderTicketRows(ticketTableView, getRankedTicketIndexes());
});

ticketForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	clearTicketFormMessages();

	const payload = {
		tickets: [
			{
				id: ticketIdInput.value,
				name: ticketNameInput.value,
				numbers: parseTicketNumbersInput(ticketNumbersInput.value),
			},
		],
	};

	const existingIds = new Set(tickets.filter((existing) => existing.id !== editingTicketId).map((existing) => existing.id));
	const parsed = parseTicketsPayload(payload, existingIds);
	if (parsed.tickets.length === 0) {
		showTicketFormErrors(parsed.invalidTickets);
		return;
	}

	const ticket = parsed.tickets[0];

	try {
		const wasEditing = Boolean(editingTicketId);

		if (editingTicketId) {
			await updateTicket(editingTicketId, ticket);
		} else {
			await createTicket(ticket);
		}

		closeTicketModal();
		showToast(wasEditing ? `Carton ${ticket.id} actualizado.` : `Carton ${ticket.id} cargado.`);
		await reloadTicketsAndViews();
	} catch (error) {
		if (handleUnauthorized(error)) {
			return;
		}

		const message = error instanceof ApiError || error instanceof Error ? error.message : "No se pudo guardar el carton.";
		showTicketFormError(message);
	}
});

ticketClearFormBtn.addEventListener("click", () => {
	resetTicketForm();
	clearTicketFormMessages();
});

bulkLoadBtn.addEventListener("click", async () => {
	clearBulkMessages();

	const existingIds = new Set(tickets.map((existing) => existing.id));

	let parsed;
	try {
		parsed = parseBulkTicketsInput(bulkInput.value, existingIds);
	} catch (error) {
		showBulkError(error instanceof Error ? error.message : "No se pudo analizar el bloque de carga masiva.");
		return;
	}

	if (parsed.invalidTickets.length > 0) {
		showBulkFieldErrors(parsed.invalidTickets);
		return;
	}

	if (parsed.tickets.length === 0) {
		showBulkError("No se encontraron cartones para cargar.");
		return;
	}

	try {
		await importTickets(parsed.tickets);
		const count = parsed.tickets.length;
		closeBulkModal();
		showToast(`Se cargaron ${count} cartones.`);
		await reloadTicketsAndViews();
	} catch (error) {
		if (handleUnauthorized(error)) {
			return;
		}

		showBulkError(error instanceof ApiError || error instanceof Error ? error.message : "No se pudo aplicar la carga masiva.");
	}
});

bulkClearBtn.addEventListener("click", () => {
	bulkInput.value = "";
	clearBulkMessages();
});

deleteAllBtn.addEventListener("click", async () => {
	const token = window.prompt('Para confirmar, escribe exactamente: BORRAR TODO');

	if (token !== "BORRAR TODO") {
		return;
	}

	const approved = window.confirm("Se eliminaran todos los cartones cargados. Esta accion no se puede deshacer. ¿Confirmas?");
	if (!approved) {
		return;
	}

	try {
		await deleteAllTickets(token);
		resetTicketForm();
		await reloadTicketsAndViews();
	} catch (error) {
		handleError(error, "No se pudo borrar todo.");
	}
});

checkSessionExpiredNotice();
void initializeSession();
initializeSessionKeepalive();
initializeTheme();
updateSortButtons();
refreshStatus();
updateHelpTip("control");
setProtectedTabsVisibility(false);
renderManagementRows();
