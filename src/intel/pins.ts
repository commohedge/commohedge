export const INTEL_PINS_STORAGE_KEY = "intel_workspace_sidebar_pins_v1";
export const INTEL_PINS_UPDATED_EVENT = "intel_pins_updated";

export type IntelPinnedPanel = {
  /** Unique panel id, e.g. "world-map", "market-news", "commodity-energy" */
  id: string;
  /** User-visible title (stored to keep stable even if config changes) */
  title: string;
  /** ISO time for ordering/debug */
  pinnedAt: string;
};

export function readIntelPins(): IntelPinnedPanel[] {
  try {
    const raw = localStorage.getItem(INTEL_PINS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x: any) => x && typeof x.id === "string" && typeof x.title === "string")
      .map((x: any) => ({ id: x.id, title: x.title, pinnedAt: typeof x.pinnedAt === "string" ? x.pinnedAt : "" }));
  } catch {
    return [];
  }
}

export function writeIntelPins(next: IntelPinnedPanel[]) {
  try {
    localStorage.setItem(INTEL_PINS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new Event(INTEL_PINS_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

export function addIntelPin(pin: Omit<IntelPinnedPanel, "pinnedAt">) {
  const current = readIntelPins();
  if (current.some((p) => p.id === pin.id)) return;
  writeIntelPins([...current, { ...pin, pinnedAt: new Date().toISOString() }]);
}

export function removeIntelPin(id: string) {
  const current = readIntelPins();
  writeIntelPins(current.filter((p) => p.id !== id));
}

