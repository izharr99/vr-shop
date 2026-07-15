"use client";

import { useRef, useState } from "react";
import { useApp, type Measurements } from "@/lib/store";
import { estimateFromPhoto, SizingError } from "@/lib/sizing";

export default function PhotoSizer() {
  const { setMeasurements, setStage } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Measurements | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setBusy(true);
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const m = await estimateFromPhoto(img);
      setResult(m);
      setMeasurements(m);
    } catch (e) {
      setError(
        e instanceof SizingError
          ? e.message
          : "Analysis failed — try another photo with better lighting."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">Get sized</h1>
      <p className="text-neutral-400">
        Upload a head-to-toe photo (a full mirror selfie works great). It&apos;s
        analyzed <strong className="text-neutral-200">on your device</strong> —
        the photo is never uploaded anywhere.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Your upload"
          className="max-h-72 rounded-xl border border-neutral-700 object-contain"
        />
      )}

      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-full bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? "Measuring…" : preview ? "Try another photo" : "Upload photo"}
      </button>

      {error && <p className="text-red-400">{error}</p>}

      {result && (
        <div className="w-full animate-card-in rounded-2xl border border-emerald-800/60 bg-neutral-900 p-6 text-left shadow-[0_0_40px_-12px_rgba(16,185,129,0.45)]">
          <div className="mb-4 text-center">
            <div className="text-4xl">✨</div>
            <h2 className="mt-1 text-2xl font-bold text-white">
              You&apos;re a size <span className="text-emerald-400">{result.shirtSize}</span>
            </h2>
            <p className="text-sm text-neutral-400">
              measured on your device — your photo never left this browser
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-2 text-sm text-neutral-300">
            <li>Shirt size: <b className="text-white">{result.shirtSize}</b></li>
            <li>Pants waist: <b className="text-white">{result.pantsWaist}&quot;</b></li>
            <li>Chest: ~{result.chestIn}&quot;</li>
            <li>Waist: ~{result.waistIn}&quot;</li>
            <li>Hips: ~{result.hipIn}&quot;</li>
            <li>Build: {result.build}</li>
          </ul>
          <p className="mt-3 text-xs text-neutral-500">
            Every rack in the mall now shows prices in <b>your</b> size, and the
            avatar in the mirror is shaped like you.
          </p>
          <button
            onClick={() => setStage("world")}
            className="mt-4 w-full rounded-full bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500"
          >
            Looks right → Enter the mall
          </button>
        </div>
      )}
    </div>
  );
}
