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

// Tag chips get a stable color derived from the tag string, so the same tag
// always looks the same across cards and the sidebar filter.
const TAG_PALETTE = [
  { bg: "bg-lilac", ink: "text-lilacDeep" },
  { bg: "bg-sage", ink: "text-sageDeep" },
  { bg: "bg-peach", ink: "text-peachDeep" },
  { bg: "bg-sky", ink: "text-skyDeep" },
];

export function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}
