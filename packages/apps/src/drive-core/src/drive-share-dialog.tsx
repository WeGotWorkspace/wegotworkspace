import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { parseShareEmailList, shareViewerUrl } from "@/lib/api/wgw/shares";
import type {
  WgwShare,
  WgwShareGrant,
  WgwShareGrantPermission,
  WgwSharePublicAccess,
  WgwShareTargetType,
} from "@/lib/api/wgw/shares-types";
import type { DriveShareOperations } from "@/drive-core/src/drive-types";
import "@/drive-core/src/drive-share-dialog.css";

export type DriveShareTarget = {
  /** Absolute virtual drive path the owner controls. */
  path: string;
  name: string;
  targetType: WgwShareTargetType;
};

export type DriveShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DriveShareTarget | null;
  operations?: DriveShareOperations;
  /** Origin used to render the copyable link; defaults to the current window origin. */
  origin?: string;
};

const PUBLIC_ACCESS_OPTIONS: { value: WgwSharePublicAccess; label: string }[] = [
  { value: "none", label: "No public access" },
  { value: "read", label: "Anyone with the link can view" },
  { value: "write", label: "Anyone with the link can edit" },
];

const GRANT_STATUS_LABEL: Record<WgwShareGrant["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  revoked: "Revoked",
};

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function DriveShareDialog({
  open,
  onOpenChange,
  target,
  operations,
  origin,
}: DriveShareDialogProps) {
  const { showSuccess, showError } = useAppToast();
  const [share, setShare] = useState<WgwShare | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [grantPermission, setGrantPermission] = useState<WgwShareGrantPermission>("read");
  const [copied, setCopied] = useState(false);

  const reportError = useCallback(
    (error: unknown) => {
      showError(error instanceof Error ? error.message : String(error));
    },
    [showError],
  );

  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setShare(null);
    setEmailInput("");
    setCopied(false);
    if (!operations) return;
    setLoading(true);
    operations
      .listShares(target.path)
      .then((shares) => {
        if (cancelled) return;
        const match = shares.find((item) => item.path === target.path) ?? null;
        setShare(match);
      })
      .catch((error) => {
        if (!cancelled) reportError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target, operations, reportError]);

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      if (busy) return;
      setBusy(true);
      try {
        await action();
      } catch (error) {
        reportError(error);
      } finally {
        setBusy(false);
      }
    },
    [busy, reportError],
  );

  const createLink = () =>
    runAction(async () => {
      if (!operations || !target) return;
      const created = await operations.createShare({ path: target.path, publicAccess: "none" });
      setShare(created);
      showSuccess("Share link created");
    });

  const changePublicAccess = (next: WgwSharePublicAccess) =>
    runAction(async () => {
      if (!operations || !share) return;
      const updated = await operations.updateShare({ shareId: share.id, publicAccess: next });
      setShare(updated);
    });

  const changeExpiry = (value: string) =>
    runAction(async () => {
      if (!operations || !share) return;
      const updated = await operations.updateShare({
        shareId: share.id,
        expiresAt: localInputToIso(value),
      });
      setShare(updated);
    });

  const addGrants = () =>
    runAction(async () => {
      if (!operations || !share) return;
      const emails = parseShareEmailList(emailInput);
      if (emails.length === 0) {
        showError("Enter at least one valid email address.");
        return;
      }
      const updated = await operations.addShareGrants({
        shareId: share.id,
        emails,
        permission: grantPermission,
      });
      setShare(updated);
      setEmailInput("");
      showSuccess(`Invited ${emails.length} ${emails.length === 1 ? "person" : "people"}`);
    });

  const removeGrant = (grantId: string) =>
    runAction(async () => {
      if (!operations || !share) return;
      const updated = await operations.removeShareGrant({ shareId: share.id, grantId });
      setShare(updated);
    });

  const stopSharing = () =>
    runAction(async () => {
      if (!operations || !share) return;
      await operations.revokeShare(share.id);
      setShare(null);
      showSuccess("Sharing stopped");
    });

  const shareUrl = share
    ? share.url ||
      shareViewerUrl(
        origin ?? (typeof window !== "undefined" ? window.location.origin : ""),
        share.token,
      )
    : "";

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      reportError(error);
    }
  };

  const targetLabel = target?.targetType === "dir" ? "folder" : "file";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="drive-dialog-surface drive-share-dialog">
        <DialogHeader>
          <DialogTitle>Share “{target?.name ?? ""}”</DialogTitle>
          <DialogDescription>
            Share this {targetLabel} with people outside your team via a public link or email
            invites.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="drive-share-dialog__loading" role="status" aria-live="polite">
            <Loader2 className="size-4 animate-spin" />
            <span>Loading sharing settings…</span>
          </div>
        ) : !operations ? (
          <p className="drive-share-dialog__hint">Sharing is unavailable in this preview.</p>
        ) : !share ? (
          <div className="drive-share-dialog__section">
            <p className="drive-share-dialog__hint">
              This {targetLabel} isn’t shared yet. Create a link to invite people by email or open
              it to anyone with the link.
            </p>
            <Button variant="primary" icon={<Link2 />} onClick={createLink} disabled={busy}>
              Create share link
            </Button>
          </div>
        ) : (
          <div className="drive-share-dialog__body">
            <div className="drive-share-dialog__section">
              <Label className="drive-share-dialog__label" htmlFor="drive-share-link">
                Share link
              </Label>
              <div className="drive-share-dialog__link-row">
                <Input id="drive-share-link" readOnly value={shareUrl} />
                <IconButton
                  label={copied ? "Copied" : "Copy link"}
                  icon={copied ? <Check /> : <Copy />}
                  variant="subtle"
                  onClick={copyLink}
                />
              </div>
            </div>

            <div className="drive-share-dialog__section">
              <Label className="drive-share-dialog__label">Public access</Label>
              <Select
                value={share.publicAccess}
                onValueChange={(value) => changePublicAccess(value as WgwSharePublicAccess)}
                disabled={busy}
              >
                <SelectTrigger className="drive-share-dialog__control">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="drive-share-dialog__section">
              <Label className="drive-share-dialog__label" htmlFor="drive-share-expiry">
                Link expiry (optional)
              </Label>
              <Input
                id="drive-share-expiry"
                type="datetime-local"
                value={isoToLocalInput(share.expiresAt)}
                onChange={(event) => changeExpiry(event.target.value)}
                disabled={busy}
              />
            </div>

            <div className="drive-share-dialog__section">
              <Label className="drive-share-dialog__label">Invite by email</Label>
              <div className="drive-share-dialog__invite-row">
                <Input
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addGrants();
                    }
                  }}
                />
                <Select
                  value={grantPermission}
                  onValueChange={(value) => setGrantPermission(value as WgwShareGrantPermission)}
                >
                  <SelectTrigger className="drive-share-dialog__permission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Can view</SelectItem>
                    <SelectItem value="write">Can edit</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="primary" onClick={addGrants} disabled={busy}>
                  Invite
                </Button>
              </div>

              {share.grants.length > 0 ? (
                <ul className="drive-share-dialog__grants">
                  {share.grants.map((grant) => (
                    <li key={grant.id} className="drive-share-dialog__grant">
                      <span className="drive-share-dialog__grant-email">{grant.email}</span>
                      <span className="drive-share-dialog__grant-permission">
                        {grant.permission === "write" ? "Can edit" : "Can view"}
                      </span>
                      <span
                        className={`drive-share-dialog__grant-status drive-share-dialog__grant-status--${grant.status}`}
                      >
                        {GRANT_STATUS_LABEL[grant.status]}
                      </span>
                      <IconButton
                        label={`Remove ${grant.email}`}
                        icon={<Trash2 />}
                        size="sm"
                        variant="subtle"
                        onClick={() => removeGrant(grant.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="drive-share-dialog__hint">No people invited yet.</p>
              )}
            </div>

            <div className="drive-share-dialog__footer">
              <Button variant="ghost" onClick={stopSharing} disabled={busy}>
                Stop sharing
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
