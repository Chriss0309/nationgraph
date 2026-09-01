import type { EventState, Verdict } from "@/lib/dossier";

type StateMeta = {
  label: string;
  dot: string;
  badge: string;
};

type VerdictMeta = {
  label: string;
  tone: "hit" | "muted";
  chipClass: string;
};

export const STATE_META = {
  DISCUSSION: {
    label: "Discussion",
    dot: "size-2 rounded-full bg-ng-green-200",
    badge: "bg-ng-tint-2 text-ng-green-800",
  },
  WORKSHOP: {
    label: "Workshop",
    dot: "size-2 rounded-full bg-ng-green-200",
    badge: "bg-ng-tint-1 text-ng-green-700",
  },
  BUDGET: {
    label: "Budget",
    dot: "size-2 rounded-full bg-ng-green-300",
    badge: "bg-ng-tint-2 text-ng-green-800",
  },
  AUTHORIZATION: {
    label: "Authorization",
    dot: "size-2 rounded-full bg-ng-green-400",
    badge: "bg-ng-tint-3 text-ng-green-800",
  },
  SOLICITATION: {
    label: "Solicitation",
    dot: "size-2 rounded-full bg-ng-green-600",
    badge: "bg-ng-tint-3 text-ng-green-900",
  },
  AWARD: {
    label: "Award",
    dot: "size-2 rounded-full bg-ng-green-800",
    badge: "bg-ng-tint-4 text-ng-green-900",
  },
  RENEWAL: {
    label: "Renewal",
    dot: "size-2 rounded-full bg-ng-green-500",
    badge: "bg-ng-tint-2 text-ng-green-800",
  },
  OTHER: {
    label: "Other",
    dot: "size-2 rounded-full bg-neutral-400",
    badge: "bg-neutral-100 text-neutral-600",
  },
} satisfies Record<EventState, StateMeta>;

export const VERDICT_META = {
  matched: {
    label: "Matched",
    tone: "hit",
    chipClass: "border-ng-green-400 bg-ng-tint-2 text-ng-green-800",
  },
  belowFloor: {
    label: "Below match floor",
    tone: "muted",
    chipClass: "border-border bg-muted text-muted-foreground",
  },
  noOutcome: {
    label: "No alarm",
    tone: "muted",
    chipClass: "border-border bg-muted text-muted-foreground",
  },
} satisfies Record<Verdict["kind"], VerdictMeta>;
