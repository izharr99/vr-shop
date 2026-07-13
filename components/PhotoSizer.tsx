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
        <div className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 p-6 text-left">
          <h2 className="mb-3 text-lg font-semibold">Your estimated fit</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm text-neutral-300">
            <li>Shirt size: <b className="text-white">{result.shirtSize}</b></li>
            <li>Pants waist: <b className="text-white">{result.pantsWaist}&quot;</b></li>
            <li>Chest: ~{result.chestIn}&quot;</li>
            <li>Waist: ~{result.waistIn}&quot;</li>
            <li>Hips: ~{result.hipIn}&quot;</li>
            <li>Build: {result.build}</li>
          </ul>
          <p className="mt-3 text-xs text-neutral-500">
            Estimates from body proportions — shops will recommend sizes based on these.
          </p>
          <button
            onClick={() => setStage("avatar")}
            className="mt-4 w-full rounded-full bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500"
          >
            Looks right → Create my avatar
          </button>
        </div>
      )}
    </div>
  );
}
