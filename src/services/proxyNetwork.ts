import { net, session } from 'electron';

export const initializeSystemProxy = async (): Promise<void> => {
  try {
    await session.defaultSession.setProxy({ mode: 'system' });
  } catch (error) {
    console.error('Failed to initialize system proxy:', error);
  }
};

export const proxyFetch: typeof fetch = (input, init) => {
  const url = input instanceof URL ? input.toString() : input;
  return net.fetch(url, init);
};
