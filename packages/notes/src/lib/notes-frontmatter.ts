export type NoteFrontmatter = {
  title: string;
  tags: string[];
  starred?: boolean;
};

export type ParsedMarkdownNote = {
  frontmatter: NoteFrontmatter;
  body: string;
};

function sanitizeLineBreaks(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseBoolean(raw: string): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function parseMarkdownNote(markdown: string, fallbackTitle: string): ParsedMarkdownNote {
  const normalized = sanitizeLineBreaks(markdown);
  const splitToken = "\n----\n";
  const idx = normalized.indexOf(splitToken);
  const headerText = idx >= 0 ? normalized.slice(0, idx) : "";
  const body = idx >= 0 ? normalized.slice(idx + splitToken.length) : normalized;
  const lines = headerText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let title = fallbackTitle;
  let tags: string[] = [];
  let starred: boolean | undefined;

  for (const line of lines) {
    const sep = line.indexOf(":");
    if (sep <= 0) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const rawValue = line.slice(sep + 1).trim();
    if (key === "title") {
      title = rawValue || fallbackTitle;
      continue;
    }
    if (key === "tags") {
      tags = rawValue
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }
    if (key === "starred") {
      starred = parseBoolean(rawValue);
    }
  }

  return {
    frontmatter: { title, tags, starred },
    body,
  };
}

function escapeFrontmatterValue(value: string): string {
  return value.replace(/\n/g, " ").trim();
}

export function serializeMarkdownNote(frontmatter: NoteFrontmatter, body: string): string {
  const lines = [
    `title: ${escapeFrontmatterValue(frontmatter.title || "Untitled")}`,
    `tags: ${frontmatter.tags.join(", ")}`,
  ];
  if (frontmatter.starred !== undefined) {
    lines.push(`starred: ${frontmatter.starred ? "true" : "false"}`);
  }

  const normalizedBody = sanitizeLineBreaks(body);
  return `${lines.join("\n")}\n----\n${normalizedBody}`;
}
