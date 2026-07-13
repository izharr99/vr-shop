"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

const RPM_URL =
  "https://demo.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody";

/** Stock avatar so the demo works without completing the RPM flow. */
const DEFAULT_AVATAR =
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb";

export default function AvatarCreator() {
  const { setAvatarUrl, setStage } = useApp();

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      let data: { source?: string; eventName?: string; data?: { url?: string } };
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.source !== "readyplayerme") return;
      if (data.eventName === "v1.avatar.exported" && data.data?.url) {
        setAvatarUrl(data.data.url);
        setStage("world");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setAvatarUrl, setStage]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between border-b border-neutral-800 p-4">
        <div>
          <h1 className="text-xl font-bold">Create your avatar</h1>
          <p className="text-sm text-neutral-400">
            Take a selfie in the creator — your face goes on your avatar. When
            you hit <b>Done/Next</b> inside, you&apos;ll enter the mall automatically.
          </p>
        </div>
        <button
          onClick={() => {
            setAvatarUrl(DEFAULT_AVATAR);
            setStage("world");
          }}
          className="shrink-0 rounded-full border border-neutral-600 px-5 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800"
        >
          Skip — use default avatar
        </button>
      </div>
      <iframe
        src={RPM_URL}
        allow="camera *; microphone *"
        className="w-full flex-1"
        title="Ready Player Me avatar creator"
      />
    </div>
  );
}
