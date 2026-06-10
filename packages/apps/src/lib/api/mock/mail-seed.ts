import { folderTokenFromMailboxLabel } from "@/lib/mail/folder-token";
import type { MailUIData } from "@/mail-core/src/mail-types";
import type { Mail } from "@/types/mail";

/** Matches live mail: UI receives one mailbox list and splits sections internally. */
const MAILBOXES = ["Inbox", "Starred", "Sent", "Drafts", "Spam", "Archive", "Trash"] as const;

const folderOf = (mailbox: string) => folderTokenFromMailboxLabel(mailbox);

/** Rich HTML body for Storybook / mock detail iframe (links, typography). */
export const MOCK_MAIL_DETAIL_HTML_BODY = `
<p>I've attached the second pass — the type sits better now, and we tightened the gutter on the spreads you flagged.</p>
<p>Please <a href="https://example.com/magic-login?token=demo-storybook">confirm your review</a> before we send to print on Friday. You can also <a href="mailto:hana@studio-meridian.jp">reply by email</a>.</p>
<p>Best,<br>Hana</p>
`.trim();

export const MOCK_MAIL_NEWSLETTER_HTML_BODY = `
<h2 style="margin:0 0 0.75rem;font-size:1.125rem;">Issue 47 — On the architecture of margins</h2>
<p>This week, we visit a small bindery in Kyoto, examine a forgotten typeface, and ask whether the printed page still has a future in the age of the feed.</p>
<p><a href="https://paperquarterly.com/issues/47">Read the full issue on the web</a>.</p>
`.trim();

export const MOCK_MAIL_REPLY_HTML_BODY = `
<p>Thanks Hana — taking a closer look this morning and will reply by lunch with notes.</p>
<p><a href="https://example.com/review/annotated-proof">Open annotated proof</a></p>
`.trim();

/** Mock list rows ship with full bodies; mark detail ready so the pane does not wait on fetch. */
function mockMailRow<T extends Mail>(row: T): T {
  return { ...row, detailLoaded: true };
}

const MORE_MAILBOXES = [
  "Notes",
  "Newsletters",
  "Receipts",
  "Travel",
  "[Gmail]/All Mail",
  "[Gmail]/Important",
];

const INITIAL_MAIL: Mail[] = [
  mockMailRow({
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
    bodyHtml: MOCK_MAIL_DETAIL_HTML_BODY,
    attachments: [
      { id: "a-1", name: "autumn-proof-v2.pdf", type: "application/pdf", size: 1_844_640 },
      { id: "a-2", name: "cover-options.zip", type: "application/zip", size: 8_612_944 },
    ],
  }),
  mockMailRow({
    id: "m2",
    folder: folderOf("Inbox"),
    uid: 502,
    from: "Marcus Whitfield",
    email: "marcus@quietmatter.co",
    notebook: "Marcus Whitfield",
    category: "Inbox",
    date: "Yesterday",
    title: "Re: dinner Thursday?",
    excerpt: "Eight works. There's a new place near the canal - I'll send the address tomorrow…",
    body: [
      "Eight works. There's a new place near the canal - I'll send the address tomorrow morning once I confirm with the others.",
      "Looking forward to it.",
    ],
    tags: ["personal"],
    wordCount: 28,
    mailbox: "Inbox",
    unread: true,
  }),
  mockMailRow({
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
    bodyHtml: MOCK_MAIL_NEWSLETTER_HTML_BODY,
  }),
  mockMailRow({
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
  }),
  mockMailRow({
    id: "m5",
    folder: folderOf("Sent"),
    uid: 201,
    from: "You",
    email: "elias@linden.studio",
    notebook: "You",
    category: "Sent",
    date: "08:12",
    title: "Re: Revised proofs for the autumn issue",
    excerpt: "Thanks Hana - taking a closer look this morning and will reply by lunch with notes…",
    body: ["Thanks Hana - taking a closer look this morning and will reply by lunch with notes."],
    tags: [],
    wordCount: 16,
    mailbox: "Sent",
    unread: false,
    bodyHtml: MOCK_MAIL_REPLY_HTML_BODY,
  }),
  mockMailRow({
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
  }),
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
