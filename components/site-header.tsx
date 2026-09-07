import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/board", label: "Board", key: "board" },
  { href: "/holdout", label: "Holdout test", key: "holdout" },
  { href: "/development", label: "Development record", key: "development" },
] as const;

export type SiteSection = (typeof LINKS)[number]["key"];

export function SiteHeader({ current }: { current: SiteSection }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="font-heading text-base font-semibold tracking-[-0.02em]">
          DemoGraph
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[10px] tracking-[0.08em] text-muted-foreground sm:gap-6 sm:text-xs">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={link.key === current ? "page" : undefined}
              className={
                link.key === current
                  ? "text-foreground underline decoration-primary underline-offset-4"
                  : "underline decoration-border underline-offset-4 hover:decoration-primary"
              }
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/Chriss0309/nationgraph"
            className="underline decoration-border underline-offset-4 hover:decoration-primary"
          >
            Repo
          </a>
        </nav>
      </div>
    </header>
  );
}
