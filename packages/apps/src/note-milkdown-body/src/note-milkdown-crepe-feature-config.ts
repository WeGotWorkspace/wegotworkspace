import type { Ctx } from "@milkdown/kit/ctx";
import type { NodeType } from "@milkdown/kit/prose/model";
import { toggleLinkCommand } from "@milkdown/kit/component/link-tooltip";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import {
  bulletListSchema,
  emphasisSchema,
  isMarkSelectedCommand,
  linkSchema,
  orderedListSchema,
  strongSchema,
  toggleEmphasisCommand,
  toggleStrongCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { findParentNode } from "@milkdown/kit/prose";

import { CrepeFeature, type CrepeConfig } from "@milkdown/crepe";

import {
  milkdownUnderlineSchema,
  milkdownUnderlineToggleCommand,
} from "@/note-milkdown-body/src/note-underline-mark";
import {
  noteMilkdownToolbarBoldIcon,
  noteMilkdownToolbarBulletListIcon,
  noteMilkdownToolbarItalicIcon,
  noteMilkdownToolbarLinkIcon,
  noteMilkdownToolbarOrderedListIcon,
  noteMilkdownToolbarUnderlineIcon,
} from "@/note-milkdown-body/src/note-milkdown-toolbar-icons";

function hasAncestorOfType(ctx: Ctx, type: NodeType): boolean {
  const view = ctx.get(editorViewCtx);
  return Boolean(findParentNode((node) => node.type === type)(view.state.selection));
}

/**
 * Tweaks Creper: trim selection toolbar / slash menus; lists on the toolbar (no blockquote).
 *
 * Toolbar: bold/italic/underline only (no strikethrough); link + lists in other groups.
 */
export function noteMilkdownCrepeFeatureConfigs(): NonNullable<CrepeConfig["featureConfigs"]> {
  return {
    [CrepeFeature.BlockEdit]: {
      advancedGroup: { codeBlock: null },
      textGroup: {
        h1: null,
        h2: null,
        h3: null,
        h4: null,
        h5: null,
        h6: null,
      },
    },

    [CrepeFeature.Toolbar]: {
      buildToolbar: (groupBuilder) => {
        groupBuilder
          .getGroup("formatting")
          .clear()
          .addItem("bold", {
            icon: noteMilkdownToolbarBoldIcon,
            active: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              return commands.call(isMarkSelectedCommand.key, strongSchema.type(ctx));
            },
            onRun: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(toggleStrongCommand.key);
            },
          })
          .addItem("italic", {
            icon: noteMilkdownToolbarItalicIcon,
            active: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              return commands.call(isMarkSelectedCommand.key, emphasisSchema.type(ctx));
            },
            onRun: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(toggleEmphasisCommand.key);
            },
          })
          .addItem("underline", {
            icon: noteMilkdownToolbarUnderlineIcon,
            active: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              return commands.call(isMarkSelectedCommand.key, milkdownUnderlineSchema.type(ctx));
            },
            onRun: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(milkdownUnderlineToggleCommand.key);
            },
          });

        groupBuilder
          .getGroup("function")
          .clear()
          .addItem("link", {
            icon: noteMilkdownToolbarLinkIcon,
            active: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              return commands.call(isMarkSelectedCommand.key, linkSchema.type(ctx));
            },
            onRun: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(toggleLinkCommand.key);
            },
          });

        groupBuilder
          .addGroup("structure", "Structure")
          .addItem("bullet-list", {
            icon: noteMilkdownToolbarBulletListIcon,
            active: (ctx: Ctx) => hasAncestorOfType(ctx, bulletListSchema.type(ctx)),
            onRun: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(wrapInBlockTypeCommand.key, {
                nodeType: bulletListSchema.type(ctx),
              });
            },
          })
          .addItem("ordered-list", {
            icon: noteMilkdownToolbarOrderedListIcon,
            active: (ctx: Ctx) => hasAncestorOfType(ctx, orderedListSchema.type(ctx)),
            onRun: (ctx: Ctx) => {
              const commands = ctx.get(commandsCtx);
              commands.call(wrapInBlockTypeCommand.key, {
                nodeType: orderedListSchema.type(ctx),
              });
            },
          });
      },
    },
  };
}
