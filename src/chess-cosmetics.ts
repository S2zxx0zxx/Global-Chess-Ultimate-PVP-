// Kytric CC0 board palette sampled from original GLTF triangle UV palette.
// Reversed border variants retain correct chess square orientation (a1 dark).
export const BOARD_VARIANTS = [
  {
    "id": "bg-black-tan",
    "label": "Black / Tan",
    "light": "#d7b991",
    "dark": "#313335",
    "border": "#313335",
    "trim": "#d7b991",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-black-white",
    "label": "Black / White",
    "light": "#cfcbc8",
    "dark": "#313335",
    "border": "#313335",
    "trim": "#cfcbc8",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-brown-tan",
    "label": "Brown / Tan",
    "light": "#d7b991",
    "dark": "#4e2e1f",
    "border": "#4e2e1f",
    "trim": "#d7b991",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-brown-white",
    "label": "Brown / White",
    "light": "#cfcbc8",
    "dark": "#4e2e1f",
    "border": "#4e2e1f",
    "trim": "#cfcbc8",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-red-tan",
    "label": "Red / Tan",
    "light": "#d7b991",
    "dark": "#5c1616",
    "border": "#5c1616",
    "trim": "#d7b991",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-red-white",
    "label": "Red / White",
    "light": "#cfcbc8",
    "dark": "#5c1616",
    "border": "#5c1616",
    "trim": "#cfcbc8",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-tan-black",
    "label": "Tan / Black",
    "light": "#d7b991",
    "dark": "#313335",
    "border": "#d7b991",
    "trim": "#313335",
    "note": "Kytric CC0 board"
  },
  {
    "id": "bg-white-black",
    "label": "White / Black",
    "light": "#cfcbc8",
    "dark": "#313335",
    "border": "#cfcbc8",
    "trim": "#313335",
    "note": "Kytric CC0 board"
  }
] as const;
export type BoardSkin='wood'|'ivory'|'onyx'|'stone'|typeof BOARD_VARIANTS[number]['id'];
export const NEW_MODELS = [
  {
    "id": "voxel",
    "name": "Voxel Light",
    "notes": "Bundled Kytric low-poly · black/white"
  },
  {
    "id": "voxel-wood",
    "name": "Voxel Wood",
    "notes": "Bundled Kytric low-poly · brown/tan"
  },
  {
    "id": "premium-low",
    "name": "Classic Low Poly",
    "notes": "Optional original FBX pack"
  },
  {
    "id": "premium-low-fantasy",
    "name": "Fantasy Low Poly",
    "notes": "Optional original FBX pack with accessories"
  },
  {
    "id": "premium-high",
    "name": "Classic High Poly",
    "notes": "Optional high-memory FBX; explicit selection"
  },
  {
    "id": "premium-high-fantasy",
    "name": "Fantasy High Poly",
    "notes": "Optional high-memory FBX; explicit selection"
  }
] as const;
export type ThreeTheme='deco'|'bauhaus'|'scifi'|'egypt'|'classic'|typeof NEW_MODELS[number]['id'];
export const PREMIUM_IDS=['premium-low','premium-low-fantasy','premium-high','premium-high-fantasy'] as const;
export function isPremium(theme:ThreeTheme):theme is typeof PREMIUM_IDS[number]{return (PREMIUM_IDS as readonly string[]).includes(theme);}
export function isVoxel(theme:ThreeTheme){return theme==='voxel'||theme==='voxel-wood';}
export function boardVariant(skin:BoardSkin){return BOARD_VARIANTS.find(v=>v.id===skin);}
