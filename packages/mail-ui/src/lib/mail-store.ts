// Mock IMAP-like store backed by localStorage.
// Replace `loadInitial` / persistence functions later with real IMAP calls.

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  system?: "inbox" | "sent" | "drafts" | "trash" | "spam" | "archive";
  /** IMAP virtual mailboxes (e.g. Starred aggregate). */
  virtual?: boolean;
  unread?: number;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  /** IMAP MIME section (e.g. {@code "2"} or {@code "1.3"}) when loaded from the server. */
  part?: string;
  dataUrl?: string;
};

export type Message = {
  id: string;
  folderId: string;
  /** Real IMAP mailbox (UTF-8 path) when using server mode; used for PATCH/move. */
  mailbox?: string;
  from: { name: string; email: string };
  to: { name?: string; email: string }[];
  cc?: { name?: string; email: string }[];
  bcc?: { name?: string; email: string }[];
  subject: string;
  preview: string;
  body: string; // plain text (reply/forward)
  /** Rich body from multipart/alternative {@code text/html}; shown in a sandboxed iframe when set. */
  bodyHtml?: string;
  date: string; // ISO
  read: boolean;
  starred: boolean;
  attachments: Attachment[];
  threadId?: string;
};

const KEY_FOLDERS = "webmail.folders.v1";
const KEY_MESSAGES = "webmail.messages.v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function seedFolders(): Folder[] {
  return [
    { id: "inbox", name: "Inbox", parentId: null, system: "inbox", unread: 3 },
    { id: "starred", name: "Starred", parentId: null, virtual: true },
    { id: "sent", name: "Sent", parentId: null, system: "sent" },
    { id: "drafts", name: "Drafts", parentId: null, system: "drafts" },
    { id: "archive", name: "Archive", parentId: null, system: "archive" },
    { id: "spam", name: "Spam", parentId: null, system: "spam" },
    { id: "trash", name: "Trash", parentId: null, system: "trash" },
    { id: "f-clients", name: "Clients", parentId: null },
    { id: "f-clients-acme", name: "Acme Corp", parentId: "f-clients" },
    { id: "f-personal", name: "Personal", parentId: null },
  ];
}

function seedMessages(): Message[] {
  const now = Date.now();
  const mk = (i: number, m: Partial<Message>): Message => ({
    id: uid(),
    folderId: "inbox",
    from: { name: "Unknown", email: "x@x.com" },
    to: [{ email: "you@inkmail.app" }],
    subject: "(no subject)",
    preview: "",
    body: "",
    date: new Date(now - i * 3600_000).toISOString(),
    read: false,
    starred: false,
    attachments: [],
    ...m,
  });
  return [
    mk(0, {
      from: { name: "Margaux Lévêque", email: "margaux@studio-noir.fr" },
      subject: "Re: Spring campaign — final approvals",
      preview: "Looks great. One small nit on the cover spread typography…",
      body: "Hi,\n\nLooks great. One small nit on the cover spread typography — the leading on the H1 feels a touch tight. Can we try +2px?\n\nOtherwise approved on my end. Sending to print Friday unless I hear back.\n\n— M",
      read: false,
    }),
    mk(2, {
      from: { name: "Acme Corp Billing", email: "billing@acme.co" },
      subject: "Invoice #2046 — paid",
      preview: "Thank you. Your payment of $4,200.00 has been received.",
      body: "Thank you. Your payment of $4,200.00 for invoice #2046 has been received and applied to your account.\n\nReceipt attached.",
      attachments: [{ id: uid(), name: "receipt-2046.pdf", size: 84210, type: "application/pdf" }],
      read: false,
      folderId: "inbox",
    }),
    mk(5, {
      from: { name: "Github", email: "noreply@github.com" },
      subject: "[lovable/webmail] PR #14 ready for review",
      preview: "kai opened a pull request: 'Add IMAP mailbox rename support'…",
      body: "kai opened a pull request:\n\n  Add IMAP mailbox rename support (#14)\n\n2 files changed, 47 additions, 3 deletions.",
      read: false,
    }),
    mk(8, {
      from: { name: "Yusuf Okafor", email: "yusuf@northbound.studio" },
      subject: "coffee tuesday?",
      preview: "Hey — free for a coffee Tuesday around 3? New place on Rivington.",
      body: "Hey — free for a coffee Tuesday around 3? New place on Rivington that's supposed to be excellent.\n\ny",
      read: true,
    }),
    mk(28, {
      from: { name: "The Browser", email: "hello@thebrowser.com" },
      subject: "Five things worth your attention this week",
      preview: "Including a long read on the politics of typefaces, and a new…",
      body: "Including a long read on the politics of typefaces, a new translation of Borges, and the best essay we've published all year.",
      read: true,
    }),
    mk(48, {
      from: { name: "You", email: "you@inkmail.app" },
      to: [{ name: "Margaux", email: "margaux@studio-noir.fr" }],
      subject: "Spring campaign — final approvals",
      preview: "Hi Margaux, attaching the final boards for your sign-off…",
      body: "Hi Margaux,\n\nAttaching the final boards for your sign-off. Let me know if anything needs another pass.\n\nThanks,\nyou",
      folderId: "sent",
      read: true,
    }),
  ];
}

function load<T>(key: string, seed: () => T): T {
  if (typeof localStorage === "undefined") return seed();
  const raw = localStorage.getItem(key);
  if (!raw) {
    const s = seed();
    localStorage.setItem(key, JSON.stringify(s));
    return s;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return seed();
  }
}

function save<T>(key: string, value: T) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const mailStore = {
  getFolders(): Folder[] {
    return load(KEY_FOLDERS, seedFolders);
  },
  setFolders(folders: Folder[]) {
    save(KEY_FOLDERS, folders);
  },
  getMessages(): Message[] {
    return load(KEY_MESSAGES, seedMessages);
  },
  setMessages(messages: Message[]) {
    save(KEY_MESSAGES, messages);
  },
  newId: uid,
};

