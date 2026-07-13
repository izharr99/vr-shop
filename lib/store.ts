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

interface AppState {
  stage: AppStage;
  measurements: Measurements | null;
  avatarUrl: string;
  /** itemId per slot currently worn */
  worn: Partial<Record<CatalogItem["slot"], string>>;
  cart: string[];
  checkoutOpen: boolean;
  orderPlaced: boolean;
  toast: string | null;

  setStage: (s: AppStage) => void;
  setMeasurements: (m: Measurements) => void;
  setAvatarUrl: (u: string) => void;
  wear: (item: CatalogItem) => void;
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  setCheckoutOpen: (open: boolean) => void;
  placeOrder: () => void;
  showToast: (msg: string) => void;
}

export const useApp: UseBoundStore<StoreApi<AppState>> = create<AppState>((set, get) => ({
  stage: "landing",
  measurements: null,
  avatarUrl: "/avatars/mannequin.glb",
  worn: {},
  cart: [],
  checkoutOpen: false,
  orderPlaced: false,
  toast: null,

  setStage: (stage) => set({ stage }),
  setMeasurements: (measurements) => set({ measurements }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  wear: (item) =>
    set((s) => ({
      worn:
        s.worn[item.slot] === item.id
          ? { ...s.worn, [item.slot]: undefined }
          : { ...s.worn, [item.slot]: item.id },
    })),
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
}));

// dev/test hook
if (typeof window !== "undefined") {
  (window as unknown as { __app: typeof useApp }).__app = useApp;
}
