import type { CSSProperties } from "react";
import { EditableText } from "@/editable-text/src/editable-text";
import { Tag, type TagProps } from "@/tag/src/tag";

export type DetailViewHeaderTag = Pick<TagProps, "label" | "icon" | "colors"> & {
  key?: string;
  wrapperClassName?: string;
};

type DetailViewHeaderProps = {
  topTags?: DetailViewHeaderTag[];
  title: string;
  editable?: boolean;
  onTitleChange?: (value: string) => void;
  titleKey?: string;
  emptyTitleLabel?: string;
  titlePlaceholder?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
};

export function DetailViewHeader({
  topTags = [],
  title,
  editable = false,
  onTitleChange,
  titleKey,
  emptyTitleLabel = "",
  titlePlaceholder,
  titleClassName = "text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight mb-8",
  titleStyle,
}: DetailViewHeaderProps) {
  const hasTopTags = topTags.length > 0;

  return (
    <>
      {hasTopTags ? (
        <div className="flex items-center gap-2 md:gap-3 mb-5">
          {topTags.map((tag, index) => (
            <div key={tag.key ?? `${tag.label}-${index}`} className={tag.wrapperClassName}>
              <Tag label={tag.label} icon={tag.icon} colors={tag.colors} />
            </div>
          ))}
        </div>
      ) : null}

      {editable ? (
        <EditableText
          key={titleKey}
          value={title}
          onChange={onTitleChange ?? (() => {})}
          as="h1"
          editable
          className={`${titleClassName} outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-sm`}
          style={titleStyle}
          singleLine
          placeholder={titlePlaceholder}
        />
      ) : (
        <h1 className={titleClassName} style={titleStyle}>
          {title || emptyTitleLabel}
        </h1>
      )}
    </>
  );
}
