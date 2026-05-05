import { Button } from "@wgw/ui";
import { ArrowRight, Cloud, Lock, Users } from "lucide-react";

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="text-primary">WeGotWorkspace</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Let's get your private workspace up and running. This wizard will
          guide you through the setup in just a few minutes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Cloud,
            title: "Self-hosted",
            desc: "Your data, your server.",
          },
          {
            icon: Lock,
            title: "Private",
            desc: "Secure by default.",
          },
          {
            icon: Users,
            title: "All the tools you need",
            desc: "Files, Docs, Mail, Voice, and More",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-soft)]"
          >
            <f.icon className="mb-2 h-5 w-5 text-primary" />
            <div className="text-sm font-semibold">{f.title}</div>
            <div className="text-xs text-muted-foreground">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="lg" onClick={onNext} className="gap-2">
          Get started <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
