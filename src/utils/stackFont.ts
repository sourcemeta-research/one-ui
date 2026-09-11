export const STACK_FONT_KEY = "one-ui.stackFont";

export const STACK_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Inter (sans-serif)", value: "'Inter', ui-sans-serif, sans-serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', ui-monospace, monospace" },
  { label: "Fira Code", value: "'Fira Code', ui-monospace, monospace" },
  { label: "Consolas", value: "Consolas, ui-monospace, monospace" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "System Monospace", value: "ui-monospace, monospace" },
];

export const getStoredStackFont = (): string =>
  localStorage.getItem(STACK_FONT_KEY) ?? STACK_FONT_OPTIONS[0].value;
