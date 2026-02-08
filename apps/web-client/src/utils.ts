export function getEleOrError<T extends HTMLElement>(id: string): T {
  const ele = document.getElementById(id);
  if (!ele) throw new Error(`Could not find element with id ${id}`);
  return ele as T;
}

export function getEle<T extends HTMLElement>(id: string): T | undefined {
  const ele = document.getElementById(id);
  if (!ele) {
    return undefined;
  }
  return ele as T;
}

// export function hideElement(e: HTMLElement) {
//   e.style.display = "none";
// }

export function showElement(e: HTMLElement) {
  e.classList.remove("hidden");
  e.classList.add("shown");
}

export function hideElement(e: HTMLElement) {
  e.classList.add("hidden");
  e.classList.remove("shown");
}

// generate your unique id
const UID_KEY = "tylercraft-user-id";
if (!localStorage.getItem(UID_KEY)) {
  const randomNum = Math.floor(Math.random() * 10000000);
  localStorage.setItem(UID_KEY, randomNum.toString());
}

export function getMyUid() {
  // check url for uid override
  const urlParams = new URLSearchParams(window.location.search);
  const uidOverride = urlParams.get("uid");
  if (uidOverride) {
    return Number(uidOverride);
  }

  const uid = Number(localStorage.getItem(UID_KEY));
  if (!uid) throw new Error("UID not defined");
  return uid;
}

export const IS_MOBILE = /Mobi/.test(window.navigator.userAgent);
console.log("Is Mobile: ", IS_MOBILE);

export async function task() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
