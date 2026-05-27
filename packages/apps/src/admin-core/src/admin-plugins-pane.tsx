import { useRef } from "react";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { FeatureRow } from "@/admin-core/src/admin-workspace-widgets";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export type AdminPluginsPaneProps = {
  controller: AdminControllerState;
};

export function AdminPluginsPane({ controller }: AdminPluginsPaneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card title="Plugin lifecycle">
      <div className="mb-3 flex justify-end">
        <Button
          label="Install plugin ZIP"
          variant="subtle"
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (!file) return;
            void controller.actions.installPluginZip(file);
            event.currentTarget.value = "";
          }}
        />
      </div>
      {controller.plugins.length === 0 ? (
        <p className="text-sm text-muted-foreground">No plugins discovered.</p>
      ) : (
        controller.plugins.map((plugin) => (
          <FeatureRow
            key={plugin.id}
            label={plugin.name}
            desc={`${plugin.id}${plugin.source ? ` (${plugin.source})` : ""}`}
            value={plugin.active}
            onChange={(next) => {
              void controller.actions.setPluginActive(plugin.id, next);
            }}
          />
        ))
      )}
    </Card>
  );
}
