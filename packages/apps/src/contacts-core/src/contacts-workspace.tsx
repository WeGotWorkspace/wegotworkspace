import { UserPlus } from "lucide-react";
import "react-swipeable-list/dist/styles.css";
import { Button } from "@/button/src/button";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { MultiSelectionView } from "@/multi-selection-view/src/multi-selection-view";
import { WorkspaceApp } from "@/workspace-app/src/workspace-app";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { ContactsDetailActionBar } from "@/contacts-core/src/contacts-detail-action-bar";
import { ContactsDetailView } from "@/contacts-core/src/contacts-detail-view";
import { ContactsListPanel } from "@/contacts-core/src/contacts-list-panel";
import type { ContactsWorkspaceProps } from "@/contacts-core/src/contacts-workspace-props";
import { useContactsController } from "@/contacts-core/src/use-contacts-controller";
import { useContactsSidebarModel } from "@/contacts-core/src/use-contacts-sidebar-model";
import "@/contacts-core/src/contacts-workspace.css";

export function ContactsWorkspace({
  data,
  session,
  labels,
  operations,
  listLoading = false,
  onLogout,
  className,
}: ContactsWorkspaceProps) {
  const closeSidebarOnMobile = (closeSidebar: () => void) => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    closeSidebar();
  };

  const {
    L,
    active,
    activeId,
    view,
    viewLabel,
    visibleCards,
    selectedIds,
    selectionMode,
    searchQuery,
    searchInputRef,
    workspaceLayoutRef,
    isTouch,
    editMode,
    createMode,
    editDraft,
    displayName,
    canCreateContact,
    canEdit,
    confirmDialog,
    selectionBar,
    selectionBarButtons,
    isItemDragging,
    itemDragHandlers,
    handleSelect,
    enterSelectionFor,
    selectView,
    setSearchQuery,
    createContact,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteActive,
    updateEditDraft,
    addPhone,
    addEmail,
    addAddress,
    updatePhone,
    updateEmail,
    updatePhoneContext,
    updateEmailContext,
    updateAddress,
    updateAddressContext,
    removePhone,
    removeEmail,
    removeAddress,
    addUrl,
    updateUrl,
    updateUrlContext,
    removeUrl,
    addressBooks,
    contactGroups,
  } = useContactsController({
    data,
    labels,
    listLoading,
    operations,
  });

  const { primarySidebarItems, addressBookSidebarItems, groupSidebarItems } =
    useContactsSidebarModel({
      labels: L,
      view,
      addressBooks,
      contactGroups,
      selectView,
    });

  return (
    <>
      <WorkspaceApp
        ref={workspaceLayoutRef}
        workspaceRoot={{
          className: cn("contacts-workspace", className),
        }}
        sidebar={(c) => (
          <AppSidebar
            open={c.sidebarOpen}
            onCloseMobile={c.closeSidebar}
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={onLogout}
              />
            }
            primaryButton={
              <Button
                label={L.newContact}
                icon={<UserPlus />}
                onClick={() => {
                  createContact();
                  closeSidebarOnMobile(c.closeSidebar);
                }}
                size="lg"
                pill
                variant="primary"
                disabled={!canCreateContact}
                className="w-full"
              />
            }
          >
            <SidebarSection items={primarySidebarItems} />
            <SidebarSection title={L.sectionAddressBooks} items={addressBookSidebarItems} />
            {groupSidebarItems.length > 0 ? (
              <SidebarSection title={L.sectionGroups} items={groupSidebarItems} />
            ) : null}
          </AppSidebar>
        )}
        list={(c) =>
          ContactsListPanel({
            L,
            sidebarOpen: c.sidebarOpen,
            onToggleSidebar: c.toggleSidebar,
            viewLabel,
            selectedIds,
            selectionMode: selectionMode || selectedIds.length > 1,
            listLoading,
            visibleCards,
            searchQuery,
            setSearchQuery,
            searchInputRef,
            canCreateContact,
            isTouch,
            activeId,
            isItemDragging,
            handleSelect,
            enterSelectionFor,
            itemDragHandlers,
            createContact,
            selectionBar,
          })
        }
        actionBar={(c) =>
          selectedIds.length > 1 ? null : (
            <ContactsDetailActionBar
              labels={L}
              canEdit={canEdit}
              editMode={editMode}
              createMode={createMode}
              closeMobileDetail={c.closeMobileDetail}
              onEdit={startEdit}
              onDelete={deleteActive}
              onSave={saveEdit}
              onCancel={cancelEdit}
            />
          )
        }
        detail={() => {
          if (selectedIds.length > 1) {
            return (
              <MultiSelectionView
                count={selectedIds.length}
                label="Multiple selection"
                title={(count) => `${count} ${count === 1 ? "contact" : "contacts"} selected`}
                actions={selectionBarButtons}
              />
            );
          }
          if (!active && !createMode) return null;
          return (
            <ContactsDetailView
              labels={L}
              card={active}
              createMode={createMode}
              editMode={editMode}
              editDraft={editDraft}
              displayName={displayName}
              onDraftChange={updateEditDraft}
              onAddPhone={addPhone}
              onAddEmail={addEmail}
              onAddAddress={addAddress}
              onUpdatePhone={updatePhone}
              onUpdateEmail={updateEmail}
              onUpdatePhoneContext={updatePhoneContext}
              onUpdateEmailContext={updateEmailContext}
              onUpdateAddress={updateAddress}
              onUpdateAddressContext={updateAddressContext}
              onAddUrl={addUrl}
              onUpdateUrl={updateUrl}
              onUpdateUrlContext={updateUrlContext}
              onRemoveUrl={removeUrl}
              onRemovePhone={removePhone}
              onRemoveEmail={removeEmail}
              onRemoveAddress={removeAddress}
            />
          );
        }}
      />

      {confirmDialog}
    </>
  );
}
