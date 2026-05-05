import { useState } from "react";
import { z } from "zod";
import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { Label } from "@wgw/ui";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  UserCog,
} from "lucide-react";
import type { InstallerData } from "../types";
import { toast } from "sonner";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(63, "Too long")
    .regex(
      /^[a-z0-9][a-z0-9_-]{1,62}$/,
      "Use lowercase letters, digits, _ or -",
    ),
  email: z.union([
    z.string().trim().max(255),
    z.string().trim().email("Invalid email").max(255),
  ]),
  displayName: z.string().trim().min(1, "Required").max(100),
  password: z.string().min(10, "Min 10 characters").max(128),
});

export function AccountStep({
  data,
  update,
  onFinish,
  onBack,
  installing,
}: {
  data: InstallerData["account"];
  update: (d: Partial<InstallerData["account"]>) => void;
  onFinish: () => Promise<void>;
  onBack: () => void;
  installing: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    const r = schema.safeParse(data);
    if (!r.success) {
      const errs: Record<string, string> = {};
      for (const issue of r.error.issues)
        errs[issue.path[0] as string] = issue.message;
      setErrors(errs);
      toast.error("Please fix the errors before continuing.");
      return;
    }
    setErrors({});
    await onFinish();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <UserCog className="h-6 w-6 text-primary" /> Admin account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create the first administrator. You can add more users later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="acc-user">Username</Label>
          <Input
            id="acc-user"
            value={data.username}
            onChange={(e) => update({ username: e.target.value })}
            placeholder="admin"
            aria-invalid={!!errors.username}
          />
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-display">Display name</Label>
          <Input
            id="acc-display"
            value={data.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            placeholder="Jane Doe"
            aria-invalid={!!errors.displayName}
          />
          {errors.displayName && (
            <p className="text-xs text-destructive">{errors.displayName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-email">Email (optional)</Label>
          <Input
            id="acc-email"
            type="email"
            value={data.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="admin@example.com"
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-pass">Password</Label>
          <div className="relative">
            <Input
              id="acc-pass"
              type={showPassword ? "text" : "password"}
              value={data.password}
              onChange={(e) => update({ password: e.target.value })}
              placeholder="At least 10 characters"
              aria-invalid={!!errors.password}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={installing}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          onClick={submit}
          disabled={installing}
          size="lg"
          className="gap-2"
        >
          {installing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Installing...
            </>
          ) : (
            <>
              Finish install <Sparkles className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
