import type { MeetApiSource } from "@/meet-core/src/meet-api-source";

export type MeetAppProps = {
  /** When set (e.g. guest route or Storybook live story), bypasses default API routing. */
  source?: MeetApiSource;
};
