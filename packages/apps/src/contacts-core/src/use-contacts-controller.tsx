import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useSelectionResetOnKeyChange } from "@/hooks/use-selection-reset-on-key-change";
import {
  useWorkspaceListController,
  useWorkspaceSelectionPresentation,
} from "@/hooks/use-workspace-list-controller";
import type { WorkspaceAppHandle } from "@/workspace-app/src/workspace-app";
import {
  contactDisplayName,
  filterCardsBySearch,
} from "@/contacts-core/src/contacts-display-utils";
import { mergeContactsLabels, type ContactsUILabels } from "@/contacts-core/src/contacts-labels";
import {
  CONTACTS_CREATE_ID,
  contactCardToEditDraft,
  editDraftToCreateBody,
  editDraftToPatch,
  emptyContactEditDraft,
  newContactMapId,
  resolveCreateAddressBookIds,
  resolveDefaultContactsView,
  type ContactChannelContext,
  type ContactEditDraft,
} from "@/contacts-core/src/contacts-edit-utils";
import type {
  ContactCard,
  ContactsAPIOperations,
  ContactsUIData,
} from "@/contacts-core/src/contacts-types";

type UseContactsControllerArgs = {
  data: ContactsUIData;
  labels?: Partial<ContactsUILabels>;
  listLoading?: boolean;
  operations?: ContactsAPIOperations;
};

const WRITE_QUEUE_DELAY_MS = 2500;

function filterCardsByView(cards: ContactCard[], view: string): ContactCard[] {
  if (view === "all") return cards;
  if (view.startsWith("book:")) {
    const bookId = view.slice(5);
    return cards.filter((card) => Boolean(card.addressBookIds?.[bookId]));
  }
  return cards;
}

function draftDisplayName(draft: ContactEditDraft, unknownLabel: string): string {
  const name = [draft.nameGiven, draft.nameGiven2, draft.nameSurname]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return name || unknownLabel;
}

