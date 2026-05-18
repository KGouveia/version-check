# Software Version Tracker

Desktop **Electron** app that compares **installed** versions of development tools against **latest public releases**. You can monitor common runtimes and CLIs, rescan on demand, and open official download pages when something is outdated. The app also offers optional dependency audits for Node/npm (`package.json`), Maven (`pom.xml`), and Python (**pip**) projects.

**Monitored software:** Node.js, Python, OpenJDK, Maven, and Codex CLI.

**Dependency analysis:** analyze npm dependencies from a `package.json`, Maven coordinates from a `pom.xml`, or installed packages from a Python environment.

> **Platform:** This app was designed and developed to run on **Windows**. It has **not been tested** on macOS or Linux. Electron may run on other platforms, but behavior and PATH handling are unverified outside Windows.

## Prerequisites

### To build and run from source

- **Node.js 20+** (recommended; Electron Forge 7 and Electron 42 work best on a current LTS)
- **npm** (included with Node.js)
- **Git** (to clone the repository)

### At runtime (when using the app)

- **Monitored tools on PATH** — For each tool you enable, the corresponding command must be available (or discoverable via environment variables where supported, such as `JAVA_HOME` or `MAVEN_HOME`):
  - `node` — Node.js
  - `python` — Python
  - `java` — OpenJDK
  - `mvn` — Maven
  - `codex` — Codex CLI
- **Network access** — Version checks fetch data from public registries and release endpoints (for example nodejs.org, python.org, GitHub releases, and the npm registry). On Windows, those outbound requests use the **operating system proxy** (corporate proxy / PAC / WPAD), so release lookups work behind a configured system proxy. Local version detection still uses installed CLI tools on `PATH`.
- **Operating system** — **Windows** (required for the intended experience). The project is developed and tested on Windows only; macOS and Linux are unsupported and untested.

> **PATH note:** If you launch the app from a desktop shortcut, it may inherit a slimmer `PATH` than your terminal. If a tool is reported as not found, start the app from the same shell where `node -v` or `python --version` work, or add the install directories to your system `PATH`.

## Installation

```bash
git clone <repo-url>
cd version-check
npm install
```

The first `npm install` may take several minutes while Electron downloads its platform binary.

After making code changes, you can run `npm run lint` and `npm run typecheck` to verify the project.

## Usage

Start the app in development mode:

```bash
npm run start
```

### Monitor dev tools

1. In **Monitored software**, toggle the tools you want to track (Node.js, Python, OpenJDK, Maven, Codex CLI).
2. Click **Rescan all** to refresh local and latest versions.
3. When a tool is outdated, use the download action to open its official release page in your browser.

### Analyze dependencies

Use the header buttons:

- **package.json** — Choose a project file, view and rescan npm dependencies, change the selected `package.json`, export a report, and open packages on the npm registry.
- **pom.xml** — Same workflow for Maven dependencies declared in a POM.
- **pip packages** — Analyze installed packages from the selected Python environment.

### Data storage

Tracked software is saved automatically to:

`{appData}/Software Version Tracker/tracked_software.json`

No manual configuration is required. On Windows, `{appData}` is typically `%APPDATA%`.

## Tech stack

Electron, React 19, TypeScript, and Tailwind CSS (built with Electron Forge and Vite).

## Contributing

Contributions are not accepted. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT
