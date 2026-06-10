# WCAG 2.2 AA checklist (by principle)

Map common component work to WCAG success criteria. Not exhaustive — use Storybook a11y + manual keyboard pass.

## Perceivable

| Criterion | Apply to |
|-----------|----------|
| 1.1.1 Non-text content | Icons, avatars, images — text alternative or decorative `alt=""` |
| 1.3.1 Info and relationships | Headings, lists, tables, form labels |
| 1.4.3 Contrast (minimum) | Text, icons that convey meaning |
| 1.4.11 Non-text contrast | Buttons, inputs, focus rings |
| 1.4.13 Content on hover/focus | Tooltips, popovers — dismissible, hoverable, persistent |

## Operable

| Criterion | Apply to |
|-----------|----------|
| 2.1.1 Keyboard | All functionality without mouse |
| 2.1.2 No keyboard trap | Modals, menus |
| 2.4.3 Focus order | Tab sequence matches visual/logical order |
| 2.4.7 Focus visible | Focus ring not removed without replacement |
| 2.5.8 Target size (minimum) | Touch targets ~24×24 CSS px where feasible |

## Understandable

| Criterion | Apply to |
|-----------|----------|
| 3.2.2 On input | No unexpected context change on input alone |
| 3.3.1 Error identification | Form errors described in text |
| 3.3.2 Labels or instructions | Required fields marked |

## Robust

| Criterion | Apply to |
|-----------|----------|
| 4.1.2 Name, role, value | Custom widgets expose correct role/state |

## Component quick checks

| Component | Check |
|-----------|-------|
| Button / IconButton | Accessible name; disabled state exposed |
| Dialog | Focus trap, `aria-modal`, labelled title |
| Menu / dropdown | Arrow keys where appropriate; escape closes |
| List rows | Row activation keyboard-equivalent to click |
| Editor | Toolbar buttons labelled; content region identified |

## Storybook

Run axe on each story variant after visual changes — [a11y-testing.md](../storybook/a11y-testing.md).
