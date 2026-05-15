import { app, BrowserWindow, ipcMain, shell } from 'electron';
import crypto from 'node:crypto';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { readTrackedSoftware, writeTrackedSoftware } from './services/storage';
import { checkNodeVersion } from './services/versionCheck';
import type { AddSoftwareInput, TrackedSoftware } from './types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: 'Software Version Tracker',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

};

const createNodeSoftware = (name: string): TrackedSoftware => ({
  id: crypto.randomUUID(),
  name: name.trim() || 'Node.js',
  kind: 'nodejs',
  currentVersion: null,
  latestVersion: null,
  status: 'unknown',
  downloadUrl: 'https://nodejs.org/en/download',
  lastCheckedAt: null,
  error: null,
});

const registerIpcHandlers = () => {
  ipcMain.handle('software:list', async (): Promise<TrackedSoftware[]> => {
    return readTrackedSoftware();
  });

  ipcMain.handle(
    'software:add',
    async (_event, input: AddSoftwareInput): Promise<TrackedSoftware[]> => {
      if (input.kind !== 'nodejs') {
        throw new Error('Only Node.js tracking is supported in the MVP.');
      }

      const trackedSoftware = await readTrackedSoftware();
      const existingNodeIndex = trackedSoftware.findIndex(
        (software) => software.kind === 'nodejs',
      );

      if (existingNodeIndex >= 0) {
        trackedSoftware[existingNodeIndex] = await checkNodeVersion(
          trackedSoftware[existingNodeIndex],
        );
      } else {
        trackedSoftware.push(await checkNodeVersion(createNodeSoftware(input.name)));
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
      trackedSoftware.map((software) =>
        software.kind === 'nodejs' ? checkNodeVersion(software) : software,
      ),
    );

    await writeTrackedSoftware(updatedSoftware);
    return updatedSoftware;
  });

  ipcMain.handle('software:open-download', async (_event, url: string): Promise<void> => {
    if (!url.startsWith('https://nodejs.org/')) {
      throw new Error('Untrusted download URL.');
    }

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
