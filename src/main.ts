import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import crypto from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {
  dependencyAnalysisExportPath,
  formatDependencyAnalysisMarkdown,
} from './services/dependencyExport';
import {
  analyzeDependencies,
  rescanDependencies,
} from './services/dependencyVersionCheck';
import { checkGitVersion } from './services/gitVersionCheck';
import { checkJavaVersion } from './services/javaVersionCheck';
import { checkMavenVersion } from './services/mavenVersionCheck';
import {
  mavenDependencyAnalysisExportPath,
  formatMavenDependencyAnalysisMarkdown,
} from './services/mavenDependencyExport';
import {
  analyzeMavenDependencies,
  rescanMavenDependencies,
} from './services/mavenDependencyVersionCheck';
import { mavenArtifactPageUrl } from './services/mavenCentral';
import { parsePomXmlDependencies } from './services/pomXmlAnalyzer';
import { parsePackageJsonDependencies } from './services/packageJsonAnalyzer';
import {
  pipDependencyAnalysisExportPath,
  formatPipDependencyAnalysisMarkdown,
} from './services/pipDependencyExport';
import {
  analyzePipEnvironment,
  rescanPipDependencies,
} from './services/pipDependencyVersionCheck';
import { checkPythonVersion } from './services/pythonVersionCheck';
import { readTrackedSoftware, writeTrackedSoftware } from './services/storage';
import { initializeSystemProxy } from './services/proxyNetwork';
import { checkNodeVersion } from './services/versionCheck';
import { scanGlobalNpmModules } from './services/globalNpmVersionCheck';
import {
  canUpgradeGlobalNpmModule,
  resolveGlobalNpmUpgradeSpec,
} from './services/globalNpmUpgradePolicy';
import { scanGlobalPipModules } from './services/globalPipVersionCheck';
import {
  canUpgradeGlobalPipModule,
  resolveGlobalPipUpgradeSpec,
} from './services/globalPipUpgradePolicy';
import { upgradeGlobalNpmPackage } from './services/npmGlobalUpgrade';
import { upgradeGlobalPipPackage } from './services/pipGlobalUpgrade';
import { isValidNpmPackageName } from './constants/npmPackageName';
import { isValidPypiPackageName } from './constants/pypiPackageName';
import { npmPackagePageUrl } from './services/npmRegistry';
import { pypiPackagePageUrl } from './services/pypiRegistry';
import { SOFTWARE_KIND_LABELS } from './constants/softwareCatalog';
import type {
  AddSoftwareInput,
  DependencyAnalysisReport,
  GlobalNpmModulesReport,
  GlobalPipModulesReport,
  MavenDependencyAnalysisReport,
  PipDependencyAnalysisReport,
  SoftwareKind,
  TrackedSoftware,
} from './types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let pendingDependencyReport: DependencyAnalysisReport | null = null;
let dependencyWindow: BrowserWindow | null = null;
let pendingMavenDependencyReport: MavenDependencyAnalysisReport | null = null;
let mavenDependencyWindow: BrowserWindow | null = null;
let pendingPipDependencyReport: PipDependencyAnalysisReport | null = null;
let pipDependencyWindow: BrowserWindow | null = null;
let lastGlobalNpmReport: GlobalNpmModulesReport | null = null;
let lastGlobalPipReport: GlobalPipModulesReport | null = null;

const PYPI_PROJECT_URL_PREFIX = 'https://pypi.org/project/';

const MAVEN_COORDINATE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

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

const createMavenDependencyWindow = () => {
  if (mavenDependencyWindow && !mavenDependencyWindow.isDestroyed()) {
    mavenDependencyWindow.focus();
    mavenDependencyWindow.webContents.reload();
    return;
  }

  mavenDependencyWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Maven dependency versions',
    backgroundColor: '#09090b',
    webPreferences,
  });

  mavenDependencyWindow.on('closed', () => {
    mavenDependencyWindow = null;
  });

  loadRenderer(mavenDependencyWindow, 'maven-dependencies');
};

const createPipDependencyWindow = () => {
  if (pipDependencyWindow && !pipDependencyWindow.isDestroyed()) {
    pipDependencyWindow.focus();
    pipDependencyWindow.webContents.reload();
    return;
  }

  pipDependencyWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Pip dependency versions',
    backgroundColor: '#09090b',
    webPreferences,
  });

  pipDependencyWindow.on('closed', () => {
    pipDependencyWindow = null;
  });

  loadRenderer(pipDependencyWindow, 'pip-dependencies');
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

