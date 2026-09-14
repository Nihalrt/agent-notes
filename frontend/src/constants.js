export const DESKTOP_BREAKPOINT = 960;
export const TABLET_BREAKPOINT = 700;

const TAG_PALETTE = [
  { bg: "bg-lilac", ink: "text-lilacDeep" },
  { bg: "bg-sage", ink: "text-sageDeep" },
  { bg: "bg-peach", ink: "text-peachDeep" },
  { bg: "bg-sky", ink: "text-skyDeep" },
];

export function tagColor(tag = "") {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
  }
  return TAG_PALETTE[Math.abs(hash) % TAG_PALETTE.length];
}
