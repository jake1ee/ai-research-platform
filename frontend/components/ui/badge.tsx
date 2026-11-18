import { cn } from "@/lib/utils";
import type { Evidence, License, Provenance } from "@/lib/types";

const base =
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap";

export function Chip({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(base, "border-line-strong text-muted", className)} {...props} />;
}

export function EvidenceBadge({ evidence, families }: { evidence: Evidence; families?: number }) {
  if (evidence === "unranked") return <Chip>Unranked</Chip>;
  const supported = evidence === "supported";
  return (
    <Chip
      className={cn(
        supported ? "border-accent/40 bg-accent/10 text-accent" : "border-warn/40 bg-warn/10 text-warn",
      )}
      title={
        supported
          ? "Backed by independent source families"
          : "Estimated: fewer than two independent source families"
      }
    >
      {supported ? "Supported" : "Estimated"}
      {families !== undefined && <span className="num opacity-70">·{families}</span>}
    </Chip>
  );
}

export function LicenseBadge({ license }: { license: License }) {
  return (
    <Chip className={license === "open" ? "border-cyan/40 text-cyan" : undefined}>
      {license === "open" ? "Open weight" : "Proprietary"}
    </Chip>
  );
}

const provLabel: Record<Provenance, string> = {
  lab: "Lab reported",
  maintainer: "Maintainer run",
  independent: "Independent",
  third_party: "Third party",
};

export function ProvenanceChip({ provenance }: { provenance: Provenance }) {
  return (
    <Chip className={provenance === "lab" ? undefined : "border-cyan/40 text-cyan"}>
      {provLabel[provenance]}
    </Chip>
  );
}
