export function querySelectorOrThrow<T extends Element>(
  selector: string,
  parent: ParentNode = document
): T {
  const element = parent.querySelector<T>(selector);

  if (!element) {
    throw new Error(`No se encontro el elemento requerido: ${selector}`);
  }

  return element;
}
