import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import crypto from 'node:crypto';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { checkCodexCliVersion } from './services/codexVersionCheck';
import {
  analyzeDependencies,
  rescanDependencies,
} from './services/dependencyVersionCheck';
import { checkJavaVersion } from './services/javaVersionCheck';
import { parsePackageJsonDependencies } from './services/packageJsonAnalyzer';
import { checkPythonVersion } from './services/pythonVersionCheck';
import { readTrackedSoftware, writeTrackedSoftware } from './services/storage';
import { checkNodeVersion } from './services/versionCheck';
import { npmPackagePageUrl } from './services/npmRegistry';
import type { AddSoftwareInput, DependencyAnalysisReport, SoftwareKind, TrackedSoftware } from './types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let pendingDependencyReport: DependencyAnalysisReport | null = null;
let dependencyWindow: BrowserWindow | null = null;

const NPM_PACKAGE_NAME_PATTERN =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

const webPreferences = {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: false,
};

const loadRenderer = (browserWindow: BrowserWindow, view?: string) => {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (view) {
      url.searchParams.set('view', view);
    }
    void browserWindow.loadURL(url.toString());
  } else {
    void browserWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      view ? { query: { view } } : undefined,
    );
  }
};

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Software Version Tracker',
    backgroundColor: '#09090b',
    webPreferences,
  });

  loadRenderer(mainWindow);
};

const createDependencyWindow = () => {
  if (dependencyWindow && !dependencyWindow.isDestroyed()) {
    dependencyWindow.focus();
    dependencyWindow.webContents.reload();
    return;
  }

  dependencyWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Dependency versions',
    backgroundColor: '#09090b',
    webPreferences,
  });

  dependencyWindow.on('closed', () => {
    dependencyWindow = null;
  });

  loadRenderer(dependencyWindow, 'dependencies');
};

const pickPackageJson = async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'package.json', extensions: ['json'] }],
    title: 'Select package.json',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];

  if (path.basename(filePath) !== 'package.json') {
    throw new Error('Please select a file named package.json.');
  }

  return filePath;
};

const analyzePackageJsonAtPath = async (
  packageJsonPath: string,
): Promise<DependencyAnalysisReport> => {
  const { projectLabel, dependencies } = await parsePackageJsonDependencies(packageJsonPath);
  return analyzeDependencies(packageJsonPath, projectLabel, dependencies);
};

const defaultDisplayName: Record<SoftwareKind, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  java: 'OpenJDK',
  'codex-cli': 'Codex CLI',
};

const defaultDownloadUrl: Record<SoftwareKind, string> = {
  nodejs: 'https://nodejs.org/en/download',
  python: 'https://www.python.org/downloads/',
  java: 'https://adoptium.net/temurin/releases/',
  'codex-cli': 'https://www.npmjs.com/package/@openai/codex',
};

const createTrackedSoftware = (kind: SoftwareKind, name: string): TrackedSoftware => ({
  id: crypto.randomUUID(),
  name: name.trim() || defaultDisplayName[kind],
  kind,
  currentVersion: null,
  latestVersion: null,
  status: 'unknown',
  downloadUrl: defaultDownloadUrl[kind],
  lastCheckedAt: null,
  error: null,
});

const checkTrackedSoftware = async (
  software: TrackedSoftware,
): Promise<TrackedSoftware> => {
  switch (software.kind) {
    case 'nodejs':
      return checkNodeVersion(software);
    case 'python':
      return checkPythonVersion(software);
    case 'java':
      return checkJavaVersion(software);
    case 'codex-cli':
      return checkCodexCliVersion(software);
    default:
      return Promise.resolve({
        ...software,
        status: 'error',
        error: 'Unsupported software kind in storage.',
        lastCheckedAt: new Date().toISOString(),
      });
  }
};

const isSoftwareKind = (value: unknown): value is SoftwareKind =>
  value === 'nodejs' ||
  value === 'python' ||
  value === 'java' ||
  value === 'codex-cli';

const registerIpcHandlers = () => {
  ipcMain.handle('software:list', async (): Promise<TrackedSoftware[]> => {
    return readTrackedSoftware();
  });

  ipcMain.handle(
    'software:add',
    async (_event, input: AddSoftwareInput): Promise<TrackedSoftware[]> => {
      if (!isSoftwareKind(input.kind)) {
        throw new Error('Unsupported software kind.');
      }

      const trackedSoftware = await readTrackedSoftware();
      const existingIndex = trackedSoftware.findIndex(
        (software) => software.kind === input.kind,
      );

      if (existingIndex >= 0) {
        trackedSoftware[existingIndex] = await checkTrackedSoftware(
          trackedSoftware[existingIndex],
        );
      } else {
        trackedSoftware.push(
          await checkTrackedSoftware(createTrackedSoftware(input.kind, input.name)),
        );
      }

      await writeTrackedSoftware(trackedSoftware);
      return trackedSoftware;
    },
  );

  ipcMain.handle(
    'software:delete',
    async (_event, id: string): Promise<TrackedSoftware[]> => {
      const trackedSoftware = await readTrackedSoftware();
      const updatedSoftware = trackedSoftware.filter((software) => software.id !== id);

      await writeTrackedSoftware(updatedSoftware);
      return updatedSoftware;
    },
  );

  ipcMain.handle('software:rescan-all', async (): Promise<TrackedSoftware[]> => {
    const trackedSoftware = await readTrackedSoftware();
    const updatedSoftware = await Promise.all(
      trackedSoftware.map((software) => checkTrackedSoftware(software)),
    );

    await writeTrackedSoftware(updatedSoftware);
    return updatedSoftware;
  });

  ipcMain.handle('software:open-download', async (_event, url: string): Promise<void> => {
    const trustedPrefixes = [
      'https://nodejs.org/',
      'https://www.python.org/',
      'https://adoptium.net/',
      'https://www.npmjs.com/package/@openai/codex',
    ];

    if (!trustedPrefixes.some((prefix) => url.startsWith(prefix))) {
      throw new Error('Untrusted download URL.');
    }

    await shell.openExternal(url);
  });

  ipcMain.handle('deps:open-analyzer', async (): Promise<void> => {
    const packageJsonPath = await pickPackageJson();

    if (!packageJsonPath) {
      return;
    }

    pendingDependencyReport = await analyzePackageJsonAtPath(packageJsonPath);
    createDependencyWindow();
  });

  ipcMain.handle('deps:get-report', async (): Promise<DependencyAnalysisReport> => {
    if (!pendingDependencyReport) {
      throw new Error('No dependency analysis is available.');
    }

    return pendingDependencyReport;
  });

  ipcMain.handle(
    'deps:rescan',
    async (_event, report: DependencyAnalysisReport): Promise<DependencyAnalysisReport> => {
      const updated = await rescanDependencies(report);
      pendingDependencyReport = updated;
      return updated;
    },
  );

  ipcMain.handle('deps:change-package-json', async (): Promise<DependencyAnalysisReport> => {
    const packageJsonPath = await pickPackageJson();

    if (!packageJsonPath) {
      throw new Error('File selection was canceled.');
    }

    const updated = await analyzePackageJsonAtPath(packageJsonPath);
    pendingDependencyReport = updated;
    return updated;
  });

  ipcMain.handle('deps:open-npm-package', async (_event, packageName: string): Promise<void> => {
    if (typeof packageName !== 'string' || !NPM_PACKAGE_NAME_PATTERN.test(packageName.trim())) {
      throw new Error('Invalid npm package name.');
    }

    const url = npmPackagePageUrl(packageName.trim());
    await shell.openExternal(url);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
