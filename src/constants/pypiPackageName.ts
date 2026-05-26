import { normalizePypiPackageName } from '../services/pypiRegistry';

/** PEP 503–style normalized name: letters, digits, hyphens, underscores, dots. */
const PYPI_PACKAGE_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

export const isValidPypiPackageName = (packageName: string): boolean => {
  const normalized = normalizePypiPackageName(packageName);

  return normalized.length > 0 && PYPI_PACKAGE_NAME_PATTERN.test(normalized);
};
