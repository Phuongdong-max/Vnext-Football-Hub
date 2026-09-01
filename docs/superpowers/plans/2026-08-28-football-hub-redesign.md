# Football Hub Redesign Implementation Plan

> **Cập nhật 2026-09-01 — bản thiết kế này đã được thay thế.**
>
> Người dùng chọn áp dụng design system **VNEXT** (skill `vnext-ui`) cho toàn bộ app,
> thay cho ngôn ngữ thiết kế "Stadium Floodlights" mô tả bên dưới. Những gì đã đổi:
>
> - **Bảng màu**: dùng token VNEXT (cam `#e96620`, dark nâu-đen ấm `20 18% 6%`), khai báo
>   bằng HSL triplet trong `index.html` để hỗ trợ `bg-primary/10`. Không dùng palette
>   cam-xanh sân cỏ ở mục 2.1.
> - **Chữ**: Inter (body) + Space Grotesk (heading), thay Montserrat và Bebas Neue.
> - **3D**: không dùng Three.js / `@react-three/fiber` và không bật esbuild code-splitting.
>   Nền 3D là `components/StadiumField3D.tsx` — WebGL thuần, không thêm dependency, tự tắt
>   khi `prefers-reduced-motion` hoặc thiết bị yếu.
> - **Hiệu ứng**: theo ngân sách của `vnext-ui/references/effects.md` (tối đa 1 vùng nền
>   chuyển động mỗi màn) và checklist chống AI slop.
> - **Logo**: logo VNEXT chính thức ở header, favicon, màn tải và màn xác thực.
>
> Giữ nguyên từ bản này: việc gỡ giao diện Leaderboard (mục 5) và các non-goals ở mục 1.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire Vnext Football Hub UI to the "Stadium Floodlights" design system (pitch-green/orange-floodlight palette, real WebGL 3D on hero moments, CSS-3D depth elsewhere) and remove the Leaderboard UI while keeping its data model intact, then build/QA/deploy.

**Architecture:** Almost all components already read colors through Tailwind classes mapped to CSS custom properties (`--color-primary`, `--color-surface`, etc. in `index.html`), so updating those tokens re-skins most of the app automatically. On top of that token cascade, this plan adds: a WebGL 3D layer (Three.js + React Three Fiber) isolated to 3 hero moments with mandatory fallbacks, a shared CSS-3D utility (tilt/glass) for the remaining pages, a code-split build so the 3D bundle only loads where used, and removal of the Leaderboard display surface.

**Tech Stack:** React 19 (loaded via esm.sh import map, externalized from the bundle), Tailwind CDN with CSS-variable tokens, esbuild (custom `scripts/build.js` / `scripts/dev.js`), Firebase Hosting + Firestore. New deps: `three`, `@react-three/fiber`, `@react-three/drei`, `motion`.

**Spec:** `docs/superpowers/specs/2026-08-28-football-hub-redesign-design.md`

## Global Constraints

- One accent color (orange/gold floodlight family) used identically across all 8 pages — no page drifts to a different accent.
- Both light and dark themes must be fully designed and pass WCAG AA contrast — not just an inverted dark mode.
- Body font stays Montserrat; add one condensed/bold display font (Bebas Neue) for headings, scores, and countdown numbers only.
- Real WebGL 3D only on `pages/LandingPage.tsx`, `pages/CountdownPage.tsx`, `pages/TournamentPage.tsx` (champion moment). All other pages use CSS-3D only (tilt-hover, glass, layered shadow) — no WebGL on `MemberHomePage`, `TeamDividerPage`, `PlayerInfoPage`, `AdminDashboardPage`.
- Every WebGL scene must fall back to a static image/gradient when `prefers-reduced-motion: reduce`, on low-end devices (`navigator.deviceMemory < 4` or `navigator.hardwareConcurrency <= 4`), or when WebGL context creation fails.
- Do not change routing slugs except removing `/leaderboard`. Do not change the icon library (`components/icons/index.tsx`) — extend in the same hand-drawn SVG style if a new icon is needed.
- Do not add an automated test framework (explicit non-goal). Verification is manual per Task 20's checklist plus `npm run build` succeeding.
- Do not change Firebase data model, business logic, or existing i18n keys other than the leaderboard-only keys listed in Task 11.
- One corner-radius system: `rounded-2xl` for cards/panels, `rounded-full` for buttons/badges/pills — replace ad hoc `rounded-md`/`rounded-lg` on panel-level containers app-wide.

---

## Task 1: Add new dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `three`, `@react-three/fiber`, `@react-three/drei`, `motion` importable from any `.tsx` file in the project (bundled by esbuild — none of these are in the `external` list in `scripts/build.js`/`scripts/dev.js`).

- [ ] **Step 1: Install packages**

Run:
```bash
npm install three @react-three/fiber @react-three/drei motion
```

