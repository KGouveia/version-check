export const normalizeJavaForCompare = (version: string): string => {
  const withoutBuildSuffix = version.split('-')[0];
  const legacyMatch = withoutBuildSuffix.match(/^1\.8\.0_(\d+)$/);

  if (legacyMatch?.[1]) {
    return `8.0.${legacyMatch[1]}`;
  }

  return version;
};
