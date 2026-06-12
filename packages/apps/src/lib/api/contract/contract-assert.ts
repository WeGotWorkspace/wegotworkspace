import { expect } from "vitest";

export type FieldMappingCheck = {
  /** Dot path for failure messages (e.g. `settings.user.username`). */
  path: string;
  api: unknown;
  ui: unknown;
};

/**
 * Assert mapper output mirrors required OpenAPI fields.
 * Fails CI when a mapper stops forwarding a listed API value.
 */
export function assertFieldMappings(checks: FieldMappingCheck[]): void {
  for (const { path, api, ui } of checks) {
    expect(ui, `Mapper dropped or altered required API field at ${path}`).toStrictEqual(api);
  }
}
