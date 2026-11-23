import { useSyncExternalStore } from "react";

/** Small remembered choices (sound off, welcome seen, last door). Never required to work. */
const read = (store: "local" | "session", key: string): string | null => {
  try {
    return (store === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null; // private mode or storage blocked
  }
};

export function remember(store: "local" | "session", key: string, value: string): void {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    // not remembered; nothing breaks
  }
}

const never = () => () => {};

/** The stored value once the page runs in the browser; `null` on the server. */
export function useStored(store: "local" | "session", key: string): string | null {
  return useSyncExternalStore(
    never,
    () => read(store, key),
    () => null,
  );
}
