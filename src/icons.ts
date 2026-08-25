import { icon, library } from "@fortawesome/fontawesome-svg-core";
import { faFileImport, faPenToSquare, faRightFromBracket, faRightToBracket, faSquarePlus, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";

library.add(faRightToBracket, faRightFromBracket, faXmark, faPenToSquare, faTrash, faSquarePlus, faFileImport);

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
};