/** Storybook-only helpers (no-op handlers). */
export const STORY_NOOP = () => {};
export const STORY_NOOP_ASYNC = async () => {};

export const storyBooleanControl = { control: "boolean" as const };
export const storyTextControl = { control: "text" as const };
export const storyNumberControl = (min: number, max: number, step = 1) => ({
  control: { type: "number" as const, min, max, step },
});

/** Enables Docs tab + props table for stories that include this tag. */
export const STORY_AUTODOCS_TAGS = ["autodocs"] as const;

/**
 * Storybook 10 requires a string **literal** for `meta.title` (no runtime helpers).
 * Use `Apps/Meet/Components/<ExportName>` or `Apps/Meet/Panes/<ExportName>` in each file.
 */
export type MeetComponentStoryTitle = `Apps/Meet/Components/${string}`;
export type MeetPaneStoryTitle = `Apps/Meet/Panes/${string}`;

type MeetStoryDocsOptions = {
  /** Shown in Docs / Code panel for copy-paste (required when using a custom `render`). */
  snippet?: string;
  componentDescription?: string;
};

/** Docs + copyable source snippet parameters. */
export function meetStoryParameters(options: MeetStoryDocsOptions = {}) {
  const parameters: {
    docs: {
      description?: { component: string };
      source: { type: "code"; code?: string };
    };
  } = {
    docs: {
      source: {
        type: "code",
        ...(options.snippet ? { code: options.snippet.trim() } : {}),
      },
    },
  };

  if (options.componentDescription) {
    parameters.docs.description = { component: options.componentDescription };
  }

  return parameters;
}
