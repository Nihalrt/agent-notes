export const CARD_COLORS = [
  { bg: "bg-lilac", ink: "text-lilacDeep" },
  { bg: "bg-sage", ink: "text-sageDeep" },
  { bg: "bg-peach", ink: "text-peachDeep" },
  { bg: "bg-sky", ink: "text-skyDeep" },
];

export const AGENTS = [
  { key: "extract", label: "Extractor", dot: "bg-peachDeep" },
  { key: "context", label: "Archivist", dot: "bg-skyDeep" },
  { key: "draft", label: "Drafter", dot: "bg-lilacDeep" },
];

// Widths at/above which we switch to the desktop shell (persistent sidebar +
// header) instead of the phone shell (header + bottom nav).
export const DESKTOP_BREAKPOINT = 900;
