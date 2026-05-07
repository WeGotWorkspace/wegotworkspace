import { folderTokenFromMailboxLabel } from "@/lib/api/wgw/mail";
import type { MailUIData } from "@/mail-core/src/mail-types";
import type { Mail } from "@/types/mail";

/** Matches live mail: UI receives one mailbox list and splits sections internally. */
const MAILBOXES = ["Inbox", "Starred", "Sent", "Drafts", "Spam", "Archive", "Trash"] as const;

const folderOf = (mailbox: string) => folderTokenFromMailboxLabel(mailbox);

const MORE_MAILBOXES = [
  "Notes",
  "Newsletters",
  "Receipts",
  "Travel",
  "[Gmail]/All Mail",
  "[Gmail]/Important",
];

const INITIAL_MAIL: Mail[] = [
  {
    id: "m1",
    folder: folderOf("Inbox"),
    uid: 501,
    from: "Hana Ito",
    email: "hana@studio-meridian.jp",
    notebook: "Hana Ito",
    category: "Inbox",
    date: "10:42",
    title: "Revised proofs for the autumn issue",
    excerpt:
      "I've attached the second pass - the type sits better now, and we tightened the gutter…",
    body: [
      "I've attached the second pass - the type sits better now, and we tightened the gutter on the spreads you flagged.",
      "Let me know if the new heading weight reads warmer to you. I think it does, but I'd like a second pair of eyes before we send to print on Friday.",
      "Best,\nHana",
    ],
    tags: ["editorial"],
    wordCount: 92,
    mailbox: "Inbox",
    unread: true,
  },
  {
    id: "m2",
    folder: folderOf("Inbox"),
    uid: 502,
    from: "Marcus Whitfield",
    email: "marcus@quietmatter.co",
    notebook: "Marcus Whitfield",
    category: "Inbox",
    date: "Yesterday",
    title: "Re: dinner Thursday?",
    excerpt:
      "Eight works. There's a new place near the canal - I'll send the address tomorrow…",
    body: [
      "Eight works. There's a new place near the canal - I'll send the address tomorrow morning once I confirm with the others.",
      "Looking forward to it.",
    ],
    tags: ["personal"],
    wordCount: 28,
    mailbox: "Inbox",
    unread: true,
  },
  {
    id: "m3",
    folder: folderOf("Inbox"),
    uid: 503,
    from: "The Paper Quarterly",
    email: "newsletter@paperquarterly.com",
    notebook: "The Paper Quarterly",
    category: "Newsletter",
    date: "Mon",
    title: "Issue 47 - On the architecture of margins",
    excerpt:
      "This week, we visit a small bindery in Kyoto, examine a forgotten typeface, and ask whether…",
    body: [
      "This week, we visit a small bindery in Kyoto, examine a forgotten typeface, and ask whether the printed page still has a future in the age of the feed.",
      "Read the full issue on the web.",
    ],
    tags: ["reading"],
    wordCount: 41,
    mailbox: "Inbox",
    starred: true,
    unread: false,
  },
  {
    id: "m4",
    folder: folderOf("Inbox"),
    uid: 504,
    from: "Ada Pereira",
    email: "ada@northlight.design",
    notebook: "Ada Pereira",
    category: "Inbox",
    date: "30 Sep",
    title: "Studio visit next month",
    excerpt:
      "We'll be in town the week of the 21st. Coffee at the new place, perhaps a short studio visit…",
    body: [
      "We'll be in town the week of the 21st. Coffee at the new place, perhaps a short studio visit if you can spare an hour.",
      "Let me know what works.",
    ],
    tags: [],
    wordCount: 33,
    mailbox: "Inbox",
    unread: false,
  },
  {
    id: "m5",
    folder: folderOf("Sent"),
    uid: 201,
    from: "You",
    email: "elias@linden.studio",
    notebook: "You",
    category: "Sent",
    date: "08:12",
    title: "Re: Revised proofs for the autumn issue",
    excerpt:
      "Thanks Hana - taking a closer look this morning and will reply by lunch with notes…",
    body: ["Thanks Hana - taking a closer look this morning and will reply by lunch with notes."],
    tags: [],
    wordCount: 16,
    mailbox: "Sent",
    unread: false,
  },
  {
    id: "m6",
    folder: folderOf("Drafts"),
    uid: 1,
    from: "You",
    email: "elias@linden.studio",
    notebook: "You",
    category: "Draft",
    date: "Sat",
    title: "(no subject)",
    excerpt: "A few thoughts on the binding…",
    body: ["A few thoughts on the binding…"],
    tags: [],
    wordCount: 6,
    mailbox: "Drafts",
    unread: false,
  },
];

export function createMockMailSeedData(): MailUIData {
  const unreadByMailbox: Record<string, number> = {};
  for (const row of INITIAL_MAIL) {
    if (!row.unread) continue;
    unreadByMailbox[row.mailbox] = (unreadByMailbox[row.mailbox] ?? 0) + 1;
  }
  const allMailboxes = [...MAILBOXES, ...MORE_MAILBOXES];
  return {
    mail: INITIAL_MAIL,
    mailboxes: allMailboxes.map((label) => {
      const unreadCount = unreadByMailbox[label];
      return unreadCount === undefined ? { label } : { label, unreadCount };
    }),
  };
}
