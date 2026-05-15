# Agent notes — Software Version Tracker

This file orients coding agents (and humans) working in this repository. It complements `package.json` and the Electron Forge / Vite layout.

## Product

Desktop app (**Electron**) that tracks **local vs latest** versions for installed tooling. The current MVP supports **Node.js** only (`SoftwareKind` is `'nodejs'` in `src/types.ts`). Users add or refresh entries; the UI reads state via a small preload API.

## Stack

- **Electron** (main + renderer) with **Electron Forge** and the **Vite** plugin
- **React 19** + **TypeScript** in the renderer
- **Tailwind CSS** for styling
- **lucide-react** for icons

## Commands

| Command | Purpose |
|--------|---------|
| `npm run start` | Dev: Electron Forge + Vite (`electron-forge start`) |
| `npm run lint` | ESLint on `.ts` / `.tsx` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run package` | Package the app |
| `npm run make` | Build installers per `forge.config.ts` makers |

Prefer running **lint** and **typecheck** after non-trivial edits.

## Layout (high signal)

| Area | Role |
|------|------|
| `src/main.ts` | Main process: window, **IPC handlers**, storage + version checks |
| `src/preload.ts` | `contextBridge` — exposes `window.versionTracker` to the renderer |
| `src/renderer.tsx` | Renderer entry |
| `src/components/` | React UI (`App.tsx`, forms, table, badges) |
| `src/services/storage.ts` | Persist tracked list under the OS **appData** path |
| `src/services/versionCheck.ts` | Node current (`node -v`) vs latest (nodejs.org `index.json`) |
| `src/types.ts` | Shared types for main / preload / renderer |
| `forge.config.ts` | Forge + Vite targets (main, preload, renderer), makers, fuses |
| `vite.*.config.ts` | Vite configs per process |

## IPC surface

Preload (`src/preload.ts`) maps to `ipcMain.handle` channels in `src/main.ts`:

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `listSoftware` | `software:list` | Returns `TrackedSoftware[]` |
| `addSoftware` | `software:add` | Only `kind: 'nodejs'`; one Node entry enforced by main |
| `deleteSoftware` | `software:delete` | Filters by `id` |
| `rescanAll` | `software:rescan-all` | Re-checks Node rows |
| `openDownload` | `software:open-download` | **Only** `https://nodejs.org/…` URLs (validated in main) |

Renderer code should use `window.versionTracker` (see `src/global.d.ts`), not raw `ipcRenderer`.

## Persistence

- File: `tracked_software.json`
- Directory: `{appData}/Software Version Tracker/` (see `storage.ts`)
- JSON array of `TrackedSoftware`. Invalid / non-array file content is treated as empty with a console error.

## Security / process boundaries

- **Context isolation** on; **Node integration** off in the `BrowserWindow` (`main.ts`).
- **Sandbox** is `false` (as configured); be cautious adding renderer capabilities.
- Do not broaden `software:open-download` allowlists without an explicit product decision.

## Conventions for changes

- Keep **main-process** IO (disk, `execFile`, `fetch` to registries) in **main** or `src/services/` used from main — not in React components.
- When extending software kinds, update **`SoftwareKind`**, IPC validation in **`main.ts`**, **`versionCheck`** (or parallel services), and the UI.
- Match existing **formatting and naming**; avoid drive-by refactors unrelated to the task.
