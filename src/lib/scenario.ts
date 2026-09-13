import { useSyncExternalStore } from "react";
import type { Region } from "./estimate";

export type Scenario = {
  employees: number;
  years: number;
  country: Region;
  brief: string;
};
let scenario: Scenario | null = null;
const listeners = new Set<() => void>();
export function setScenario(next: Scenario) {
  scenario = next;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
// Retain the selection in memory even if the form hydrates after the calculator.
export function useScenario() {
  return useSyncExternalStore(
    subscribe,
    () => scenario,
    () => null,
  );
}
