# Agent notes — Software Version Tracker

This file orients coding agents (and humans) working in this repository. It complements `package.json` and the Electron Forge / Vite layout.

## Product

Desktop app (**Electron**) that compares **installed vs latest** versions for development tools. Users toggle monitors per tool kind, rescan on demand, and open official download pages when outdated.

**Monitored software** (`SoftwareKind` in `src/types.ts`): Node.js (`nodejs`), Python (`python`), OpenJDK (`java`), Maven (`maven`), Git (`git`). Labels live in `src/constants/softwareCatalog.ts`.

**Dependency analysis** (separate windows, `?view=` query on the renderer): npm deps from a `package.json`, Maven coords from a `pom.xml`, pip packages from the active Python environment. Reports are held in main-process memory until the analyzer window closes; exports write markdown under app data or beside the project file.

> **Platform:** Developed and tested on **Windows** only. PATH and executable discovery may differ on macOS/Linux.

## Stack

- **Electron** (main + renderer) with **Electron Forge** and the **Vite** plugin
- **React 19** + **TypeScript** in the renderer
- **Tailwind CSS** for styling
- **lucide-react** for icons
- **fast-xml-parser** for Maven Central / POM parsing (main process)

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
| `src/main.ts` | Main process: windows, **IPC handlers**, version checks, dependency analysis orchestration |
| `src/preload.ts` | `contextBridge` — exposes `window.versionTracker` to the renderer |
| `src/renderer.tsx` | Renderer entry; picks view from `?view=` (`dependencies`, `maven-dependencies`, `pip-dependencies`, or main `App`) |
| `src/components/` | React UI — `App.tsx`, `SoftwareTable.tsx`, `GlobalNpmModulesSection.tsx`, `GlobalPipModulesSection.tsx`, `*DependencyAnalyzerApp.tsx`, tables, `StatusBadge.tsx` |
| `src/constants/softwareCatalog.ts` | `SoftwareKind` labels and ordering |
| `src/services/storage.ts` | Persist tracked list under OS **appData** |
| `src/services/versionCheck.ts` | Node: `node -v` vs nodejs.org `index.json` |
| `src/services/npmGlobalList.ts`, `globalNpmVersionCheck.ts`, `npmGlobalUpgrade.ts` | Global npm modules on main window |
| `src/services/globalPipVersionCheck.ts`, `globalPipUpgradePolicy.ts`, `pipGlobalUpgrade.ts` | Pip packages in monitored Python environment on main window |
| `src/services/pythonVersionCheck.ts` | Python via `python` / registry APIs |
| `src/services/javaVersionCheck.ts` | OpenJDK via `java` / release endpoints |
| `src/services/mavenVersionCheck.ts` | Maven via `mvn` / GitHub releases |
| `src/services/gitVersionCheck.ts` | Git via `git --version` / Git for Windows GitHub releases |
| `src/services/gitVersionNormalize.ts` | Git for Windows version parse and compare (`.windows.N` suffix) |
| `src/services/dependencyVersionCheck.ts` | npm `package.json` analysis |
| `src/services/mavenDependencyVersionCheck.ts` | Maven `pom.xml` analysis |
| `src/services/pipDependencyVersionCheck.ts` | pip list / pip index version checks |
| `src/services/pipIndexVersions.ts` | `pip index versions` for configured package indexes |
| `src/services/versionKindTiers.ts`, `semver.ts`, `versionCompareDisplay.ts` | Shared compare / status tier logic |
| `src/types.ts` | Shared types for main / preload / renderer |
| `forge.config.ts` | Forge + Vite targets (main, preload, renderer), makers, fuses |
| `vite.*.config.ts` | Vite configs per process |

## IPC surface

Preload (`src/preload.ts`) maps to `ipcMain.handle` channels in `src/main.ts`. Renderer code should use `window.versionTracker` (see `src/global.d.ts`), not raw `ipcRenderer`.

### Monitored software

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `listSoftware` | `software:list` | Returns `TrackedSoftware[]` |
| `addSoftware` | `software:add` | Valid `SoftwareKind` only; **one entry per kind** (re-scan if already tracked) |
| `deleteSoftware` | `software:delete` | Filters by `id` |
| `rescanAll` | `software:rescan-all` | Re-checks all tracked rows |
| `openDownload` | `software:open-download` | URL must match a **trusted prefix** in main (see Security) |

### Global npm (main window)

