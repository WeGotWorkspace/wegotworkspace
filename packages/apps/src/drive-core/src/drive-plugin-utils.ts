import type { WgwPluginDescriptor } from "@/drive-core/src/drive-types";

export function findDrivePluginForExtension(
  plugins: WgwPluginDescriptor[],
  ext: string,
): WgwPluginDescriptor | undefined {
  const normalized = ext.toLowerCase();
  return plugins.find(
    (plugin) =>
      plugin.active &&
      plugin.drive?.openFileExtensions?.some(
        (candidate) => candidate.toLowerCase() === normalized,
      ) &&
      plugin.drive.openFileRoute &&
      plugin.drive.openFileQueryParam,
  );
}

export function findDrivePluginWithTemplates(
  plugins: WgwPluginDescriptor[],
): WgwPluginDescriptor | undefined {
  return plugins.find(
    (plugin) =>
      plugin.active &&
      plugin.drive?.openFileRoute &&
      (plugin.drive.newFileTemplates?.length ?? 0) > 0,
  );
}
