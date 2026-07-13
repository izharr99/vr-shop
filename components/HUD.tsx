"use client";

import { useApp } from "@/lib/store";
import { byId } from "@/lib/catalog";
import { xrStore } from "./scene/World";

export default function HUD() {
  const {
    measurements,
    worn,
    cart,
    toast,
    checkoutOpen,
    orderPlaced,
    addToCart,
    removeFromCart,
    setCheckoutOpen,
    placeOrder,
  } = useApp();

  const wornItems = Object.values(worn)
    .filter((id): id is string => !!id)
    .map(byId)
    .filter((i) => !!i);
  const cartItems = cart.map(byId).filter((i) => !!i);
  const total = cartItems.reduce((s, i) => s + i.price, 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {/* size chip */}
      {measurements && (
        <div className="absolute left-4 top-4 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur">
          Your fit: shirt <b>{measurements.shirtSize}</b> · waist{" "}
          <b>{measurements.pantsWaist}&quot;</b> · {measurements.build} build
        </div>
      )}

      {/* cart + VR buttons */}
      <div className="pointer-events-auto absolute right-4 top-4 flex gap-2">
        <button
          onClick={() => xrStore.enterVR()}
          className="rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur transition hover:bg-black/90"
        >
          Enter VR
        </button>
        <button
          onClick={() => setCheckoutOpen(true)}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          🛒 Cart ({cart.length})
        </button>
      </div>

      {/* controls hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white/80 backdrop-blur">
        WASD / arrows to walk · drag to turn · click clothes to try on · check the fitting mirror
      </div>

      {/* wearing panel */}
      {wornItems.length > 0 && (
        <div className="pointer-events-auto absolute bottom-14 left-4 w-64 rounded-2xl bg-black/70 p-4 text-white backdrop-blur">
          <h3 className="mb-2 text-sm font-semibold text-white/70">Wearing now</h3>
          {wornItems.map((item) => (
            <div key={item.id} className="mb-2 flex items-center justify-between text-sm">
              <span>
                {item.name} <span className="text-white/60">${item.price}</span>
              </span>
              {cart.includes(item.id) ? (
                <span className="text-xs text-emerald-400">in cart ✓</span>
              ) : (
                <button
                  onClick={() => addToCart(item.id)}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold transition hover:bg-emerald-500"
                >
                  Add to cart
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700/90 px-6 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      {/* checkout modal */}
      {checkoutOpen && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-96 rounded-2xl bg-neutral-900 p-6 text-white shadow-2xl">
            <h2 className="mb-4 text-xl font-bold">Your cart</h2>
            {cartItems.length === 0 ? (
              <p className="text-neutral-400">Nothing here yet — try something on and add it.</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="mb-2 flex items-center justify-between text-sm">
                  <span>
                    {item.name} <span className="text-neutral-400">({item.brand})</span>
                  </span>
                  <span className="flex items-center gap-3">
                    ${item.price}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-neutral-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              ))
            )}
            {cartItems.length > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-neutral-700 pt-3 font-semibold">
                <span>Total</span>
                <span>${total}</span>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setCheckoutOpen(false)}
                className="flex-1 rounded-full border border-neutral-600 py-2.5 text-sm transition hover:bg-neutral-800"
              >
                Keep shopping
              </button>
              {cartItems.length > 0 && (
                <button
                  onClick={placeOrder}
                  className="flex-1 rounded-full bg-indigo-600 py-2.5 text-sm font-semibold transition hover:bg-indigo-500"
                >
                  Place order (demo)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* order confirmation */}
      {orderPlaced && !checkoutOpen && (
        <div className="pointer-events-auto absolute left-1/2 top-16 -translate-x-1/2 rounded-2xl bg-emerald-700/95 px-6 py-3 text-white shadow-xl">
          🎉 Order placed! (Demo — no payment taken.)
        </div>
      )}
    </div>
  );
}
