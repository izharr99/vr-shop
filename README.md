# VR Mall — try on clothes in VR

A free WebXR shopping demo: upload a full-body photo, get sized automatically
(on-device, the photo never leaves your browser), then walk a virtual mall,
try clothes on an avatar shaped like you, and check out. Runs on desktop
(WASD + mouse) and in any WebXR headset browser (Meta Quest etc.) from a URL —
no install.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- **Desktop**: WASD/arrows to walk, drag to turn, click clothes to try on.
- **VR**: open the deployed URL in the Quest browser and hit **Enter VR**.

## How sizing works

MediaPipe (pose landmarks + person segmentation) runs client-side on the
uploaded photo. Absolute measurements from a single photo are impossible
without a reference scale, so we measure **width-to-height ratios** at the
shoulder/chest/waist/hip lines — which reliably separate slim from heavy
builds — then project estimate numbers (chest, waist, shirt size, pant waist)
using average-height anthropometrics. The same ratios drive the avatar's
body morph, so the person in the mirror matches your build.

## Stack ($0)

- Next.js + React Three Fiber + drei + `@react-three/xr` (WebXR)
- `@mediapipe/tasks-vision` for on-device sizing
- Bundled rigged character (`public/avatars/mannequin.glb`, Mixamo Xbot) with
  idle/walk animations — no third-party avatar API dependency
- Zustand for state; deploys free on Vercel

> Note: the original plan used Ready Player Me for selfie-face avatars, but
> RPM shut down its public platform on Jan 31, 2026 (Netflix acquisition).
> Face likeness is now a v2 item (Avatar SDK / Avaturn are candidate vendors).

## Roadmap (sponsor phase)

- Real branded 3D garments replacing the procedural meshes
  (`components/scene/Garment.tsx`); catalog shape is ready in `lib/catalog.ts`
- Face likeness from selfie (paid avatar vendor)
- Better measurement extraction (multi-photo / calibrated capture)
- Real checkout (Stripe), inventory, multiplayer shopping
