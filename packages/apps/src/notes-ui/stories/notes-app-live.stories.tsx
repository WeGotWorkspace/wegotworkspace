import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";
import { notesStoryLabels } from "@/notes-core/src/notes-app.stories.fixtures";
import type { NotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { createWgwNotesApiSource } from "@/notes-core/src/notes-api-source";

/**
 * Hits the real WeGotWorkspace HTTP API (via Storybook’s `/api/v1` proxy).
 * Not the same as **FromOpenApiShapes**, which uses static in-repo fixtures only.
 */
function LiveHint() {
  return (
    <p className="text-xs text-[color-mix(in_oklab,var(--color-ink)_55%,transparent)]">
      Use the same{" "}
      <code className="rounded bg-[color-mix(in_oklab,var(--color-ink)_8%,transparent)] px-1">
        .env.local
      </code>{" "}
      as <code className="rounded px-1">npm run dev</code> (
      <code className="rounded px-1">VITE_WGW_DEV_*</code>,{" "}
      <code className="rounded px-1">WGW_PROXY_TARGET</code>). Storybook proxies{" "}
      <code className="rounded px-1">/api/v1</code> via{" "}
      <code className="rounded px-1">.storybook/main.ts</code>.
    </p>
  );
}

function NotesWorkspaceFromLiveApiStory() {
  const liveSource = useMemo(() => createWgwNotesApiSource(), []);
  const operations = useMemo(() => liveSource.createOperations(), [liveSource]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<NotesAppBootstrap | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setError(null);
    liveSource
      .loadBootstrap()
      .then((result) => {
        if (!cancelled) {
          setBootstrap(result);
          setPhase("ready");
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [liveSource]);

  if (phase === "error") {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 p-8 text-[var(--color-ink)]">
        <p className="text-sm font-medium">Live notes story could not load</p>
        <p className="text-sm text-[color-mix(in_oklab,var(--color-ink)_70%,transparent)]">
          {error}
        </p>
        <LiveHint />
      </div>
    );
  }

  return (
    <NotesWorkspace
      key={bootstrap ? "notes-live-ready" : "notes-live-loading"}
      data={
        bootstrap?.data ?? {
          notes: [],
          notebooks: [],
          tags: [],
        }
      }
      session={bootstrap?.session ?? mockWorkspaceSession}
      labels={notesStoryLabels}
      operations={operations}
      listLoading={phase === "loading"}
      logoutTo={false}
    />
  );
}

const meta: Meta<typeof NotesWorkspaceFromLiveApiStory> = {
  title: "Apps/Notes/Live API",
  component: NotesWorkspaceFromLiveApiStory,
  parameters: {
    layout: "fullscreen",
    routerPath: "/notes",
  },
};

export default meta;
type Story = StoryObj<typeof NotesWorkspaceFromLiveApiStory>;

export const FromWeGotWorkspace: Story = {
  render: () => <NotesWorkspaceFromLiveApiStory />,
};
