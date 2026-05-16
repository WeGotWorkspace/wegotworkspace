import type { DriveApiSource } from "@/drive-core/src/drive-api-source";

export type DriveAppProps = {
  /** When set (e.g. Storybook live story), bypasses default API routing. */
  apiSource?: DriveApiSource;
};
