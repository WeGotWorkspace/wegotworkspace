import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowRight,
  ArrowLeft,
  Database,
  CheckCircle2,
  CircleAlert,
  Loader2,
} from "lucide-react";
import type { InstallerData } from "../types";
import { cn } from "@/lib/utils";

export function DatabaseStep({
  data,
  update,
  onContinue,
  onBack,
  testStatus,
  testMessage,
}: {
  data: InstallerData["database"];
  update: (d: Partial<InstallerData["database"]>) => void;
  onContinue: () => void;
  onBack: () => void;
  testStatus: "idle" | "testing" | "ok" | "fail";
  testMessage?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Database className="h-6 w-6 text-primary" /> Database
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where WeGotWorkspace will store its data.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">Database type</p>
        <RadioGroup
          value={data.type}
          onValueChange={(v) =>
            update({ type: v as "sqlite" | "mysql", tested: false })
          }
          className="gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sqlite" id="db-sqlite" />
            <Label htmlFor="db-sqlite">SQLite</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mysql" id="db-mysql" />
            <Label htmlFor="db-mysql">MySQL / MariaDB</Label>
          </div>
        </RadioGroup>
      </div>

      {data.type === "sqlite" ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            Lightweight & zero-config. Best for small installs and evaluation.
          </div>
          <div className="space-y-2">
            <Label htmlFor="sqlite-path">Database file location</Label>
            <Input
              id="sqlite-path"
              value={data.sqlitePath}
              readOnly
              placeholder="wgw-content/db.sqlite"
            />
            <p className="text-xs text-muted-foreground">
              This default location is managed automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>MySQL server</Label>
              <Input
                value={data.mysql.host}
                onChange={(e) =>
                  update({
                    mysql: { ...data.mysql, host: e.target.value },
                    tested: false,
                  })
                }
                placeholder="localhost"
              />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input
                value={data.mysql.port}
                onChange={(e) =>
                  update({
                    mysql: { ...data.mysql, port: e.target.value },
                    tested: false,
                  })
                }
                placeholder="3306"
              />
            </div>
            <div className="space-y-2">
              <Label>Database name</Label>
              <Input
                value={data.mysql.database}
                onChange={(e) =>
                  update({
                    mysql: { ...data.mysql, database: e.target.value },
                    tested: false,
                  })
                }
                placeholder="wegotworkspace"
              />
            </div>
            <div className="space-y-2">
              <Label>User</Label>
              <Input
                value={data.mysql.user}
                onChange={(e) =>
                  update({
                    mysql: { ...data.mysql, user: e.target.value },
                    tested: false,
                  })
                }
                placeholder="db_user"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={data.mysql.password}
                onChange={(e) =>
                  update({
                    mysql: { ...data.mysql, password: e.target.value },
                    tested: false,
                  })
                }
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs",
              testStatus === "ok" && "text-[oklch(0.4_0.15_145)]",
              testStatus === "fail" && "text-destructive",
              (testStatus === "testing" || testStatus === "idle") &&
                "text-muted-foreground",
            )}
          >
            {testStatus === "testing" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testing connection...
              </>
            )}
            {testStatus === "ok" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connection verified
              </>
            )}
            {testStatus === "fail" && (
              <>
                <CircleAlert className="h-3.5 w-3.5" />
                {testMessage || "Connection failed"}
              </>
            )}
          </div>
          <Button
            onClick={onContinue}
            disabled={testStatus !== "ok"}
            className="gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
