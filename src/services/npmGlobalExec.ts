import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { childEnvWithNpmGlobalBin } from './npmGlobalEnv';

const execFileAsync = promisify(execFile);

const quoteCmdArg = (arg: string): string => {
  if (!/[\s"&|<>^]/.test(arg)) {
    return arg;
  }

  return `"${arg.replace(/"/g, '""')}"`;
};

export const runNpm = async (args: string[]): Promise<string> => {
  const env = childEnvWithNpmGlobalBin();

  if (process.platform === 'win32') {
    const comSpec = env.ComSpec || 'cmd.exe';
    const command = `npm ${args.map(quoteCmdArg).join(' ')}`;
    const { stdout } = await execFileAsync(comSpec, ['/d', '/s', '/c', command], {
      shell: false,
      windowsHide: true,
      env,
      maxBuffer: 16 * 1024 * 1024,
    });

    return stdout;
  }

  const { stdout } = await execFileAsync('npm', args, {
    shell: false,
    env,
    maxBuffer: 16 * 1024 * 1024,
  });

  return stdout;
};
