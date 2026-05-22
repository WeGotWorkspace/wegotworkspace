import { useState, type ReactNode } from "react";
import { Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  ChevronDown,
  Code,
  Highlighter,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Printer,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

type EditorChain = ReturnType<Editor["chain"]>;

function FormatBarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "markdown-editor-format-bar__btn",
        active && "markdown-editor-format-bar__btn--active",
      )}
    >
      {children}
    </button>
  );
}

const FormatBarSeparator = () => <div className="markdown-editor-format-bar__sep" />;

export type MarkdownEditorFormatBarProps = {
  editor: Editor | null;
  /** Show a print action that calls `window.print()`. */
  showPrint?: boolean;
  className?: string;
};

export function MarkdownEditorFormatBar({
  editor,
  showPrint = true,
  className,
}: MarkdownEditorFormatBarProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) =>
      ed
        ? {
            bold: ed.isActive("bold"),
            italic: ed.isActive("italic"),
            underline: ed.isActive("underline"),
            strike: ed.isActive("strike"),
            code: ed.isActive("code"),
            highlight: ed.isActive("highlight"),
            headingLevel:
              ([1, 2, 3, 4, 5, 6] as const).find((l) => ed.isActive("heading", { level: l })) ?? 0,
            bulletList: ed.isActive("bulletList"),
            orderedList: ed.isActive("orderedList"),
            taskList: ed.isActive("taskList"),
            blockquote: ed.isActive("blockquote"),
            link: ed.isActive("link"),
            canUndo: ed.can().undo(),
            canRedo: ed.can().redo(),
            currentHref: (ed.getAttributes("link") as { href?: string }).href ?? "",
          }
        : null,
  });

  if (!editor || !state) return null;

  const chain = (): EditorChain => editor.chain().focus();

  const openLinkDialog = () => {
    setLinkUrl(state.currentHref || "");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) {
      chain().unsetLink().run();
    } else {
      chain().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    chain().unsetLink().run();
    setLinkOpen(false);
  };

  return (
    <div className={cn("markdown-editor-format-bar no-print", className)}>
      <FormatBarButton title="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton title="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarSeparator />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Heading level"
            className={cn(
              "markdown-editor-format-bar__heading-trigger",
              state.headingLevel > 0 && "markdown-editor-format-bar__btn--active",
            )}
          >
            <span>{state.headingLevel > 0 ? `H${state.headingLevel}` : "Text"}</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[160px]">
          <DropdownMenuItem
            onClick={() => chain().setParagraph().run()}
            className={cn(state.headingLevel === 0 && "bg-accent text-accent-foreground")}
          >
            <span className="text-sm">Text</span>
          </DropdownMenuItem>
          {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
            <DropdownMenuItem
              key={lvl}
              onClick={() => chain().toggleHeading({ level: lvl }).run()}
              className={cn(state.headingLevel === lvl && "bg-accent text-accent-foreground")}
            >
              <span className="font-semibold" style={{ fontSize: `${1.3 - (lvl - 1) * 0.08}rem` }}>
                Heading {lvl}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <FormatBarSeparator />
      <FormatBarButton title="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Italic"
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Underline"
        active={state.underline}
        onClick={() => chain().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Strike"
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Inline code"
        active={state.code}
        onClick={() => chain().toggleCode().run()}
      >
        <Code className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Highlight"
        active={state.highlight}
        onClick={() => chain().toggleHighlight().run()}
      >
        <Highlighter className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarSeparator />
      <FormatBarButton
        title="Bullet list"
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Ordered list"
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Task list"
        active={state.taskList}
        onClick={() => chain().toggleTaskList().run()}
      >
        <ListChecks className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton
        title="Blockquote"
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton title="Divider" onClick={() => chain().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </FormatBarButton>
      <FormatBarButton title="Link" active={state.link} onClick={openLinkDialog}>
        <Link2 className="h-4 w-4" />
      </FormatBarButton>
      {showPrint ? (
        <div className="markdown-editor-format-bar__print">
          <button
            type="button"
            onClick={() => window.print()}
            className="markdown-editor-format-bar__print-btn"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      ) : null}

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{state.link ? "Edit link" : "Add link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">URL</label>
            <Input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
              placeholder="https://example.com"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {state.link ? (
              <Button type="button" variant="outline" onClick={removeLink}>
                Remove
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyLink}>
              {state.link ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
