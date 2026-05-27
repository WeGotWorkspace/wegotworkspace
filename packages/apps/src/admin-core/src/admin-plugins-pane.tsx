import { Card } from "@/card/src/card";
import { FeatureRow } from "@/admin-core/src/admin-workspace-widgets";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export type AdminPluginsPaneProps = {
  controller: AdminControllerState;
};

export function AdminPluginsPane({ controller }: AdminPluginsPaneProps) {
  return (
    <Card title="Plugin lifecycle">
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