const pickPomXml = async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'pom.xml', extensions: ['xml'] }],
    title: 'Select pom.xml',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];

  if (path.basename(filePath) !== 'pom.xml') {
    throw new Error('Please select a file named pom.xml.');
  }

  return filePath;
};

const analyzePomAtPath = async (pomXmlPath: string): Promise<MavenDependencyAnalysisReport> => {
  const { projectLabel, dependencies } = await parsePomXmlDependencies(pomXmlPath);
  return analyzeMavenDependencies(pomXmlPath, projectLabel, dependencies);
};

const defaultDownloadUrl: Record<SoftwareKind, string> = {
  nodejs: 'https://nodejs.org/en/download',
  python: 'https://www.python.org/downloads/',
  java: 'https://openjdk.org/',
  maven: 'https://maven.apache.org/download.cgi',
  git: 'https://git-scm.com/download/win',
};

const createTrackedSoftware = (kind: SoftwareKind, name: string): TrackedSoftware => ({
  id: crypto.randomUUID(),
  name: name.trim() || SOFTWARE_KIND_LABELS[kind],
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
    case 'maven':
      return checkMavenVersion(software);
    case 'git':
      return checkGitVersion(software);
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
  value === 'maven' ||
  value === 'git';

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
      'https://openjdk.org/',
      'https://jdk.java.net/',
      'https://maven.apache.org/',
      'https://git-scm.com/',
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
    if (typeof packageName !== 'string' || !isValidNpmPackageName(packageName)) {
      throw new Error('Invalid npm package name.');
    }

    const url = npmPackagePageUrl(packageName.trim());
    await shell.openExternal(url);
  });

  ipcMain.handle(
    'deps:export-report',
    async (
      _event,
      report: DependencyAnalysisReport,
    ): Promise<{ filePath: string }> => {
      if (
        !report ||
        typeof report.packageJsonPath !== 'string' ||
        !report.packageJsonPath.trim()
      ) {
        throw new Error('Invalid dependency analysis report.');
      }

      const filePath = dependencyAnalysisExportPath(report.packageJsonPath);
      const content = formatDependencyAnalysisMarkdown(report);

      await writeFile(filePath, content, 'utf8');

      return { filePath };
    },
  );

  ipcMain.handle('maven-deps:open-analyzer', async (): Promise<void> => {
    const pomXmlPath = await pickPomXml();

    if (!pomXmlPath) {
      return;
    }

    pendingMavenDependencyReport = await analyzePomAtPath(pomXmlPath);
    createMavenDependencyWindow();
  });

  ipcMain.handle(
    'maven-deps:get-report',
    async (): Promise<MavenDependencyAnalysisReport> => {
      if (!pendingMavenDependencyReport) {
        throw new Error('No Maven dependency analysis is available.');
      }

      return pendingMavenDependencyReport;
    },
  );

  ipcMain.handle(
    'maven-deps:rescan',
    async (
      _event,
      report: MavenDependencyAnalysisReport,
    ): Promise<MavenDependencyAnalysisReport> => {
      const updated = await rescanMavenDependencies(report);
      pendingMavenDependencyReport = updated;
      return updated;
    },
  );

  ipcMain.handle(
    'maven-deps:change-pom',
    async (): Promise<MavenDependencyAnalysisReport> => {
      const pomXmlPath = await pickPomXml();

      if (!pomXmlPath) {
        throw new Error('File selection was canceled.');
      }

      const updated = await analyzePomAtPath(pomXmlPath);
      pendingMavenDependencyReport = updated;
      return updated;
    },
  );

  ipcMain.handle(
    'maven-deps:open-artifact',
    async (_event, groupId: string, artifactId: string): Promise<void> => {
      if (
        typeof groupId !== 'string' ||
        typeof artifactId !== 'string' ||
        !MAVEN_COORDINATE_PATTERN.test(groupId.trim()) ||
        !MAVEN_COORDINATE_PATTERN.test(artifactId.trim())
      ) {
        throw new Error('Invalid Maven coordinates.');
      }

      const url = mavenArtifactPageUrl(groupId.trim(), artifactId.trim());

      if (!url.startsWith('https://central.sonatype.com/artifact/')) {
        throw new Error('Untrusted artifact URL.');
      }

      await shell.openExternal(url);
    },
  );

  ipcMain.handle(
    'maven-deps:export-report',
    async (
      _event,
      report: MavenDependencyAnalysisReport,
    ): Promise<{ filePath: string }> => {
      if (!report || typeof report.pomXmlPath !== 'string' || !report.pomXmlPath.trim()) {
        throw new Error('Invalid Maven dependency analysis report.');
      }

      const filePath = mavenDependencyAnalysisExportPath(report.pomXmlPath);
      const content = formatMavenDependencyAnalysisMarkdown(report);

      await writeFile(filePath, content, 'utf8');

      return { filePath };
    },
  );

  ipcMain.handle('pip-deps:open-analyzer', async (): Promise<void> => {
    pendingPipDependencyReport = await analyzePipEnvironment();
    createPipDependencyWindow();
  });

  ipcMain.handle(
    'pip-deps:get-report',
    async (): Promise<PipDependencyAnalysisReport> => {
      if (!pendingPipDependencyReport) {
        throw new Error('No pip dependency analysis is available.');
      }

      return pendingPipDependencyReport;
    },
  );

  ipcMain.handle(
    'pip-deps:rescan',
    async (
      _event,
      report: PipDependencyAnalysisReport,
    ): Promise<PipDependencyAnalysisReport> => {
      const updated = await rescanPipDependencies(report);
      pendingPipDependencyReport = updated;
      return updated;
    },
  );

  ipcMain.handle(
    'pip-deps:export-report',
    async (
      _event,
      report: PipDependencyAnalysisReport,
    ): Promise<{ filePath: string }> => {
      if (
        !report ||
        typeof report.pythonPipInvoke !== 'string' ||
        !report.pythonPipInvoke.trim()
      ) {
        throw new Error('Invalid pip dependency analysis report.');
      }

      const filePath = pipDependencyAnalysisExportPath(app.getPath('appData'));
      await mkdir(path.dirname(filePath), { recursive: true });
      const content = formatPipDependencyAnalysisMarkdown(report);

      await writeFile(filePath, content, 'utf8');

      return { filePath };
    },
  );

  ipcMain.handle('global-npm:scan', async (): Promise<GlobalNpmModulesReport> => {
    const report = await scanGlobalNpmModules();
    lastGlobalNpmReport = report;
    return report;
  });

  ipcMain.handle(
    'global-npm:upgrade',
    async (_event, packageName: string): Promise<GlobalNpmModulesReport> => {
      if (typeof packageName !== 'string' || !isValidNpmPackageName(packageName)) {
        throw new Error('Invalid npm package name.');
      }

      const trimmed = packageName.trim();
      const moduleEntry = lastGlobalNpmReport?.modules.find(
        (module) => module.name === trimmed,
      );

      if (!moduleEntry) {
        throw new Error('Package is not in the current global npm scan.');
      }

      if (!canUpgradeGlobalNpmModule(moduleEntry)) {
        throw new Error('No upgrade is available for this package.');
      }

      await upgradeGlobalNpmPackage(trimmed, resolveGlobalNpmUpgradeSpec(moduleEntry));

      const report = await scanGlobalNpmModules();
      lastGlobalNpmReport = report;
      return report;
    },
  );

  ipcMain.handle('global-pip:scan', async (): Promise<GlobalPipModulesReport> => {
    const report = await scanGlobalPipModules();
    lastGlobalPipReport = report;
    return report;
  });

  ipcMain.handle(
    'global-pip:upgrade',
    async (_event, packageName: string): Promise<GlobalPipModulesReport> => {
      if (typeof packageName !== 'string' || !isValidPypiPackageName(packageName)) {
        throw new Error('Invalid PyPI package name.');
      }

      const trimmed = packageName.trim();
      const moduleEntry = lastGlobalPipReport?.modules.find(
        (module) => module.name === trimmed,
      );

      if (!moduleEntry) {
        throw new Error('Package is not in the current pip environment scan.');
      }

      if (!canUpgradeGlobalPipModule(moduleEntry)) {
        throw new Error('No upgrade is available for this package.');
      }

      await upgradeGlobalPipPackage(trimmed, resolveGlobalPipUpgradeSpec(moduleEntry));

      const report = await scanGlobalPipModules();
      lastGlobalPipReport = report;
      return report;
    },
  );

  ipcMain.handle(
    'global-pip:open-package',
    async (_event, packageName: string): Promise<void> => {
      if (typeof packageName !== 'string' || !isValidPypiPackageName(packageName)) {
        throw new Error('Invalid PyPI package name.');
      }

      const url = pypiPackagePageUrl(packageName.trim());

      if (!url.startsWith(PYPI_PROJECT_URL_PREFIX)) {
        throw new Error('Refusing to open untrusted PyPI URL.');
      }

      await shell.openExternal(url);
    },
  );
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  await initializeSystemProxy();
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
