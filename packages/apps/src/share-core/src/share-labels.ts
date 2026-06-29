export const shareLabels = {
  appName: "Shared with you",
  loading: "Loading shared content…",
  errorTitle: "This link isn’t available",
  errorRetry: "Try again",
  needsConfirmationTitle: "Confirm your email to continue",
  needsConfirmationBody:
    "The owner shared this with specific people. Enter your email to receive a confirmation link.",
  emailPlaceholder: "you@example.com",
  requestAccess: "Request access",
  requestSentTitle: "Check your inbox",
  requestSentBody: "If you have access, we’ve emailed you a confirmation link.",
  confirmingTitle: "Confirming your access…",
  confirmErrorTitle: "We couldn’t confirm this link",
  confirmSuccessTitle: "You’re in",
  confirmSuccessBody: "Your access is confirmed. Continue to the shared content.",
  continue: "Continue",
  emptyFolder: "This folder is empty",
  folderLoading: "Loading folder…",
  download: "Download",
  uploadFiles: "Upload files",
  dropUploadHint: "Drop files to upload here",
  readOnlyNote: "You have view-only access.",
  back: "Back",
} as const;

export type ShareUILabels = typeof shareLabels;
