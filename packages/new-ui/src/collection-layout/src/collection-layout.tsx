type CollectionPaneProps = {
  children: React.ReactNode;
  detailOpenMobile: boolean;
};

export function CollectionListPane({ children, detailOpenMobile }: CollectionPaneProps) {
  return (
    <section
      className={`flex-1 md:flex-none md:w-96 shrink-0 flex flex-col border-r min-w-0 relative transition-transform duration-300 ease-out md:transition-none ${
        detailOpenMobile ? "-translate-x-1/4 md:translate-x-0" : "translate-x-0"
      }`}
      style={{
        backgroundColor: "var(--color-cream, #f5f1e8)",
        borderColor: "color-mix(in oklab, var(--color-ink) 8%, transparent)",
      }}
    >
      {children}
    </section>
  );
}

type CollectionHeaderProps = {
  children: React.ReactNode;
};

export function CollectionHeader({ children }: CollectionHeaderProps) {
  return (
    <header
      className="p-4 md:p-6 border-b"
      style={{ borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)" }}
    >
      {children}
    </header>
  );
}

type CollectionListWorkspaceProps = {
  detailOpenMobile: boolean;
  header: React.ReactNode;
  listContent: React.ReactNode;
  hasItems: boolean;
  emptyLabel: string;
  floatingActionBar?: React.ReactNode;
};

export function CollectionListWorkspace({
  detailOpenMobile,
  header,
  listContent,
  hasItems,
  emptyLabel,
  floatingActionBar,
}: CollectionListWorkspaceProps) {
  return (
    <CollectionListPane detailOpenMobile={detailOpenMobile}>
      <CollectionHeader>{header}</CollectionHeader>

      <div className="flex-1 overflow-y-auto notes-swipe-list">
        {listContent}
        {!hasItems ? (
          <div
            className="p-10 text-center text-sm"
            style={{ color: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
          >
            {emptyLabel}
          </div>
        ) : null}
      </div>

      {floatingActionBar}
    </CollectionListPane>
  );
}
