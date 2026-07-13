"use client";

import { useApp } from "@/lib/store";

export default function Landing() {
  const setStage = useApp((s) => s.setStage);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div>
        <h1 className="text-5xl font-black tracking-tight">
          VR&nbsp;<span className="text-indigo-500">MALL</span>
        </h1>
        <p className="mt-3 max-w-md text-lg text-neutral-400">
          Walk into shops, try clothes on <i>your</i> body, and buy — in VR or
          right in your browser.
        </p>
      </div>
      <ol className="space-y-2 text-left text-neutral-300">
        <li>1 · Upload a full-body photo — we estimate your sizes on-device</li>
        <li>2 · Selfie → your face on your avatar</li>
        <li>3 · Walk the mall, try on clothes in the fitting mirror, check out</li>
      </ol>
      <button
        onClick={() => setStage("photo")}
        className="rounded-full bg-indigo-600 px-10 py-4 text-lg font-bold text-white transition hover:bg-indigo-500"
      >
        Start shopping
      </button>
      <p className="text-xs text-neutral-600">
        Works on desktop (WASD + mouse) and any WebXR headset browser — no install.
      </p>
    </div>
  );
}
