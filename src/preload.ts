import { contextBridge, ipcRenderer } from 'electron';
import type { AddSoftwareInput, TrackedSoftware } from './types';

contextBridge.exposeInMainWorld('versionTracker', {
  listSoftware: (): Promise<TrackedSoftware[]> => ipcRenderer.invoke('software:list'),
  addSoftware: (input: AddSoftwareInput): Promise<TrackedSoftware[]> =>
    ipcRenderer.invoke('software:add', input),
  deleteSoftware: (id: string): Promise<TrackedSoftware[]> =>
    ipcRenderer.invoke('software:delete', id),
  rescanAll: (): Promise<TrackedSoftware[]> =>
    ipcRenderer.invoke('software:rescan-all'),
  openDownload: (url: string): Promise<void> =>
    ipcRenderer.invoke('software:open-download', url),
});