`react`/`react-dom` are not npm dependencies of this project (they're loaded from esm.sh via the import map in `index.html` and externalized in `scripts/build.js`/`scripts/dev.js`). `npm install` will print peer-dependency warnings for `@react-three/fiber` about missing `react`/`react-dom` — this is expected and safe to ignore, because esbuild's `external: ['react', 'react/*', 'react-dom/*', ...]` means those bare imports are left unresolved and satisfied at runtime by the browser's import map, not by `node_modules`.

- [ ] **Step 2: Verify install**

Run: `node -e "console.log(require('three/package.json').version, require('@react-three/fiber/package.json').version, require('@react-three/drei/package.json').version, require('motion/package.json').version)"`
Expected: four version strings printed, no error.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add three, react-three-fiber/drei, and motion dependencies"
```

---

## Task 2: New design tokens in `index.html`

**Files:**
- Modify: `index.html:56-73` (the `:root` and `html.dark` CSS variable blocks), `index.html:158-160` (font links)

**Interfaces:**
- Produces: `--color-primary`, `--color-secondary`, `--color-background`, `--color-surface`, `--color-text-primary`, `--color-text-secondary`, `--color-border` (existing variable names, new values), plus a `font-display` Tailwind font family available as `font-display` class (via `tailwind.config` extension in the same file).

- [ ] **Step 1: Replace the light/dark CSS variable blocks**

Replace the `:root { ... }` and `html.dark { ... }` blocks (`index.html:56-73`) with:

```css
      :root {
        --color-primary: #ea580c; /* Floodlight orange, day-match contrast */
        --color-secondary: #4b6358; /* Muted pitch sage */
        --color-background: #f4faf3; /* Fresh pitch-adjacent off-white */
        --color-surface: #ffffff;
        --color-text-primary: #0d2818;
        --color-text-secondary: #4b6358;
        --color-border: #d7e6dc;
        --color-accent-gold: #b45309; /* Trophy/badge accent, light mode */
      }
      html.dark {
        --color-primary: #fb923c; /* Stadium floodlight orange */
        --color-secondary: #9fb8a8;
        --color-background: #05140d; /* Near-black pitch green */
        --color-surface: #0d2818;
        --color-text-primary: #f4f9f2;
        --color-text-secondary: #9fb8a8;
        --color-border: rgba(255, 255, 255, 0.08);
        --color-accent-gold: #fbbf24;
      }
```

- [ ] **Step 2: Add the display font link and Tailwind font family**

Add this line right after the existing Montserrat `<link>` at `index.html:160`:

```html
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
```

In the `tailwind.config` script block (`index.html:26-28`), change:
```js
            fontFamily: {
              sans: ['Montserrat', 'sans-serif'],
            },
```
to:
```js
            fontFamily: {
              sans: ['Montserrat', 'sans-serif'],
              display: ['"Bebas Neue"', 'sans-serif'],
            },
            colors: {
              // ...existing color entries stay unchanged, this just documents accentGold is added below
            },
```
Also add `accentGold: 'var(--color-accent-gold)'` as a new entry inside the existing `colors: { ... }` object (next to `border: 'var(--color-border)',`) so `text-accentGold` / `bg-accentGold` become available Tailwind classes.

- [ ] **Step 3: Verify visually**

Run `npm run dev`, open `http://localhost:8000`, confirm the background/surface colors visibly changed to the new dark pitch-green theme (default OS/browser preference dependent — toggle via the existing theme button to check both light and dark). No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: apply Stadium Floodlights color tokens and display font"
```

---

## Task 3: Enable esbuild code splitting

**Files:**
- Modify: `scripts/build.js:65-83`
- Modify: `scripts/dev.js:20-37`

**Interfaces:**
- Produces: `dist/index.js` as the entry chunk (unchanged reference from `index.html`'s `<script type="module" src="/index.js">`), plus additional `dist/chunk-*.js` files auto-emitted for every `import()` dynamic import used by later tasks (Task 5/6's 3D scenes).

- [ ] **Step 1: Switch `scripts/build.js` to `outdir` + `splitting: true`**

In `scripts/build.js`, change the `esbuild.build({...})` call: replace
```js
  bundle: true,
  outfile: path.join(distDir, 'index.js'),
  platform: 'browser',
  format: 'esm',
```
with
```js
  bundle: true,
  outdir: distDir,
  splitting: true,
  platform: 'browser',
  format: 'esm',
```

- [ ] **Step 2: Switch `scripts/dev.js` to match (splitting requires `outdir`, not `write:false` + single `outfile`)**

`esbuild.context()`'s `serve()` needs real files on disk to serve split chunks correctly. Replace:
```js
  bundle: true,
  write: false,
  outfile: path.join(projectRoot, 'index.js'), // Served at /index.js from servedir root
  platform: 'browser',
  format: 'esm',
```
with:
```js
  bundle: true,
  outdir: projectRoot,
  splitting: true,
  platform: 'browser',
  format: 'esm',
```
Remove the now-inaccurate comment above `write: false` (the "keeps the bundle in memory" comment) since chunks are now written to disk under `projectRoot` for `ctx.serve()` to pick up — `.gitignore` already ignores build output patterns; verify `index.js` and any `chunk-*.js` at `projectRoot` are ignored (check `.gitignore`; add `/*.js` exclusions for `index.js`/`chunk-*.js` at repo root if not already covered, but do NOT ignore `scripts/*.js` — scope the ignore pattern to the specific generated filenames, e.g. add `/index.js` and `/chunk-*.js` lines if missing).

- [ ] **Step 3: Verify dev server still works**

Run `npm run dev`, open `http://localhost:8000` in a browser, confirm the app loads with no 404s in the Network tab and no console errors. Stop the server (Ctrl+C).

- [ ] **Step 4: Verify production build still works**

Run `npm run build`. Expected: "Build successful! Output in ./dist directory." with no errors. Confirm `dist/index.js` exists: `ls dist/index.js` (or `Test-Path dist/index.js` on Windows PowerShell).

- [ ] **Step 5: Commit**

```bash
git add scripts/build.js scripts/dev.js .gitignore
git commit -m "build: enable esbuild code splitting for lazy-loaded 3D chunks"
```

---

## Task 4: 3D capability hook and fallback boundary

**Files:**
- Create: `components/three/useCanRender3D.ts`
- Create: `components/three/Scene3DBoundary.tsx`

**Interfaces:**
- Produces: `useCanRender3D(): boolean` hook; `<Scene3DBoundary fallback={ReactNode} className?={string}>{children}</Scene3DBoundary>` component that renders `fallback` instead of `children` when 3D is unsupported/undesired, and wraps `children` in a `Suspense` (for `React.lazy`-loaded scene components) otherwise.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the capability hook**

```ts
// components/three/useCanRender3D.ts
import { useEffect, useState } from 'react';

export function useCanRender3D(): boolean {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCanRender(false);
      return;
    }

    const deviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    const isLowEndDevice =
      (deviceMemory !== undefined && deviceMemory < 4) ||
      (hardwareConcurrency !== undefined && hardwareConcurrency <= 4);
    if (isLowEndDevice) {
      setCanRender(false);
      return;
    }

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      setCanRender(Boolean(gl));
    } catch {
      setCanRender(false);
    }
  }, []);

  return canRender;
}
```

- [ ] **Step 2: Write the fallback boundary**

```tsx
// components/three/Scene3DBoundary.tsx
import React, { Suspense } from 'react';
import { useCanRender3D } from './useCanRender3D';

interface Scene3DBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}

export const Scene3DBoundary: React.FC<Scene3DBoundaryProps> = ({ children, fallback, className }) => {
  const canRender3D = useCanRender3D();

  if (!canRender3D) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </div>
  );
};
```

- [ ] **Step 3: Verify it compiles**

Run `npm run build`. Expected: success, no TypeScript/esbuild errors referencing the new files (these files aren't imported anywhere yet, so this only checks syntax).

- [ ] **Step 4: Commit**

```bash
git add components/three/useCanRender3D.ts components/three/Scene3DBoundary.tsx
git commit -m "feat: add WebGL capability detection and fallback boundary"
```

---

## Task 5: BallScene 3D component

**Files:**
- Create: `components/three/BallScene.tsx`

**Interfaces:**
- Consumes: `three`, `@react-three/fiber` (Task 1).
- Produces: default export `BallScene: React.FC` — a self-contained `<Canvas>` with a spinning floodlit ball, meant to be loaded via `React.lazy(() => import('../components/three/BallScene'))` so it becomes its own chunk under Task 3's splitting.

- [ ] **Step 1: Write the component**

```tsx
// components/three/BallScene.tsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SpinningBall: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.4, 1]} />
      <meshStandardMaterial
        color="#f4f9f2"
        emissive="#fb923c"
        emissiveIntensity={0.25}
        flatShading
        roughness={0.35}
        metalness={0.1}
      />
    </mesh>
  );
};

const BallScene: React.FC = () => (
  <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} dpr={[1, 1.5]}>
    <ambientLight intensity={0.4} />
    <spotLight position={[4, 6, 5]} angle={0.35} penumbra={0.5} intensity={2.2} color="#fbbf24" />
    <spotLight position={[-4, -2, 3]} angle={0.4} penumbra={0.6} intensity={1.1} color="#fb923c" />
    <SpinningBall />
  </Canvas>
);

export default BallScene;
```

- [ ] **Step 2: Verify it compiles**

Run `npm run build`. Expected: success (still unreferenced by any page, so this only checks syntax/types).

- [ ] **Step 3: Commit**

```bash
git add components/three/BallScene.tsx
git commit -m "feat: add BallScene WebGL hero component"
```

---

## Task 6: TrophyScene 3D component

**Files:**
- Create: `components/three/TrophyScene.tsx`

**Interfaces:**
- Consumes: `three`, `@react-three/fiber` (Task 1).
- Produces: default export `TrophyScene: React.FC`, loaded the same lazy way as `BallScene`.

- [ ] **Step 1: Write the component**

```tsx
// components/three/TrophyScene.tsx
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TrophyModel: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.65, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.7, 24]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.2, 32]} />
        <meshStandardMaterial color="#0d2818" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0.68, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[-0.68, 1.1, 0]} rotation={[0, Math.PI, -Math.PI / 2]}>
        <torusGeometry args={[0.22, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
};

const TrophyScene: React.FC = () => (
  <Canvas camera={{ position: [0, 1, 4.5], fov: 42 }} dpr={[1, 1.5]}>
    <ambientLight intensity={0.5} />
    <spotLight position={[3, 5, 4]} angle={0.4} penumbra={0.5} intensity={2.4} color="#fbbf24" />
    <spotLight position={[-3, -1, 3]} angle={0.5} penumbra={0.6} intensity={1} color="#fb923c" />
    <TrophyModel />
  </Canvas>
);

export default TrophyScene;
```

- [ ] **Step 2: Verify it compiles**

Run `npm run build`. Expected: success.

- [ ] **Step 3: Commit**

```bash
git add components/three/TrophyScene.tsx
git commit -m "feat: add TrophyScene WebGL champion-moment component"
```

---

## Task 7: Reskin `Button.tsx`

**Files:**
- Modify: `components/shared/Button.tsx:19`

**Interfaces:**
- Consumes: nothing new (still pure Tailwind + CSS-variable tokens from Task 2).
- Produces: same `Button` props/exports — no signature change, only class strings.

- [ ] **Step 1: Update base styles to the pill shape + glow-on-hover**

Replace line 19:
```tsx
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed';
```
with:
```tsx
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]';
```

Update the `primary` variant (line 22) to add a glow shadow consistent with the floodlight theme:
```tsx
    primary: 'bg-primary text-white hover:bg-opacity-90 hover:shadow-lg hover:shadow-primary/40 focus:ring-primary',
```
Leave `secondary`, `danger`, `warning`, `outline`, `ghost` variants and `sizeStyles` unchanged — only `baseStyles` and `primary` change.

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open any page with a primary button (e.g. Header's theme toggle area, or `/home`), confirm buttons are now pill-shaped and glow on hover, still legible (contrast) in both themes.

- [ ] **Step 3: Commit**

```bash
git add components/shared/Button.tsx
git commit -m "style: reskin Button with pill shape and floodlight glow"
```

---

## Task 8: Reskin `Modal.tsx`

**Files:**
- Modify: `components/shared/Modal.tsx:29`

**Interfaces:**
- Produces: same `Modal` props/exports — class strings only.

- [ ] **Step 1: Apply glass panel + unified radius**

Replace line 29:
```tsx
        className={`bg-surface rounded-lg shadow-2xl ${sizeClasses[size]} w-full m-4 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow`}
```
with:
```tsx
        className={`bg-surface/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl ${sizeClasses[size]} w-full m-4 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow`}
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open any modal in the app (e.g. sign-in, or an admin action modal), confirm rounded corners are larger and there's a subtle glass/blur edge, text still readable.

- [ ] **Step 3: Commit**

```bash
git add components/shared/Modal.tsx
git commit -m "style: reskin Modal with glass panel and unified radius"
```

---

## Task 9: Reskin `ToggleSwitch.tsx` and `ToastContainer.tsx`

**Files:**
- Modify: `components/shared/ToggleSwitch.tsx:24`
- Modify: `components/shared/ToastContainer.tsx:21`

**Interfaces:**
- Produces: same props/exports — class strings only.

- [ ] **Step 1: `ToggleSwitch` — replace hardcoded gray track with token-based track**

Replace line 24:
```tsx
          <div className={`block ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'} w-14 h-8 rounded-full transition`}></div>
```
with:
```tsx
          <div className={`block ${checked ? 'bg-primary shadow-md shadow-primary/40' : 'bg-border'} w-14 h-8 rounded-full transition-all duration-200`}></div>
```

- [ ] **Step 2: `ToastContainer` — round the toast shape to match the new radius system**

Replace line 21:
```tsx
  const baseClasses = "flex items-center p-4 mb-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ease-in-out";
```
with:
```tsx
  const baseClasses = "flex items-center p-4 mb-3 rounded-2xl shadow-lg text-sm font-medium transition-all duration-300 ease-in-out";
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`. Toggle the betting switch in Admin Dashboard (or any `ToggleSwitch` usage) — confirm the off-state track now uses the theme border color instead of hardcoded gray/slate in both themes. Trigger a toast (e.g. log in) and confirm its corners are now more rounded.

- [ ] **Step 4: Commit**

```bash
git add components/shared/ToggleSwitch.tsx components/shared/ToastContainer.tsx
git commit -m "style: reskin ToggleSwitch and ToastContainer to design tokens"
```

---

## Task 10: Reskin `Header.tsx` and remove the Leaderboard nav item

**Files:**
- Modify: `components/Header.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: same `Header` export — no props change.

- [ ] **Step 1: Remove the Leaderboard nav link and its now-unused import**

Delete line 54:
```tsx
            {isBettingEnabled && currentUser?.role === UserRole.MEMBER && <NavLink to="/leaderboard" icon={<UserGroupIcon className="w-5 h-5" />}>{translate('header.leaderboard')}</NavLink>}
```

Update the icon import on line 7 — remove `UserGroupIcon` since it was only used by the deleted line:
```tsx
import { VnfcLogoStatic, HomeIcon, ShieldCheckIcon, ArrowsRightLeftIcon, TrophyIcon, UsersIcon } from './icons';
```

- [ ] **Step 2: Reskin the header shell (glass sticky bar)**

Replace line 36:
```tsx
    <header className="bg-surface shadow-lg sticky top-0 z-50">
```
with:
```tsx
    <header className="bg-surface/90 backdrop-blur-md shadow-lg border-b border-border sticky top-0 z-50">
```

- [ ] **Step 3: Reskin `NavLink`'s active/inactive states to the unified pill shape**

Replace lines 15-17:
```tsx
  const baseClasses = "flex items-center justify-center sm:justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out sm:w-auto w-12 h-10";
  const activeClasses = "bg-primary/10 text-primary dark:bg-primary/20 font-semibold";
  const inactiveClasses = "text-textSecondary hover:text-textPrimary hover:bg-black/5 dark:hover:bg-white/10";
```
with:
```tsx
  const baseClasses = "flex items-center justify-center sm:justify-start px-3 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out sm:w-auto w-12 h-10";
  const activeClasses = "bg-primary/15 text-primary shadow-inner shadow-primary/20 font-semibold";
  const inactiveClasses = "text-textSecondary hover:text-textPrimary hover:bg-primary/5";
```

- [ ] **Step 4: Verify visually**

Run `npm run dev`, sign in as a member, confirm the Leaderboard nav item is gone from the header, the header has a translucent/blurred sticky look, and nav links are pill-shaped with a soft glow when active. Confirm no console error about `UserGroupIcon` being undefined.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx
git commit -m "feat: remove Leaderboard nav link, reskin header to glass pill nav"
```

---

## Task 11: Remove the Leaderboard display surface

**Files:**
- Delete: `pages/LeaderboardPage.tsx`
- Delete: `components/LeaderboardTable.tsx`
- Modify: `App.tsx`
- Modify: `pages/AdminDashboardPage.tsx:190-193`
- Modify: `locales/en.json`
- Modify: `locales/vi.json`

**Interfaces:**
- Consumes: nothing new.
- Produces: no more `/leaderboard` route. `AppContext.leaderboard`, `AppContext.refreshLeaderboard`, `AppContext.updateUserPoints`, `types.ts`'s `LeaderboardEntry`, and `services/firebaseService.ts`'s `getFirebaseLeaderboardEntries` are all **unchanged and still exported** — later tasks and existing Admin flows keep using them.

- [ ] **Step 1: Delete the two files**

```bash
git rm pages/LeaderboardPage.tsx components/LeaderboardTable.tsx
```

- [ ] **Step 2: Remove the route and import from `App.tsx`**

Delete the import line:
```tsx
import { LeaderboardPage } from './pages/LeaderboardPage';
```
Delete the route:
```tsx
            {isBettingEnabled && <Route path="/leaderboard" element={currentUser?.role === UserRole.MEMBER ? <LeaderboardPage /> : <Navigate to="/home" replace />} />}
```
Do **not** touch `leaderboard`, `refreshLeaderboard`, `isLeaderboardLoading`, `isLeaderboardLoadingRef`, `updateUserPoints`, or the `LeaderboardEntry` import in `App.tsx` — these remain wired into `AppContext` for Admin Dashboard use.

- [ ] **Step 3: Fix the description text in `AdminDashboardPage.tsx`**

Replace lines 190-193:
```tsx
          <p className="text-xs text-textSecondary mt-2">
            {isBettingEnabled
              ? "Users can view leaderboards, place bets, and see betting-related content."
              : "All betting features, points, and leaderboards are hidden for all users."}
          </p>
```
with:
```tsx
          <p className="text-xs text-textSecondary mt-2">
            {isBettingEnabled
              ? "Users can place bets and see betting-related content."
              : "All betting features and points are hidden for all users."}
          </p>
```

- [ ] **Step 4: Remove leaderboard-only i18n keys from both locale files**

In `locales/en.json`, delete these 11 key lines: `header.leaderboard`, `page.leaderboard.title`, `page.leaderboard.button.refresh`, `page.leaderboard.emptyMessage`, `leaderboardTable.header.rank`, `leaderboardTable.header.player`, `leaderboardTable.header.points`, `leaderboardTable.header.netChange`, `leaderboardTable.header.betsMade`, `leaderboardTable.header.wins`, `leaderboardTable.header.winRate`, and also `landing.join` (line 4 — mentions "climb the leaderboard!" and is not referenced by any `.tsx` file, confirmed via `grep -r "landing.join" --include=*.tsx`).

In `locales/vi.json`, delete the same 10 keys (it has no `landing.join` entry).

**Do not delete** `error.failedToRefreshLeaderboard` in either file — `App.tsx`'s `refreshLeaderboard` still calls `addToast("error.failedToRefreshLeaderboard", "error")` on failure.

Ensure both JSON files remain valid JSON after edits (no trailing commas, no dangling commas from removed lines) — validate with:
```bash
node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('locales/vi.json','utf8')); console.log('valid')"
```
Expected output: `valid`

- [ ] **Step 5: Verify no remaining references**

Run:
```bash
grep -rn "LeaderboardPage\|LeaderboardTable" --include="*.tsx" --include="*.ts" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=functions
```
Expected: no matches.

- [ ] **Step 6: Verify build and dev server**

Run `npm run build` — expect success. Run `npm run dev`, navigate to `http://localhost:8000/#/leaderboard` (or `/leaderboard` depending on router mode) — expect a redirect to `/home` (via the catch-all `<Route path="*" element={<Navigate to="/" replace />} />` or existing auth redirects), not a crash.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove Leaderboard display surface, keep points data model"
```

---

## Task 12: Landing Page — WebGL hero + reskin

**Files:**
- Modify: `pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `Scene3DBoundary` (Task 4), `BallScene` (Task 5, lazy-loaded).
- Produces: same `LandingPage` export, no props change.

- [ ] **Step 1: Add the lazy import and replace the static background**

Add near the top imports:
```tsx
const BallScene = React.lazy(() => import('../components/three/BallScene'));
```
(also import `Scene3DBoundary` from `'../components/three/Scene3DBoundary'`)

Replace the background `div` (currently `style={{ backgroundImage: "url('assets/stadium-bg.jpg')" }}` on the outer container, `pages/LandingPage.tsx:142-146`) so the photo becomes the fallback and a `Scene3DBoundary` layer sits behind the content:

```tsx
      <div 
        ref={containerRef}
        className="min-h-screen bg-cover bg-center text-white font-sans overflow-hidden transition-all duration-500 ease-out relative" 
        style={{ backgroundImage: "url('assets/stadium-bg.jpg')" }}
      >
        <Scene3DBoundary
          className="absolute inset-0 z-0 opacity-70"
          fallback={<div />}
        >
          <BallScene />
        </Scene3DBoundary>
        <div className="min-h-screen bg-black/40 backdrop-blur-[2px] p-4 sm:p-6 flex flex-col relative overflow-hidden shine-effect z-10">
```

(Note: the existing `stadium-bg.jpg` `backgroundImage` on the outer div now doubles as the fallback shown whenever `Scene3DBoundary` renders its empty fallback `div` — since the boundary's fallback is transparent/empty, the photo underneath is what's visible when WebGL is unavailable. Keep the rest of the JSX tree — the header, main content, sponsors, footer — exactly as-is, just re-close the extra wrapping `div` you did not add; only the two blocks shown above change.)

- [ ] **Step 2: Apply display font to the two headline blocks**

On `pages/LandingPage.tsx:179-180` and `:183`, add `font-display tracking-wide` to the existing className strings (append, don't replace other classes):
```tsx
                  <h1 className="text-3xl sm:text-6xl font-black tracking-wider skew-x-12 font-display">VNEXT JAPAN</h1>
                  <h2 className="text-4xl sm:text-7xl font-black text-orange-400 tracking-wider skew-x-12 font-display">OPEN CUP</h2>
```
```tsx
                <h3 className="text-4xl sm:text-6xl font-extrabold tracking-tight font-display">TỨ HÙNG TRANH ĐẤU</h3>
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`, open `/`. On a normal desktop browser confirm a glowing 3D ball is visible behind the content. Open DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload, confirm the 3D canvas is gone and the static `stadium-bg.jpg` photo shows instead with no layout break. Confirm headline text now uses the condensed display font.

- [ ] **Step 4: Commit**

```bash
git add pages/LandingPage.tsx
git commit -m "feat: add WebGL ball hero and display font to Landing Page"
```

---

## Task 13: Countdown Page — WebGL hero + reskin

**Files:**
- Modify: `pages/CountdownPage.tsx`

**Interfaces:**
- Consumes: `Scene3DBoundary` (Task 4), `BallScene` (Task 5, lazy-loaded).

- [ ] **Step 1: Read the current file to find the countdown number display and background container**

Before editing, run: `grep -n "countdown\|className=\"min-h-screen\|text-6xl\|text-7xl\|text-8xl" pages/CountdownPage.tsx` to locate (a) the page's outermost container className, and (b) the JSX elements rendering the day/hour/minute/second digits.

- [ ] **Step 2: Add a `Scene3DBoundary`-wrapped `BallScene` behind the countdown**

Import at the top:
```tsx
const BallScene = React.lazy(() => import('../components/three/BallScene'));
```
and `Scene3DBoundary` from `'../components/three/Scene3DBoundary'`. Wrap the outermost content container so `Scene3DBoundary` is a sibling positioned behind it (same `relative` parent + `absolute inset-0 z-0` boundary + `relative z-10` on the existing content wrapper pattern used in Task 12 Step 1). Use a plain gradient div as the fallback:
```tsx
fallback={<div className="absolute inset-0 bg-gradient-to-b from-background to-surface" />}
```

- [ ] **Step 3: Apply the display font to the countdown digits**

Add `font-display tabular-nums` to the className of each digit/number element found in Step 1 (append to existing classes, keep all existing sizing/color classes).

- [ ] **Step 4: Verify visually**

Run `npm run dev`, navigate to `/home`, confirm the 3D ball renders behind the countdown, digits use the display font, and toggling `prefers-reduced-motion` in DevTools swaps to the gradient fallback with no layout shift.

- [ ] **Step 5: Commit**

```bash
git add pages/CountdownPage.tsx
git commit -m "feat: add WebGL ball hero and display font to Countdown Page"
```

---

## Task 14: Tournament Page — trophy champion moment + CSS-3D standings

**Files:**
- Modify: `pages/TournamentPage.tsx`

**Interfaces:**
- Consumes: `Scene3DBoundary` (Task 4), `TrophyScene` (Task 6, lazy-loaded), `TeamStanding` type (existing, from `types.ts` — unchanged).

- [ ] **Step 1: Locate the champion/standings rendering**

Run: `grep -n "standings\|champion\|TeamStanding\|schedule" pages/TournamentPage.tsx` to find where the final/top standing is displayed (this determines the "champion moment" condition — typically the top row of the sorted `standings` array, or a dedicated finished-tournament state).

- [ ] **Step 2: Add the `TrophyScene` for the champion state**

Import at the top:
```tsx
const TrophyScene = React.lazy(() => import('../components/three/TrophyScene'));
```
and `Scene3DBoundary`. Where the top-of-standings/champion team is rendered, wrap that specific card/section (not the whole page) with a fixed-height container (e.g. `h-56 relative`) holding:
```tsx
<Scene3DBoundary
  className="h-56 relative"
  fallback={<div className="h-56 flex items-center justify-center"><TrophyIcon className="w-24 h-24 text-accentGold" /></div>}
>
  <TrophyScene />
</Scene3DBoundary>
```
(`TrophyIcon` is already imported/available in this file per the existing icon set — confirm via the file's existing imports; if not present, add it to the existing `from '../components/icons'` import line.)

- [ ] **Step 3: Apply CSS-3D depth to the standings table/schedule (no WebGL there)**

For the standings table container and schedule match-card containers, ensure their outer className includes `rounded-2xl` (per the Global Constraints radius rule) and add a hover tilt utility to individual schedule match cards: append `transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10` to each match-card row/card className. Do not alter the data logic, only className strings.

- [ ] **Step 4: Verify visually**

Run `npm run dev`, navigate to `/tournament`, confirm the champion section shows a rotating gold trophy (or the `TrophyIcon` fallback under reduced motion), and standings/schedule cards lift slightly on hover.

- [ ] **Step 5: Commit**

```bash
git add pages/TournamentPage.tsx
git commit -m "feat: add WebGL trophy champion moment and CSS-3D standings to Tournament Page"
```

---

## Task 15: Member Home + MatchCard — CSS-3D only, token sweep

**Files:**
- Modify: `pages/MemberHomePage.tsx`
- Modify: `components/MatchCard.tsx`

**Interfaces:**
- Consumes: nothing new (no WebGL on this page per Global Constraints).

- [ ] **Step 1: Unify `MatchCard`'s shape and add tilt-hover**

Replace `components/MatchCard.tsx:151`:
```tsx
      <div className="bg-surface rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
```
with:
```tsx
      <div className="bg-surface rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
```

- [ ] **Step 2: Sweep hardcoded neutral colors inside `MatchCard.tsx` to theme tokens**

These lines use hardcoded `gray-`/`slate-` neutrals that will visually clash with the new near-black-green dark surface — replace each with token-based equivalents (functional status colors like `green-`/`red-`/`yellow-` stay unchanged, only the neutral panel backgrounds change):

- Line 56: `<div key={bookie.key} className="p-2 bg-gray-100 dark:bg-slate-700/80 rounded">` → `<div key={bookie.key} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">`
- Line 221: `<div className="my-3 p-2 bg-gray-100 dark:bg-slate-700 rounded-md text-sm text-textPrimary">` → `<div className="my-3 p-2 bg-black/5 dark:bg-white/5 rounded-lg text-sm text-textPrimary">`
- Line 236, 251, 278, 292 (all four `<li ... className="flex justify-between items-center p-1.5 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 rounded text-textPrimary">`): replace `bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600` with `bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10`
- Line 303: `<div className="p-4 bg-gray-50 dark:bg-slate-800/60 border-t border-border">` → `<div className="p-4 bg-black/5 dark:bg-white/5 border-t border-border">`
- Line 315: `<div className="p-4 bg-gray-50 dark:bg-slate-800/60 text-center text-sm text-textSecondary font-medium border-t border-border">` → `<div className="p-4 bg-black/5 dark:bg-white/5 text-center text-sm text-textSecondary font-medium border-t border-border">`

Run `grep -n "bg-gray-\|bg-slate-\|dark:bg-slate-\|dark:hover:bg-slate-" components/MatchCard.tsx` after editing to confirm zero remaining matches (all such literals replaced).

- [ ] **Step 3: Reskin `MemberHomePage.tsx` container shape**

Run `grep -n "rounded-md\|rounded-lg\|bg-gray-\|bg-slate-" pages/MemberHomePage.tsx` and for each panel-level container match (not small inline badges), change `rounded-md`/`rounded-lg` to `rounded-2xl` and any hardcoded `bg-gray-*`/`bg-slate-*` neutral panel background to `bg-black/5 dark:bg-white/5`, following the same pattern as Step 2. Leave functional/status color classes (green/red/yellow/blue) untouched.

- [ ] **Step 4: Verify visually**

Run `npm run dev`, log in as a member, open `/betting` (or the current betting route), confirm match cards lift on hover with a soft glow, and dark-mode sub-panels (odds display, bettor lists) blend with the near-black-green background instead of showing slate-gray boxes.

- [ ] **Step 5: Commit**

```bash
git add pages/MemberHomePage.tsx components/MatchCard.tsx
git commit -m "style: apply CSS-3D tilt and token sweep to Member Home and MatchCard"
```

---

## Task 16: Team Divider Page — CSS-3D reskin

**Files:**
- Modify: `pages/TeamDividerPage.tsx`

**Interfaces:**
- Consumes: nothing new (no WebGL on this page).

- [ ] **Step 1: Sweep shape/neutral-color classes**

Run `grep -n "rounded-md\|rounded-lg\|bg-gray-\|bg-slate-\|dark:bg-slate-" pages/TeamDividerPage.tsx` and apply the same replacements as Task 15 Step 2/3 (panel radius → `rounded-2xl`, hardcoded neutral panel backgrounds → `bg-black/5 dark:bg-white/5`). Do not touch the existing player-draw animation logic (`--start-x`, `--end-x` CSS custom properties, `flyToTeam`/`floatPoints` keyframes in `index.html`, or any `useRef`/`useState` wiring) — this task is class-string-only.

- [ ] **Step 2: Add tilt-hover to player/team cards**

For the card elements representing an individual player or a divided team (identify via the `Player`/`DividedTeam` types usage in this file), append `transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10` to their className.

- [ ] **Step 3: Verify visually**

Run `npm run dev`, navigate to `/team-divider`, confirm cards now have rounded-2xl corners and lift on hover, and the existing "fly to team" animation still plays correctly when dividing teams (this exercises the untouched animation logic).

- [ ] **Step 4: Commit**

```bash
git add pages/TeamDividerPage.tsx
git commit -m "style: apply CSS-3D reskin to Team Divider Page"
```

---

## Task 17: Player Info Page — CSS-3D reskin

**Files:**
- Modify: `pages/PlayerInfoPage.tsx`
- Modify: `components/Tournament/PlayerSkillChart.tsx`

**Interfaces:**
- Consumes: nothing new (no WebGL on this page).

- [ ] **Step 1: Sweep shape/neutral-color classes in `PlayerInfoPage.tsx`**

Run `grep -n "rounded-md\|rounded-lg\|bg-gray-\|bg-slate-\|dark:bg-slate-" pages/PlayerInfoPage.tsx` and apply the same replacement pattern as Task 15 (radius → `rounded-2xl`, neutral panel backgrounds → `bg-black/5 dark:bg-white/5`). Add tilt-hover (`transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10`) to individual player card elements.

- [ ] **Step 2: Restyle `PlayerSkillChart.tsx` to the new palette**

Run `grep -n "stroke=\|fill=\|#[0-9a-fA-F]\{3,6\}\|bg-gray-\|bg-slate-" components/Tournament/PlayerSkillChart.tsx` to find hardcoded hex colors or neutral fills used for the chart. Replace any hardcoded accent hex (e.g. a chart line/fill color unrelated to functional red/green/yellow status) with `var(--color-primary)` (or the Tailwind `primary` token if the chart uses Tailwind classes rather than raw SVG attributes) so the chart's accent matches the new orange floodlight color instead of the old orange-500 default — if the existing hex already resolves to the same family (e.g. `#f97316`), update it to `#fb923c`/`#ea580c` per Task 2's tokens for exact consistency. Keep the chart's data-plotting logic (paths, scales, `PlayerSkills` field mapping) untouched — this is a color-only change, per the dataviz principle of not touching chart mechanics while restyling.

- [ ] **Step 3: Verify visually**

Run `npm run dev`, navigate to `/player-info`, open a player detail, confirm the skill chart now renders in the new orange tone and player cards have the unified rounded-2xl + tilt-hover treatment.

- [ ] **Step 4: Commit**

```bash
git add pages/PlayerInfoPage.tsx components/Tournament/PlayerSkillChart.tsx
git commit -m "style: apply CSS-3D reskin to Player Info Page and skill chart"
```

---

## Task 18: Admin Dashboard — light reskin, function-first

**Files:**
- Modify: `pages/AdminDashboardPage.tsx`

**Interfaces:**
- Consumes: nothing new (no WebGL, minimal visual change — per Global Constraints, dashboards stay function-first).

- [ ] **Step 1: Sweep only the panel-radius and hardcoded-neutral classes**

Run `grep -n "rounded-md\|rounded-lg\|bg-gray-\|bg-slate-\|dark:bg-slate-" pages/AdminDashboardPage.tsx` and apply the same radius/token replacement pattern as Task 15 — `rounded-2xl` for section/panel containers, `bg-black/5 dark:bg-white/5` for neutral sub-panels. Do **not** add tilt-hover or any motion here — admin/data-management surfaces stay still per the Global Constraints (no heavy effects on dense functional UI).

- [ ] **Step 2: Verify visually**

Run `npm run dev`, sign in as an admin, open `/admin`, confirm panels now use rounded-2xl corners and the color palette matches the rest of the app, while the page remains static/no-motion and fully usable (toggle betting switch still works, forms still submit).

- [ ] **Step 3: Commit**

```bash
git add pages/AdminDashboardPage.tsx
git commit -m "style: apply token/radius sweep to Admin Dashboard"
```

---

## Task 19: Sweep remaining shared/Tournament components for shape consistency

**Files:**
- Modify: any file matched in Step 1 not already covered by Tasks 7-18

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Find remaining inconsistent radius/neutral-color usage**

Run:
```bash
grep -rln "rounded-md\|rounded-lg\|bg-gray-[0-9]\|dark:bg-slate-[0-9]" --include="*.tsx" components pages | grep -v -E "components/three/|Button.tsx|Modal.tsx|ToggleSwitch.tsx|ToastContainer.tsx|Header.tsx|MatchCard.tsx"
```
This lists every remaining `.tsx` file (expected: the `components/Admin/*`, `components/Tournament/*` modals, `components/Auth.tsx`, `components/LockScreen.tsx`, `components/TeamDivisionSpinner.tsx`, `components/ThemeToggleButton.tsx`, `components/LanguageToggleButton.tsx`, and any page not already handled) still using the old `rounded-md`/`rounded-lg` panel radius or hardcoded gray/slate neutrals.

- [ ] **Step 2: Apply the same mechanical replacement to each listed file**

For each file from Step 1, apply exactly the pattern used in Tasks 15-18: any **panel/card/modal-level container's** `rounded-md` or `rounded-lg` → `rounded-2xl`; any **panel-level** hardcoded `bg-gray-50`/`bg-gray-100`/`dark:bg-slate-600`/`dark:bg-slate-700`/`dark:bg-slate-800` → `bg-black/5 dark:bg-white/5` (or `bg-black/10 dark:bg-white/10` for the `:hover` variant, matching whatever opacity step the original gray/slate shade implied). Do not change `rounded-full` usages (already correct), do not change functional status-color classes (`bg-green-*`, `bg-red-*`, `bg-yellow-*`, `bg-blue-*` used for win/loss/status badges), and do not change any non-visual logic.

- [ ] **Step 3: Re-run the Step 1 grep to confirm convergence**

Re-run the same `grep` command from Step 1. Expected: empty output (or only matches inside small inline badges/pills that are intentionally `rounded-full`/unaffected — visually confirm any remaining hit is not a panel-level container before leaving it).

- [ ] **Step 4: Verify build**

Run `npm run build` — expect success.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style: sweep remaining components to unified radius and token colors"
```

---

## Task 20: Full manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Full page walkthrough**

Run `npm run dev`. In a desktop browser, visit every remaining route and confirm no console errors, no visibly broken layout, and the new palette/shape is consistently applied: `/`, `/home`, `/betting` (or current betting route), `/team-divider`, `/tournament`, `/player-info`, `/admin` (as an admin user). Confirm `/leaderboard` no longer exists (redirects away, does not 404-crash the SPA).

- [ ] **Step 2: Theme toggle check**

On at least 3 of the pages above, toggle light/dark via the existing `ThemeToggleButton` and confirm text stays readable (no low-contrast text) in both modes.

- [ ] **Step 3: Reduced motion check**

In Chrome DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → `reduce`. Reload `/`, `/home`, `/tournament`. Confirm all three fall back to their static (non-WebGL) visuals with no layout shift or console error.

- [ ] **Step 4: Mobile viewport check**

In DevTools device toolbar, set viewport to 375px width. Revisit `/`, `/home`, `/betting`, `/tournament`. Confirm no horizontal scroll/overflow and the 3D hero sections resize without breaking layout.

- [ ] **Step 5: Network chunk isolation check**

With DevTools Network tab open (filter: JS), load `/admin` and confirm no `chunk-*.js` referencing `three`/`@react-three` is fetched. Then load `/` and confirm such a chunk **is** fetched. This validates Task 3's code-splitting actually isolates the 3D bundle to the hero pages.

- [ ] **Step 6: Production build check**

Run `npm run build`. Expected: "Build successful!" with no errors or warnings about unresolved imports.

- [ ] **Step 7: Record results**

If any check fails, fix the specific issue in the relevant task's files before proceeding — do not move to Task 21 with a known-broken check.

---

## Task 21: Deploy to Firebase Hosting

**Files:** none (deployment only)

- [ ] **Step 1: Load the project's Firebase deploy runbook**

Use the `deploy-firebase` skill (already documented for this repo) rather than running raw `firebase deploy` commands from memory — it captures this project's specific deploy steps/gotchas.

- [ ] **Step 2: Run the hosting deploy**

Run `npm run deploy:hosting` (builds then deploys hosting only — this redesign does not touch `functions/`, so a functions deploy is not required unless the deploy-firebase skill's runbook says otherwise).

- [ ] **Step 3: Verify the live site**

Open the deployed Firebase Hosting URL, repeat a shortened version of Task 20 Step 1 (visit `/`, `/home`, `/tournament`, confirm the new design and no console errors) against production.

- [ ] **Step 4: Report completion**

Summarize what shipped (design system, 3D hero pages, leaderboard removal) and the production URL.

---

## Self-Review Notes

- **Spec coverage:** Section 2 (palette/typography/motion) → Tasks 2, 7-19. Section 3 (3D architecture) → Tasks 1, 3-6. Section 4 (page table) → Tasks 12-18. Section 5 (leaderboard removal) → Task 11. Section 6 (risks) → mitigated by Task 3 Step 3-4 (build/dev verification), Task 20 Step 5 (chunk isolation check). Section 7 (testing) → Task 20. All spec sections have at least one covering task.
- **Type consistency:** `Scene3DBoundary` props (`children`, `fallback`, `className`) are used identically in Tasks 12/13/14. `useCanRender3D()` returns `boolean`, consumed only inside `Scene3DBoundary` (Task 4) — no other task calls it directly, avoiding signature drift.
- **Scope:** this is one redesign effort across a single existing app; not decomposed further since every task depends on the same Task 2 token set and Task 3 build change.
