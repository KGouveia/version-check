import type { AddSoftwareInput, TrackedSoftware } from './types';

declare global {
  interface Window {
    versionTracker: {
      listSoftware: () => Promise<TrackedSoftware[]>;
      addSoftware: (input: AddSoftwareInput) => Promise<TrackedSoftware[]>;
      deleteSoftware: (id: string) => Promise<TrackedSoftware[]>;
      rescanAll: () => Promise<TrackedSoftware[]>;
      openDownload: (url: string) => Promise<void>;
    };
  }
}

export {};
