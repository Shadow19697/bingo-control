export type StatusElements = {
  countLabel: HTMLElement;
  pendingLabel: HTMLElement;
  calledList: HTMLElement;
};

export function renderStatus(
  elements: StatusElements,
  calledNumbers: Set<number>,
  totalNumbers: number
): void {
  const chronological = Array.from(calledNumbers);
  const count = chronological.length;

  elements.countLabel.textContent = String(count);
  elements.pendingLabel.textContent = String(totalNumbers - count);
  elements.calledList.textContent =
    count > 0 ? `Salida: ${chronological.join(', ')}` : 'Aun no hay numeros marcados.';
}
