import path from 'node:path';

/**
 * npm global binaries on Windows live under %APPDATA%\\npm. GUI-launched Electron
 * sometimes inherits a slimmer PATH than an interactive shell; ensure that folder is visible.
 */
export const childEnvWithNpmGlobalBin = (): NodeJS.ProcessEnv => {
  const env = { ...process.env } as NodeJS.ProcessEnv;

  if (process.platform !== 'win32' || !env.APPDATA) {
    return env;
  }

  const npmBin = path.join(env.APPDATA, 'npm');
  const current = env.PATH ?? env.Path ?? '';

  if (!current.toLowerCase().includes(npmBin.toLowerCase())) {
    const next = `${npmBin}${path.delimiter}${current}`;
    env.PATH = next;
    env.Path = next;
  }

  return env;
};
