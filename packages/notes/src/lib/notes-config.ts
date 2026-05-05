export type NotesInjectedConfig = {
  baseUri: string;
  username: string;
  displayName: string;
  logoutUrl: string;
  notesPath: string;
};

type NotesWindow = Window & { __SABRE_NOTES_CONFIG__?: Partial<NotesInjectedConfig> };

export function readNotesConfig(): NotesInjectedConfig {
  if (typeof window === "undefined") {
    throw new Error("Notes config is only available in the browser.");
  }
  const cfg = (window as NotesWindow).__SABRE_NOTES_CONFIG__;
  if (!cfg || typeof cfg.baseUri !== "string" || typeof cfg.username !== "string") {
    throw new Error("Missing notes runtime config.");
  }
  return {
    baseUri: cfg.baseUri,
    username: cfg.username,
    displayName:
      typeof cfg.displayName === "string" && cfg.displayName.trim() !== ""
        ? cfg.displayName.trim()
        : cfg.username,
    logoutUrl: typeof cfg.logoutUrl === "string" ? cfg.logoutUrl : "/logout/",
    notesPath: typeof cfg.notesPath === "string" ? cfg.notesPath : "/notes/",
  };
}
