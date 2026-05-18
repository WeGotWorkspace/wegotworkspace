/** Storybook-only helpers (no-op handlers). */
export const STORY_NOOP = () => {};

export const storyBooleanControl = { control: "boolean" as const };
export const storyTextControl = { control: "text" as const };

type DriveStoryDocsOptions = {
  snippet?: string;
  componentDescription?: string;
};

export function driveStoryParameters(options: DriveStoryDocsOptions = {}) {
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
