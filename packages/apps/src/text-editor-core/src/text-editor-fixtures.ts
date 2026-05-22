/** Demo HTML for email-style rich text previews. */
export const TEXT_EDITOR_DEMO_HTML = `
<h1>Untitled document</h1>
<p>Welcome to the text editor. Type <code>/</code> on a new line to summon the block menu, or select text to format it from the toolbar above.</p>
<h2>Try these things</h2>
<ul>
  <li>Press <code>/</code> to insert headings, lists, quotes, dividers or code.</li>
  <li>Format text with the toolbar above.</li>
</ul>
<blockquote>Great writing is iteration. Capture thinking, then sharpen it together.</blockquote>
<h3>Print-ready layout</h3>
<p>The page is sized to <strong>US Letter</strong> with one-inch margins so what you see is what prints.</p>
<h3>Tables</h3>
<p>Hover the table edges to add rows or columns, or grab the side handles to reorder and remove.</p>
<table>
  <tbody>
    <tr>
      <th><p>Quarter</p></th>
      <th><p>Revenue</p></th>
      <th><p>Status</p></th>
    </tr>
    <tr>
      <td><p>Q1</p></td>
      <td><p>$120k</p></td>
      <td><p>On track</p></td>
    </tr>
    <tr>
      <td><p>Q2</p></td>
      <td><p>$148k</p></td>
      <td><p>Ahead</p></td>
    </tr>
  </tbody>
</table>
`.trim();

/** Demo Markdown for notes-style editing previews. */
export const TEXT_EDITOR_DEMO_MARKDOWN = `
# Untitled note

Welcome to the text editor. Type \`/\` on a new line for the block menu, or select text to format it from the toolbar.

## Try these things

- Press \`/\` to insert headings, lists, quotes, dividers, or code.
- Format text with the toolbar above.

> Great writing is iteration. Capture thinking, then sharpen it together.

### Task list

- [ ] Draft outline
- [x] Share with team

### Table

| Quarter | Revenue | Status   |
| ------- | ------- | -------- |
| Q1      | $120k   | On track |
| Q2      | $148k   | Ahead    |
`.trim();

export function textEditorDemoContent(format: "html" | "markdown"): string {
  return format === "markdown" ? TEXT_EDITOR_DEMO_MARKDOWN : TEXT_EDITOR_DEMO_HTML;
}
