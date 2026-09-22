const linkClass = "underline decoration-border underline-offset-4 hover:decoration-primary";

const REPO = "https://github.com/Chriss0309/nationgraph";

export function Receipt() {
  return (
    <footer className="bg-card">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="border-t border-border pt-6 font-mono text-[10px] leading-6 text-muted-foreground sm:text-xs">
          <p className="text-foreground">Chris Ooi</p>
          <p>
            <a href="mailto:ooichristopher8@gmail.com" className={linkClass}>
              ooichristopher8@gmail.com
            </a>
          </p>
          <p>
            <a href={REPO} className={linkClass}>
              github.com/Chriss0309/nationgraph
            </a>
          </p>
          <p className="mt-4 max-w-[62ch]">
            Every number on this page comes straight out of the saved run files when the page builds. The code,{" "}
            <a href={`${REPO}/blob/main/trajectory.py`} className={linkClass}>
              one Python file
            </a>
            , was locked before the test ran and hasn&apos;t been touched since.
          </p>
        </div>
      </div>
    </footer>
  );
}
