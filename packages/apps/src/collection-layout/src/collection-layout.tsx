import "./collection-layout.css";

type CollectionPaneProps = {
  children: React.ReactNode;
  detailOpenMobile: boolean;
};

export function CollectionListPane({ children, detailOpenMobile }: CollectionPaneProps) {
  return (
    <section
      className={`collection-list-pane flex-1 md:flex-none md:w-96 shrink-0 flex flex-col border-r min-w-0 relative transition-transform duration-300 ease-out md:transition-none ${
        detailOpenMobile ? "-translate-x-1/4 md:translate-x-0" : "translate-x-0"
      }`}
    >
      {children}
    </section>
  );
}

type CollectionHeaderProps = {
  children: React.ReactNode;
};

export function CollectionHeader({ children }: CollectionHeaderProps) {
  return <header className="collection-header p-4 md:p-6 border-b">{children}</header>;
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

      <div
        className={`flex-1 notes-swipe-list ${hasItems ? "overflow-y-auto" : "overflow-y-hidden"}`}
      >
        {hasItems ? (
          listContent
        ) : (
          <div className="collection-empty-state p-10 text-center text-sm">{emptyLabel}</div>
        )}
      </div>

      {floatingActionBar}
    </CollectionListPane>
  );
}