Shown when Node.js is monitored and `node -v` succeeded. **Does not scan until the user clicks Scan** (then Rescan). Reports are held in main-process memory (`lastGlobalNpmReport`) for upgrade allowlisting.

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `scanGlobalNpmModules` | `global-npm:scan` | `npm list -g --depth=0` + registry version checks |
| `upgradeGlobalNpmModule` | `global-npm:upgrade` | `npm install -g <name>@latest`; package must be in last scan |

### Global pip (main window)

Shown when Python is monitored and version check succeeded. **Does not scan until the user clicks Scan** (then Rescan). Lists packages from `pip list` on the resolved default Python (same environment as the pip analyzer). Reports are held in main-process memory (`lastGlobalPipReport`) for upgrade allowlisting. After **Upgrade**, the app re-lists the environment and only re-checks index versions and OSV for the upgraded package, its transitive dependencies, and any newly installed or version-changed packages; manual Rescan still checks everything.

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `scanGlobalPipModules` | `global-pip:scan` | `pip list` + pip index version checks |
| `upgradeGlobalPipModule` | `global-pip:upgrade` | `pip install --upgrade <name>==<version>`; package must be in last scan; then **partial refresh** (upgraded package + transitive deps + version-changed/new packages) with fallback to full rescan |
| `openPipPackage` | `global-pip:open-package` | Validates package name; opens `https://pypi.org/project/` only |

### npm (`package.json`)

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `openDependencyAnalyzer` | `deps:open-analyzer` | File picker → in-memory report → dependency window |
| `getDependencyReport` | `deps:get-report` | Requires pending report |
| `rescanDependencies` | `deps:rescan` | Updates pending report |
| `changePackageJson` | `deps:change-package-json` | New file picker |
| `openNpmPackage` | `deps:open-npm-package` | Validates package name; opens npmjs.com |
| `exportDependencyReport` | `deps:export-report` | Markdown beside project |

### Maven (`pom.xml`)

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `openMavenDependencyAnalyzer` | `maven-deps:open-analyzer` | File picker → report → window |
| `getMavenDependencyReport` | `maven-deps:get-report` | |
| `rescanMavenDependencies` | `maven-deps:rescan` | |
| `changePomXml` | `maven-deps:change-pom` | |
| `openMavenArtifact` | `maven-deps:open-artifact` | Validates coordinates; `central.sonatype.com` only |
| `exportMavenDependencyReport` | `maven-deps:export-report` | |

### pip

| Preload method | IPC channel | Notes |
|----------------|-------------|--------|
| `openPipDependencyAnalyzer` | `pip-deps:open-analyzer` | Scans environment → window |
| `getPipDependencyReport` | `pip-deps:get-report` | |
| `rescanPipDependencies` | `pip-deps:rescan` | |
| `exportPipDependencyReport` | `pip-deps:export-report` | Markdown under app data |

## Persistence

- File: `tracked_software.json`
- Directory: `{appData}/Software Version Tracker/` (see `storage.ts`)
- JSON array of `TrackedSoftware`. Invalid / non-array file content is treated as empty with a console error.
- Dependency analysis reports are **not** persisted to disk except via explicit export handlers.

## Security / process boundaries

- **Context isolation** on; **Node integration** off in `BrowserWindow` (`main.ts` `webPreferences`).
- **Sandbox** is `false` (as configured); be cautious adding renderer capabilities.
- `software:open-download` allowlist (prefix match): `https://nodejs.org/`, `https://www.python.org/`, `https://openjdk.org/`, `https://jdk.java.net/`, `https://maven.apache.org/`, `https://git-scm.com/`. Do not broaden without an explicit product decision.
- `deps:open-npm-package` validates npm package names before opening registry URLs.
- `maven-deps:open-artifact` builds URLs only under `https://central.sonatype.com/artifact/`.

## Conventions for changes

- Keep **main-process** IO (disk, `execFile`, `fetch` to registries, file dialogs) in **main** or `src/services/` used from main — not in React components.
- When extending **software kinds**, update `SoftwareKind`, `softwareCatalog.ts`, IPC validation in `main.ts`, the matching `*VersionCheck` service, default download URLs in `main.ts`, the `open-download` allowlist, and the UI.
- When extending **dependency analyzers**, add types in `types.ts`, services under `src/services/`, preload + `global.d.ts` + `main.ts` handlers, a renderer view in `renderer.tsx`, and a `*DependencyAnalyzerApp` component.
- Match existing **formatting and naming**; avoid drive-by refactors unrelated to the task.
