import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionHeader } from "@/components/neuro/SectionHeader";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · NeuroCity" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-[900px] space-y-8">
      <PageHeader title="Settings" subtitle="Workspace, model, and access preferences." />

      <div className="card-surface p-6">
        <SectionHeader eyebrow="Profile" title="Account" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value="City Administrator" />
          <Field label="Email" value="admin@neurocity.gov" />
          <Field label="City" value="Mumbai" />
          <Field label="Role" value="Executive · Read & Approve" />
        </div>
      </div>

      <div className="card-surface p-6">
        <SectionHeader eyebrow="AI" title="Model preferences" />
        <div className="mt-4 space-y-3 text-sm">
          {[
            ["Confidence threshold for alerts", "85%"],
            ["Forecast horizon", "14 days"],
            ["Narrative language", "English (Executive)"],
            ["Auto-approve low-risk actions", "Off"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-4 py-3">
              <span>{k}</span>
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-surface p-6">
        <SectionHeader eyebrow="Workspace" title="Connected data sources" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["BMC Traffic API", "CPCB Air Quality", "MSEB Power Grid", "ISRO Bhuvan", "BEST Transit", "Met Dept Weather"].map((s) => (
            <div key={s} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-4 py-3 text-sm">
              <span>{s}</span>
              <span className="text-[11px]" style={{ color: "var(--color-success)" }}>
                ● Connected
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        defaultValue={value}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-foreground/30 focus:outline-none"
      />
    </label>
  );
}
