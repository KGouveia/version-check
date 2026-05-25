import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { TrackedSoftware } from '../types';

const storageDirectoryName = 'Software Version Tracker';
const storageFileName = 'tracked_software.json';

const getStorageFilePath = () =>
  path.join(app.getPath('appData'), storageDirectoryName, storageFileName);

const ensureStorageFile = async () => {
  const storageFilePath = getStorageFilePath();

  await mkdir(path.dirname(storageFilePath), { recursive: true });

  try {
    await readFile(storageFilePath, 'utf8');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      await writeFile(storageFilePath, '[]', 'utf8');
      return;
    }

    throw error;
  }
};

export const readTrackedSoftware = async (): Promise<TrackedSoftware[]> => {
  await ensureStorageFile();

  try {
    const fileContents = await readFile(getStorageFilePath(), 'utf8');
    const parsed = JSON.parse(fileContents);

    if (!Array.isArray(parsed)) {
      console.error('Tracked software storage did not contain an array.');
      return [];
    }

    return (parsed as TrackedSoftware[]).filter(
      (software) => (software.kind as string) !== 'codex-cli',
    );
  } catch (error) {
    console.error('Unable to read tracked software storage.', error);
    return [];
  }
};

export const writeTrackedSoftware = async (
  trackedSoftware: TrackedSoftware[],
): Promise<void> => {
  await ensureStorageFile();
  await writeFile(
    getStorageFilePath(),
    JSON.stringify(trackedSoftware, null, 2),
    'utf8',
  );
};
