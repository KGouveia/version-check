import { isValidNpmPackageName } from '../constants/npmPackageName';
import { normalizeVersion } from './semver';
import { runNpm } from './npmGlobalExec';

export interface GlobalNpmListEntry {
  name: string;
  installedVersion: string;
}

interface NpmListDependencyNode {
  version?: string;
}

interface NpmListJson {
  dependencies?: Record<string, NpmListDependencyNode>;
}

const parseInstalledVersion = (raw: string): string | null => {
  const trimmed = raw.trim();
  const fromAt = trimmed.match(/@(\d+\.\d+\.\d+[^@\s]*)$/);

  if (fromAt?.[1]) {
    return fromAt[1];
  }

  const core = normalizeVersion(trimmed).match(/^(\d+\.\d+\.\d+)/);

  return core?.[1] ?? null;
};

export const listGlobalNpmPackages = async (): Promise<{
  packages: GlobalNpmListEntry[];
  listError: string | null;
}> => {
  try {
    const stdout = await runNpm(['list', '-g', '--depth=0', '--json']);
    const parsed = JSON.parse(stdout) as NpmListJson;
    const dependencies = parsed.dependencies;

    if (!dependencies || typeof dependencies !== 'object') {
      return { packages: [], listError: null };
    }

    const packages: GlobalNpmListEntry[] = [];

    for (const [name, node] of Object.entries(dependencies)) {
      if (!isValidNpmPackageName(name)) {
        continue;
      }

      const versionRaw = node?.version;

      if (typeof versionRaw !== 'string' || !versionRaw.trim()) {
        continue;
      }

      const installedVersion = parseInstalledVersion(versionRaw);

      if (!installedVersion) {
        continue;
      }

      packages.push({ name, installedVersion });
    }

    packages.sort((a, b) => a.name.localeCompare(b.name));

    return { packages, listError: null };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to list global npm packages.';

    return { packages: [], listError: message };
  }
};
