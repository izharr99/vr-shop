export type Slot = "top" | "bottom" | "hat";

export interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  slot: Slot;
  color: string;
  accent?: string;
  shop: "street" | "formal";
}

/**
 * Generic demo catalog. When brand sponsors come on board, their items
 * (with real 3D assets) slot in here with the same shape.
 */
export const CATALOG: CatalogItem[] = [
  // Streetwear shop
  { id: "tee-red", name: "Classic Tee", brand: "Generic Co", price: 19, slot: "top", color: "#c0392b", shop: "street" },
  { id: "tee-blue", name: "Ocean Tee", brand: "Generic Co", price: 19, slot: "top", color: "#2471a3", shop: "street" },
  { id: "hoodie-green", name: "Forest Hoodie", brand: "Urban Basics", price: 49, slot: "top", color: "#1e8449", accent: "#145a32", shop: "street" },
  { id: "hoodie-black", name: "Night Hoodie", brand: "Urban Basics", price: 49, slot: "top", color: "#212121", accent: "#111111", shop: "street" },
  { id: "jeans-blue", name: "Denim Jeans", brand: "Generic Co", price: 39, slot: "bottom", color: "#34495e", shop: "street" },
  { id: "joggers-grey", name: "Street Joggers", brand: "Urban Basics", price: 29, slot: "bottom", color: "#7f8c8d", shop: "street" },
  { id: "cap-red", name: "Snapback Cap", brand: "Urban Basics", price: 15, slot: "hat", color: "#e74c3c", shop: "street" },

  // Formal shop
  { id: "shirt-white", name: "Oxford Shirt", brand: "Tailored", price: 45, slot: "top", color: "#ecf0f1", accent: "#bdc3c7", shop: "formal" },
  { id: "blazer-navy", name: "Navy Blazer", brand: "Tailored", price: 129, slot: "top", color: "#1a2942", accent: "#0f1a2e", shop: "formal" },
  { id: "shirt-pink", name: "Rose Shirt", brand: "Tailored", price: 45, slot: "top", color: "#d98880", shop: "formal" },
  { id: "slacks-grey", name: "Wool Slacks", brand: "Tailored", price: 79, slot: "bottom", color: "#4d5656", shop: "formal" },
  { id: "chinos-tan", name: "Tan Chinos", brand: "Tailored", price: 59, slot: "bottom", color: "#b9905f", shop: "formal" },
  { id: "fedora", name: "Felt Fedora", brand: "Tailored", price: 35, slot: "hat", color: "#5d4037", shop: "formal" },
];

export const byId = (id: string) => CATALOG.find((i) => i.id === id);
