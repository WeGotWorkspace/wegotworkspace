import { describe, expect, it } from "vitest";
import {
  bumpJoinGeneration,
  bumpReconnectGeneration,
  createTeardownResetState,
  createTeardownUiReset,
  isJoinGenerationCurrent,
  isReconnectGenerationCurrent,
} from "./docs-collab-join-lifecycle";

describe("docs-collab-join-lifecycle", () => {
  it("generation guards detect stale operations", () => {
    const joinGen = { current: 2 };
    const reconnectGen = { current: 3 };
    expect(isJoinGenerationCurrent(2, joinGen)).toBe(true);
    expect(isJoinGenerationCurrent(1, joinGen)).toBe(false);
    expect(isReconnectGenerationCurrent(3, reconnectGen)).toBe(true);
    expect(isReconnectGenerationCurrent(2, reconnectGen)).toBe(false);
  });

  it("bumps generation counters", () => {
    const joinGen = { current: 0 };
    const reconnectGen = { current: 0 };
    expect(bumpJoinGeneration(joinGen)).toBe(1);
    expect(bumpReconnectGeneration(reconnectGen)).toBe(1);
  });

  it("createTeardownResetState returns initial ref values", () => {
    const state = createTeardownResetState();
    expect(state.seedDone).toBe(false);
    expect(state.pendingServerSave).toBe(false);
    expect(state.lastSuccessfulSaveSignature).toBeNull();
    expect(state.reconnectInFlight).toBe(false);
  });

  it("createTeardownUiReset returns disconnected defaults", () => {
    const ui = createTeardownUiReset();
    expect(ui.session).toBeNull();
    expect(ui.joined).toBe(false);
    expect(ui.status).toBe("Disconnected");
    expect(ui.pendingSync).toBe(false);
  });
});
