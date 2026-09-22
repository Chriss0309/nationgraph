import type { EventState } from "@/lib/dossier";

type StateMeta = {
  label: string;
  dot: string;
  badge: string;
};


export const STATE_META = {
  DISCUSSION: {
    label: "Discussed",
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
    label: "Approved",
    dot: "size-2 rounded-full bg-ng-green-400",
    badge: "bg-ng-tint-3 text-ng-green-800",
  },
  SOLICITATION: {
    label: "Went public",
    dot: "size-2 rounded-full bg-ng-green-600",
    badge: "bg-ng-tint-3 text-ng-green-900",
  },
  AWARD: {
    label: "Awarded",
    dot: "size-2 rounded-full bg-ng-green-800",
    badge: "bg-ng-tint-4 text-ng-green-900",
  },
  RENEWAL: {
    label: "Renewed",
    dot: "size-2 rounded-full bg-ng-green-500",
    badge: "bg-ng-tint-2 text-ng-green-800",
  },
  OTHER: {
    label: "Other",
    dot: "size-2 rounded-full bg-neutral-400",
    badge: "bg-neutral-100 text-neutral-600",
  },
} satisfies Record<EventState, StateMeta>;
