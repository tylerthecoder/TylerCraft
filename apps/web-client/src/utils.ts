export function getEleOrError<T extends HTMLElement>(id: string): T {
  const ele = document.getElementById(id);
  if (!ele) throw new Error(`Could not find element with id ${id}`);
  return ele as T;
}

export function hideElement(e: HTMLElement) {
  e.style.display = "none";
}
