import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotesUI } from "@/notes-ui/src/notes-ui";
import { notesStoryLabels } from "@/notes-ui/src/notes-app.stories.fixtures";
import type { NotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { clearWgwSession } from "@/lib/api/wgw/http";
import { fetchNotesLiveBootstrap } from "@/lib/api/wgw/notes";

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

function NotesUIFromLiveApiStory() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<NotesAppBootstrap | null>(null);

  useEffect(() => {
    let cancelled = false;
    clearWgwSession();
    setPhase("loading");
    setError(null);
    fetchNotesLiveBootstrap()
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
  }, []);

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 p-8 text-[color-mix(in_oklab,var(--color-ink)_65%,transparent)]">
        <p className="text-sm">Loading notes from WeGotWorkspace API…</p>
      </div>
    );
  }

  if (phase === "error" || !bootstrap) {
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
    <NotesUI
      data={bootstrap.data}
      session={bootstrap.session}
      labels={notesStoryLabels}
      logoutTo={false}
    />
  );
}

const meta: Meta<typeof NotesUIFromLiveApiStory> = {
  title: "Apps/Notes/Live API",
  component: NotesUIFromLiveApiStory,
  parameters: {
    layout: "fullscreen",
    routerPath: "/notes",
  },
};

export default meta;
type Story = StoryObj<typeof NotesUIFromLiveApiStory>;

export const FromWeGotWorkspace: Story = {
  render: () => <NotesUIFromLiveApiStory />,
};
