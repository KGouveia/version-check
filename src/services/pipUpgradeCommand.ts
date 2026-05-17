export const formatPipUpgradeCommand = (
  pythonPipInvoke: string,
  packageName: string,
  targetVersion: string,
): string =>
  `${pythonPipInvoke} install --upgrade "${packageName}==${targetVersion}"`;
