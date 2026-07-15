import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { CatalogItem } from "./catalog";

export type BodyBuild = "slim" | "average" | "broad" | "heavy";

export interface Measurements {
  chestIn: number;
  waistIn: number;
  hipIn: number;
  shoulderIn: number;
  shirtSize: "S" | "M" | "L" | "XL" | "XXL";
  pantsWaist: number;
  build: BodyBuild;
  /** 0.9 (slim) → 1.3 (heavy), drives avatar body morph */
  buildFactor: number;
}

export type AppStage = "landing" | "photo" | "world";
export type ViewMode = "follow" | "front";
/** -1 = one size tighter than recommended, 0 = your size, +1 = looser */
export type SizeDelta = -1 | 0 | 1;

interface AppState {
  stage: AppStage;
  measurements: Measurements | null;
  avatarUrl: string;
  /** itemId per slot currently worn */
  worn: Partial<Record<CatalogItem["slot"], string>>;
  /** per worn slot: trying a different size than recommended */
  sizeDelta: Partial<Record<CatalogItem["slot"], SizeDelta>>;
  cart: string[];
  checkoutOpen: boolean;
  orderPlaced: boolean;
  toast: string | null;
  /** camera: follow behind avatar, or swung around to face them */
  viewMode: ViewMode;
  /** avatar doing a slow 360° turn */
  spinning: boolean;

  setStage: (s: AppStage) => void;
  setMeasurements: (m: Measurements) => void;
  setAvatarUrl: (u: string) => void;
  wear: (item: CatalogItem) => void;
  setSizeDelta: (slot: CatalogItem["slot"], d: SizeDelta) => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  setCheckoutOpen: (open: boolean) => void;
  placeOrder: () => void;
  showToast: (msg: string) => void;
  setViewMode: (v: ViewMode) => void;
  setSpinning: (s: boolean) => void;
}

export const useApp: UseBoundStore<StoreApi<AppState>> = create<AppState>((set, get) => ({
  stage: "landing",
  measurements: null,
  avatarUrl: "/avatars/mannequin.glb",
  worn: {},
  sizeDelta: {},
  cart: [],
  checkoutOpen: false,
  orderPlaced: false,
  toast: null,
  viewMode: "follow",
  spinning: false,

  setStage: (stage) => set({ stage }),
  setMeasurements: (measurements) => set({ measurements }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  wear: (item) =>
    set((s) => {
      const takingOff = s.worn[item.slot] === item.id;
      return {
        worn: { ...s.worn, [item.slot]: takingOff ? undefined : item.id },
        sizeDelta: { ...s.sizeDelta, [item.slot]: 0 as SizeDelta },
        // trying something on swings the camera around so you see yourself
        viewMode: takingOff ? s.viewMode : "front",
      };
    }),
  setSizeDelta: (slot, d) =>
    set((s) => ({ sizeDelta: { ...s.sizeDelta, [slot]: d } })),
  addToCart: (id) => {
    if (!get().cart.includes(id)) set((s) => ({ cart: [...s.cart, id] }));
  },
  removeFromCart: (id) =>
    set((s) => ({ cart: s.cart.filter((c) => c !== id) })),
  setCheckoutOpen: (checkoutOpen) => set({ checkoutOpen }),
  placeOrder: () => set({ orderPlaced: true, cart: [], checkoutOpen: false }),
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 3500);
  },
  setViewMode: (viewMode) => set({ viewMode }),
  setSpinning: (spinning) => set({ spinning }),
}));

// dev/test hook
if (typeof window !== "undefined") {
  (window as unknown as { __app: typeof useApp }).__app = useApp;
}
