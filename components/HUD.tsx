"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, type SizeDelta } from "@/lib/store";
import { byId, type CatalogItem } from "@/lib/catalog";
import { moveState } from "@/lib/moveState";
import { xrStore } from "./scene/World";

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

function sizeLabelFor(item: CatalogItem, rec: string, d: SizeDelta): string {
  if (item.slot === "bottom") {
    const w = parseInt(rec, 10);
    return `W${w + d * 2}`;
  }
  const i = SHIRT_SIZES.indexOf(rec);
  return SHIRT_SIZES[Math.min(SHIRT_SIZES.length - 1, Math.max(0, i + d))] ?? rec;
}

const FIT_HINTS: Record<SizeDelta, { label: string; cls: string }> = {
  [-1]: { label: "runs tight on you", cls: "text-amber-400" },
  [0]: { label: "fits you perfectly", cls: "text-emerald-400" },
  [1]: { label: "relaxed, loose fit", cls: "text-sky-400" },
};

export default function HUD() {
  const {
    measurements,
    worn,
    sizeDelta,
    cart,
    toast,
    checkoutOpen,
    orderPlaced,
    viewMode,
    spinning,
    addToCart,
    removeFromCart,
    setCheckoutOpen,
    placeOrder,
    setSizeDelta,
    setViewMode,
    setSpinning,
  } = useApp();

  const wornItems = Object.values(worn)
    .filter((id): id is string => !!id)
    .map(byId)
    .filter((i) => !!i);
  const cartItems = cart.map(byId).filter((i) => !!i);
  const total = cartItems.reduce((s, i) => s + i.price, 0);
  const outfitTotal = wornItems.reduce((s, i) => s + i.price, 0);

  const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;

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
        {isTouch
          ? "joystick to walk · drag to turn · tap clothes to try on"
          : "WASD / arrows to walk · drag to turn · click clothes to try on"}
      </div>

      {/* fitting-room panel */}
      {wornItems.length > 0 && (
        <div className="pointer-events-auto absolute bottom-14 left-4 w-72 rounded-2xl bg-black/75 p-4 text-white shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/70">
              {viewMode === "front" ? "Fitting room" : "Wearing now"}
            </h3>
            <div className="flex gap-1.5">
              <button
                title="Slow 360° turn"
                onClick={() => {
                  setViewMode("front");
                  setSpinning(!spinning);
                }}
                className={`rounded-full px-2.5 py-1 text-xs transition ${
                  spinning
                    ? "bg-indigo-500 text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {spinning ? "◼ stop" : "↻ 360°"}
              </button>
              <button
                title={viewMode === "front" ? "Back to walking view" : "See yourself from the front"}
                onClick={() => setViewMode(viewMode === "front" ? "follow" : "front")}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 transition hover:bg-white/20"
              >
                {viewMode === "front" ? "walk view" : "face me"}
              </button>
            </div>
          </div>

          {wornItems.map((item) => {
            const d = (sizeDelta[item.slot] ?? 0) as SizeDelta;
            const rec =
              item.slot === "bottom"
                ? String(measurements?.pantsWaist ?? 32)
                : (measurements?.shirtSize ?? "M");
            return (
              <div key={item.id} className="mb-2.5 border-b border-white/10 pb-2 last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {item.name} <span className="text-white/50">${item.price}</span>
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
                {item.slot !== "hat" && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {([-1, 0, 1] as SizeDelta[]).map((dd) => (
                      <button
                        key={dd}
                        onClick={() => {
                          setSizeDelta(item.slot, dd);
                          setViewMode("front");
                        }}
                        className={`min-w-9 rounded-md px-2 py-0.5 text-xs transition ${
                          d === dd
                            ? "bg-white text-black font-semibold"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {sizeLabelFor(item, rec, dd)}
                        {dd === 0 && <span className="ml-0.5 text-[9px] align-top">★</span>}
                      </button>
                    ))}
                    <span className={`ml-1 text-[11px] ${FIT_HINTS[d].cls}`}>
                      {FIT_HINTS[d].label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-1 flex items-center justify-between text-sm font-semibold">
            <span className="text-white/60">Outfit total</span>
            <span>${outfitTotal}</span>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 animate-toast-in rounded-2xl border border-white/10 bg-neutral-900/95 px-6 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur">
          {toast}
        </div>
      )}

      {/* touch joystick */}
      {isTouch && <Joystick />}

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

      {/* order confirmation + confetti */}
      {orderPlaced && !checkoutOpen && (
        <>
          <Confetti />
          <div className="pointer-events-auto absolute left-1/2 top-16 -translate-x-1/2 animate-toast-in rounded-2xl bg-emerald-700/95 px-6 py-3 text-white shadow-xl">
            🎉 Order placed! Your new look is on its way. (Demo — no payment taken.)
          </div>
        </>
      )}
    </div>
  );
}

/** Lightweight CSS confetti burst — no dependencies. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        dur: 2.2 + Math.random() * 1.6,
        color: ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#facc15"][i % 6],
        size: 6 + Math.random() * 6,
        spin: Math.random() > 0.5 ? 1 : -1,
      })),
    []
  );
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 4500);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-20px] block animate-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.55,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--spin" as string]: `${p.spin * 720}deg`,
          }}
        />
      ))}
    </div>
  );
}

/** On-screen joystick for phones/tablets — writes into moveState. */
function Joystick() {
  const pad = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pad.current;
    const kn = knob.current;
    if (!el || !kn) return;
    let active = false;
    const R = 44;
    const setFrom = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = (e.clientX - cx) / R;
      let dy = (e.clientY - cy) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      moveState.touchX = dx;
      moveState.touchZ = dy;
      kn.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
    };
    const down = (e: PointerEvent) => {
      active = true;
      el.setPointerCapture(e.pointerId);
      setFrom(e);
      e.stopPropagation();
    };
    const move = (e: PointerEvent) => active && setFrom(e);
    const up = () => {
      active = false;
      moveState.touchX = 0;
      moveState.touchZ = 0;
      if (kn) kn.style.transform = "translate(0px, 0px)";
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, []);
  return (
    <div
      ref={pad}
      className="pointer-events-auto absolute bottom-16 right-8 h-28 w-28 touch-none rounded-full border border-white/20 bg-white/10 backdrop-blur"
    >
      <div
        ref={knob}
        className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-white/40 shadow-lg transition-transform duration-75"
      />
    </div>
  );
}
