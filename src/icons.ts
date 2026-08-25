import { icon, library } from "@fortawesome/fontawesome-svg-core";
import { faFileImport, faMagnifyingGlass, faMoon, faPenToSquare, faRightFromBracket, faRightToBracket, faSquarePlus, faSun, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";

library.add(faRightToBracket, faRightFromBracket, faXmark, faPenToSquare, faTrash, faSquarePlus, faFileImport, faMagnifyingGlass, faSun, faMoon);

export const authIcons = {
	login: icon(faRightToBracket).html.join(""),
	logout: icon(faRightFromBracket).html.join(""),
	close: icon(faXmark).html.join(""),
};

export const actionIcons = {
	edit: icon(faPenToSquare).html.join(""),
	delete: icon(faTrash).html.join(""),
	addOne: icon(faSquarePlus).html.join(""),
	addMany: icon(faFileImport).html.join(""),
	search: icon(faMagnifyingGlass).html.join(""),
};

// El icono representa el tema al que se cambia al tocar el boton, no el tema actual.
export const themeIcons = {
	light: icon(faSun).html.join(""),
	dark: icon(faMoon).html.join(""),
};
