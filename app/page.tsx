"use client";

import dynamic from "next/dynamic";
import { useApp } from "@/lib/store";
import Landing from "@/components/Landing";
import PhotoSizer from "@/components/PhotoSizer";
import AvatarCreator from "@/components/AvatarCreator";
import HUD from "@/components/HUD";

const World = dynamic(() => import("@/components/scene/World"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-neutral-400">
      Loading the mall…
    </div>
  ),
});

export default function Home() {
  const stage = useApp((s) => s.stage);

  if (stage === "landing") return <Landing />;
  if (stage === "photo") return <PhotoSizer />;
  if (stage === "avatar") return <AvatarCreator />;

  return (
    <main className="fixed inset-0">
      <World />
      <HUD />
    </main>
  );
}
