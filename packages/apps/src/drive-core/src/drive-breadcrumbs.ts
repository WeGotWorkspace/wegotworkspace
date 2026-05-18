import type { PathBreadcrumbItem } from "@/path-breadcrumb/src/path-breadcrumb";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";

const GROUPS_ROOT = "Groups";

export function isDriveSharedGroupPath(path: string): boolean {
  return path === GROUPS_ROOT || path.startsWith(`${GROUPS_ROOT}/`);
}

export function buildDriveFolderBreadcrumbs(
  viewPath: string,
  labels: Pick<DriveUILabels, "sidebarSharedDrives">,
): PathBreadcrumbItem[] {
  if (viewPath === GROUPS_ROOT) {
    return [{ label: labels.sidebarSharedDrives, path: null }];
  }

  if (viewPath.startsWith(`${GROUPS_ROOT}/`)) {
    const relativeParts = viewPath.slice(`${GROUPS_ROOT}/`.length).split("/").filter(Boolean);
    return relativeParts.map((segment, index) => ({
      label: segment,
      path: `${GROUPS_ROOT}/${relativeParts.slice(0, index + 1).join("/")}`,
    }));
  }

  const parts = viewPath.split("/");
  return parts.map((segment, index) => ({
    label: segment,
    path: parts.slice(0, index + 1).join("/"),
  }));
}