export function useContactsController({
  data,
  labels,
  listLoading = false,
  operations,
}: UseContactsControllerArgs) {
  const L = useMemo(() => mergeContactsLabels(labels), [labels]);
  const [cards, setCards] = useState<ContactCard[]>(() => data.cards);
  const [addressBooks, setAddressBooks] = useState(() => data.addressBooks);
  const [view, setView] = useState(() => resolveDefaultContactsView(data.addressBooks));
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceLayoutRef = useRef<WorkspaceAppHandle>(null);
  const [activeId, setActiveId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [editDraft, setEditDraft] = useState<ContactEditDraft | null>(null);

  const { show, showError } = useAppToast();
  const showMutationError = useCallback(
    (fallback = "Could not sync this change. Please try again.") => showError(fallback),
    [showError],
  );
  const { confirmDialog, requestConfirm } = useConfirmDialog({
    contentClassName: "contacts-dialog-surface",
  });
  const isTouch = useIsTouch();

  useEffect(() => {
    setCards(data.cards);
    setAddressBooks(data.addressBooks);
  }, [data.addressBooks, data.cards]);

  const visibleCards = useMemo(() => {
    const byView = filterCardsByView(cards, view);
    return filterCardsBySearch(byView, searchQuery);
  }, [cards, searchQuery, view]);

  const visibleIds = useMemo(() => visibleCards.map((card) => card.id), [visibleCards]);

  const {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    queueMutation,
  } = useWorkspaceListController<ContactCard>({
    items: cards,
    setItems: setCards,
    visibleIds,
    activeId,
    setActiveId,
    onPrimarySelect: (id) => {
      if (createMode) return;
      setActiveId(id);
      setEditMode(false);
      setEditDraft(null);
      workspaceLayoutRef.current?.openMobileDetail();
    },
    onNavigateToId: () => workspaceLayoutRef.current?.openMobileDetail(),
    onMutationError: showMutationError,
    queueDelayMs: WRITE_QUEUE_DELAY_MS,
  });

  useSelectionResetOnKeyChange({
    resetKey: view,
    setSelectedIds,
    setSelectionMode,
  });

  const active = useMemo(
    () =>
      activeId && activeId !== CONTACTS_CREATE_ID
        ? cards.find((card) => card.id === activeId)
        : undefined,
    [activeId, cards],
  );

  const viewLabel = useMemo(() => {
    if (view === "all") return L.sidebarAllContacts;
    if (view.startsWith("book:")) {
      const bookId = view.slice(5);
      return addressBooks.find((book) => book.id === bookId)?.name ?? bookId;
    }
    return L.sidebarAllContacts;
  }, [L.sidebarAllContacts, addressBooks, view]);

  const canCreateContact = view !== "all" || addressBooks.length > 0;

  const canEdit = useMemo(() => {
    if (createMode) return true;
    if (!active) return false;
    const bookIds = Object.keys(active.addressBookIds ?? {});
    if (bookIds.length === 0) return Boolean(operations);
    return bookIds.some((bookId) => {
      const book = addressBooks.find((row) => row.id === bookId);
      return book?.myRights?.mayWrite !== false;
    });
  }, [active, addressBooks, createMode, operations]);

  const displayName = useMemo(() => {
    if (editDraft && (editMode || createMode)) return draftDisplayName(editDraft, L.unknownContact);
    if (active) return contactDisplayName(active);
    return L.unknownContact;
  }, [L.unknownContact, active, createMode, editDraft, editMode]);

  const selectView = useCallback((nextView: string) => {
    setView(nextView);
    setSearchQuery("");
    setEditMode(false);
    setCreateMode(false);
    setEditDraft(null);
    setActiveId("");
  }, []);

  const updateEditDraft = useCallback((patch: Partial<ContactEditDraft>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const startEdit = useCallback(() => {
    if (!active || createMode) return;
    setEditMode(true);
    setEditDraft(contactCardToEditDraft(active));
  }, [active, createMode]);

  const cancelEdit = useCallback(() => {
    if (createMode) {
      setCreateMode(false);
      setActiveId("");
    }
    setEditMode(false);
    setEditDraft(null);
  }, [createMode]);

  const createContact = useCallback(() => {
    setCreateMode(true);
    setEditMode(true);
    setEditDraft(emptyContactEditDraft());
    setActiveId(CONTACTS_CREATE_ID);
    setSelectedIds([]);
    setSelectionMode(false);
    workspaceLayoutRef.current?.openMobileDetail();
  }, [setSelectedIds, setSelectionMode]);

  const addPhone = useCallback(() => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            phones: [...prev.phones, { id: newContactMapId(), number: "", contextType: "" }],
          }
        : prev,
    );
  }, []);

  const addEmail = useCallback(() => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            emails: [...prev.emails, { id: newContactMapId(), address: "", contextType: "" }],
          }
        : prev,
    );
  }, []);

  const addAddress = useCallback(() => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            addresses: [
              ...prev.addresses,
              {
                id: newContactMapId(),
                street: "",
                locality: "",
                region: "",
                postalCode: "",
                country: "",
                contextType: "",
              },
            ],
          }
        : prev,
    );
  }, []);

  const updatePhone = useCallback((id: string, number: string) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            phones: prev.phones.map((row) => (row.id === id ? { ...row, number } : row)),
          }
        : prev,
    );
  }, []);

  const updateEmail = useCallback((id: string, address: string) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            emails: prev.emails.map((row) => (row.id === id ? { ...row, address } : row)),
          }
        : prev,
    );
  }, []);

  const updatePhoneContext = useCallback((id: string, contextType: ContactChannelContext) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            phones: prev.phones.map((row) => (row.id === id ? { ...row, contextType } : row)),
          }
        : prev,
    );
  }, []);

  const updateEmailContext = useCallback((id: string, contextType: ContactChannelContext) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            emails: prev.emails.map((row) => (row.id === id ? { ...row, contextType } : row)),
          }
        : prev,
    );
  }, []);

  const updateAddress = useCallback(
    (
      id: string,
      field: "street" | "locality" | "region" | "postalCode" | "country",
      value: string,
    ) => {
      setEditDraft((prev) =>
        prev
          ? {
              ...prev,
              addresses: prev.addresses.map((row) =>
                row.id === id ? { ...row, [field]: value } : row,
              ),
            }
          : prev,
      );
    },
    [],
  );

  const updateAddressContext = useCallback((id: string, contextType: ContactChannelContext) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            addresses: prev.addresses.map((row) => (row.id === id ? { ...row, contextType } : row)),
          }
        : prev,
    );
  }, []);

  const removePhone = useCallback((id: string) => {
    setEditDraft((prev) =>
      prev ? { ...prev, phones: prev.phones.filter((row) => row.id !== id) } : prev,
    );
  }, []);

  const removeEmail = useCallback((id: string) => {
    setEditDraft((prev) =>
      prev ? { ...prev, emails: prev.emails.filter((row) => row.id !== id) } : prev,
    );
  }, []);

  const removeAddress = useCallback((id: string) => {
    setEditDraft((prev) =>
      prev ? { ...prev, addresses: prev.addresses.filter((row) => row.id !== id) } : prev,
    );
  }, []);

  const addUrl = useCallback(() => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            urls: [...prev.urls, { id: newContactMapId(), uri: "", contextType: "" }],
          }
        : prev,
    );
  }, []);

  const updateUrl = useCallback((id: string, uri: string) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            urls: prev.urls.map((row) => (row.id === id ? { ...row, uri } : row)),
          }
        : prev,
    );
  }, []);

  const updateUrlContext = useCallback((id: string, contextType: ContactChannelContext) => {
    setEditDraft((prev) =>
      prev
        ? {
            ...prev,
            urls: prev.urls.map((row) => (row.id === id ? { ...row, contextType } : row)),
          }
        : prev,
    );
  }, []);

  const removeUrl = useCallback((id: string) => {
    setEditDraft((prev) =>
      prev ? { ...prev, urls: prev.urls.filter((row) => row.id !== id) } : prev,
    );
  }, []);

  const deleteCards = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const previousCards = cards;
      const previousActiveId = activeId;
      const previousSelectedIds = selectedIds;
      const shouldExitSelection =
        ids.length === selectedIds.length &&
        selectedIds.length > 0 &&
        ids.every((id) => selectedIds.includes(id));

      setCards((prev) => prev.filter((card) => !ids.includes(card.id)));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      if (ids.includes(activeId)) {
        setActiveId("");
        setEditMode(false);
        setEditDraft(null);
        setCreateMode(false);
      }
      if (shouldExitSelection) setSelectionMode(false);

      const rollback = () => {
        setCards(previousCards);
        setSelectedIds(previousSelectedIds);
        setActiveId(previousActiveId);
        if (previousSelectedIds.length > 0) setSelectionMode(true);
      };

      queueMutation({
        key: `contacts:delete:${ids.slice().sort().join(",")}`,
        toastMessage: L.toastDeleted,
        execute: (signal) =>
          operations
            ? Promise.all(
                ids.map((id) => {
                  const card = previousCards.find((row) => row.id === id);
                  return operations.deleteCard(id, { signal, ifMatch: card?.etag });
                }),
              ).then(() => {})
            : Promise.resolve(),
        undo: rollback,
        onError: rollback,
        undoToastMessage: "Deletion undone.",
      });
    },
    [
      L.toastDeleted,
      activeId,
      cards,
      operations,
      queueMutation,
      selectedIds,
      setSelectedIds,
      setSelectionMode,
    ],
  );

  const openDeleteConfirm = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      requestConfirm({
        title: L.deleteContactTitle,
        description: L.deleteContactDescription(ids.length),
        confirmLabel: L.deleteConfirm,
        cancelLabel: L.deleteCancel,
        variant: "destructive",
        onConfirm: () => deleteCards(ids),
      });
    },
    [L, deleteCards, requestConfirm],
  );

  const deleteActive = useCallback(() => {
    if (!active) return;
    openDeleteConfirm([active.id]);
  }, [active, openDeleteConfirm]);

  const requestDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    openDeleteConfirm(selectedIds);
  }, [openDeleteConfirm, selectedIds]);

  const saveEdit = useCallback(() => {
    if (!editDraft) return;

    if (createMode) {
      const body = editDraftToCreateBody(
        editDraft,
        resolveCreateAddressBookIds(view, addressBooks),
      );
      const optimisticId = `card-${newContactMapId()}`;
      const optimisticCard: ContactCard = {
        "@type": "Card",
        version: "1.0",
        id: optimisticId,
        uid: `urn:uuid:${newContactMapId()}`,
        ...body,
      };
      const previousCards = cards;

      setCards((prev) => [optimisticCard, ...prev]);
      setCreateMode(false);
      setEditMode(false);
      setEditDraft(null);
      setActiveId(optimisticId);
      show(L.toastCreated, { icon: <Check className="size-4" /> });

      const rollback = () => {
        setCards(previousCards);
        setActiveId("");
      };

      queueMutation({
        key: `contacts:create:${optimisticId}`,
        toastMessage: L.toastCreated,
        execute: async (signal) => {
          if (!operations) return;
          const created = await operations.createCard(body, { signal });
          setCards((prev) => prev.map((card) => (card.id === optimisticId ? created : card)));
          setActiveId(created.id);
        },
        undo: rollback,
        onError: rollback,
        undoToastMessage: "Create undone.",
      });
      return;
    }

    if (!active) return;
    const patch = editDraftToPatch(editDraft, active);
    const previousCard = active;
    const merged: ContactCard = {
      ...active,
      ...patch,
      name: patch.name ?? active.name,
      phones: { ...active.phones, ...patch.phones },
      emails: { ...active.emails, ...patch.emails },
      addresses: { ...active.addresses, ...patch.addresses },
      organizations: { ...active.organizations, ...patch.organizations },
      notes: { ...active.notes, ...patch.notes },
    };
    for (const [key, value] of Object.entries(patch.phones ?? {})) {
      if (value === null) delete merged.phones?.[key];
    }
    for (const [key, value] of Object.entries(patch.emails ?? {})) {
      if (value === null) delete merged.emails?.[key];
    }
    for (const [key, value] of Object.entries(patch.addresses ?? {})) {
      if (value === null) delete merged.addresses?.[key];
    }
    for (const [key, value] of Object.entries(patch.organizations ?? {})) {
      if (value === null) delete merged.organizations?.[key];
    }
    for (const [key, value] of Object.entries(patch.notes ?? {})) {
      if (value === null) delete merged.notes?.[key];
    }

    setCards((prev) => prev.map((card) => (card.id === active.id ? merged : card)));
    setEditMode(false);
    setEditDraft(null);
    show(L.toastSaved, { icon: <Check className="size-4" /> });

    const rollback = () => {
      setCards((prev) => prev.map((card) => (card.id === active.id ? previousCard : card)));
    };

    queueMutation({
      key: `contacts:patch:${active.id}`,
      toastMessage: L.toastSaved,
      execute: (signal) =>
        operations
          ? operations
              .patchCard(active.id, patch, { signal, ifMatch: active.etag })
              .then((saved) => {
                setCards((prev) => prev.map((card) => (card.id === active.id ? saved : card)));
              })
          : Promise.resolve(),
      undo: rollback,
      onError: rollback,
      undoToastMessage: "Save undone.",
    });
  }, [
    L.toastCreated,
    L.toastSaved,
    active,
    addressBooks,
    cards,
    createMode,
    editDraft,
    operations,
    queueMutation,
    show,
    view,
  ]);

  const selectionActionButtons = useMemo(
    () => [
      {
        label: L.selectionDelete,
        icon: <Trash2 className="size-4" />,
        onClick: requestDeleteSelected,
      },
    ],
    [L.selectionDelete, requestDeleteSelected],
  );

  const { selectionBarButtons, selectionBar } = useWorkspaceSelectionPresentation({
    selectedIds,
    selectionMode,
    activeId,
    exitSelection,
    actionButtons: selectionActionButtons,
    doneLabel: L.selectionDone,
    floatingClassName: "md:hidden",
  });

  return {
    L,
    cards,
    addressBooks,
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
    listLoading,
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
    sidebarDropZoneProps,
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
    addUrl,
    updateUrl,
    updateUrlContext,
    removeUrl,
    removePhone,
    removeEmail,
    removeAddress,
    requestDeleteSelected,
  };
}

export type ContactsControllerState = ReturnType<typeof useContactsController>;
