import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell, PageHeader, Section } from "@/components/admin-shell";
import { Button } from "@wgw/ui";

export const Route = createFileRoute("/apps")({ component: AppsPage });

function AppsPage() {
  return (
    <AdminShell>
      <div className="px-10 py-10 max-w-4xl">
        <PageHeader
          eyebrow="Apps"
          title="App settings moved"
          description="Calendars and Contacts are now configured under WebDAV, because they directly change SabreDAV capabilities."
        />

        <Section
          title="Where to manage it"
          description="Use WebDAV settings for DAV protocol feature toggles."
        >
          <p className="mb-4 text-sm text-muted-foreground">
            This section no longer contains runtime toggles. Go to WebDAV settings to manage CalDAV
            and CardDAV.
          </p>
          <Button asChild>
            <Link to="/webdav">Open WebDAV settings</Link>
          </Button>
        </Section>
      </div>
    </AdminShell>
  );
}
