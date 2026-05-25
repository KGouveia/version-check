export const NPM_PACKAGE_NAME_PATTERN =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

export const isValidNpmPackageName = (packageName: string): boolean =>
  NPM_PACKAGE_NAME_PATTERN.test(packageName.trim());
