import type { InstallStepId } from "@/install-core/src/install-types";

export function installStepTitle(id: InstallStepId): string {
  switch (id) {
    case "welcome":
      return "Welcome";
    case "server":
      return "Check your server";
    case "database":
      return "Pick a database";
    case "dav":
      return "Enable Files, Contacts & Calendars";
    case "mail":
      return "Mail server";
    case "meet":
      return "Meet";
    case "admin":
      return "Create admin account";
    case "done":
      return "All done!";
  }
}

export function installStepSubtitle(id: InstallStepId): string {
  switch (id) {
    case "welcome":
      return "A short, guided setup. Takes about a minute.";
    case "server":
      return "Make sure your environment meets the requirements.";
    case "database":
      return "Choose where your data will live.";
    case "dav":
      return "Toggle the sync features you want to enable.";
    case "mail":
      return "Server addresses only - accounts are configured per user later.";
    case "meet":
      return "TURN settings used for Meet video calls.";
    case "admin":
      return "This account can manage everything in the server panel.";
    case "done":
      return "Your server is ready to go.";
  }
}
