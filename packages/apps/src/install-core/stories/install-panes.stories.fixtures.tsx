import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { createInstallAppBootstrap } from "@/lib/api/mock/install-bootstrap";
import type { InstallStepId, InstallerBackendStep } from "@/install-core/src/install-types";
import {
  useInstallController,
  type InstallControllerState,
} from "@/install-core/src/use-install-controller";
import { InstallStoryScope } from "./install-story-scope";

const BACKEND_STEP: Partial<Record<InstallStepId, InstallerBackendStep>> = {
  welcome: "welcome",
  server: "requirements",
  database: "database",
  dav: "site",
  admin: "account",
  done: "done",
};

/** Mail and meet are UI-only steps between site and account. */
const UI_ONLY_STEPS = new Set<InstallStepId>(["mail", "meet"]);

function createHarnessBootstrap(initialStep?: InstallStepId) {
  if (!initialStep || UI_ONLY_STEPS.has(initialStep)) {
    return createInstallAppBootstrap({ data: { state: null } });
  }

  const backend = BACKEND_STEP[initialStep];
  const base = createInstallAppBootstrap();
  if (!backend || !base.data.state) {
    return base;
  }

  return createInstallAppBootstrap({
    data: {
      state: {
        ...base.data.state,
        step: backend,
      },
    },
  });
}

export function InstallControllerHarness({
  initialStep,
  onReady,
  children,
}: {
  initialStep?: InstallStepId;
  onReady?: (controller: InstallControllerState) => void;
  children: (controller: InstallControllerState) => ReactNode;
}) {
  const bootstrap = useMemo(() => createHarnessBootstrap(initialStep), [initialStep]);
  const controller = useInstallController(bootstrap);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (initialStep && UI_ONLY_STEPS.has(initialStep)) {
      controller.setUiStep(initialStep);
    }
    onReadyRef.current?.(controller);
    // Story harness: seed controller once when the story mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <InstallStoryScope>{children(controller)}</InstallStoryScope>;
}
