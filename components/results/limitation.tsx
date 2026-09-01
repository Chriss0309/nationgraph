import { Coverage, type CoverageTile } from "@/components/results/viz/coverage";
import {
  formatCount,
  formatPercent,
  type DossierMetrics,
  type MatchedCaseStudy,
} from "@/lib/dossier";

function districtShortName(district: string): string {
  return district
    .replace(" County Public Schools", "")
    .replace(" County School District", "");
}

export function Limitation({
  coverage,
  hit,
  precision,
}: {
  coverage: DossierMetrics["coverage"];
  hit: MatchedCaseStudy | null;
  precision: DossierMetrics["precision"];
}) {
  const missed = Math.max(0, coverage.total - coverage.covered);
  const figureLabel = `${coverage.covered} of ${coverage.total} known purchases surfaced, a ${formatPercent(coverage.rate)} coverage rate.`;
  const limitationCopy = `${formatCount(coverage.total, true)} districts in this sample made a known cybersecurity purchase. The pipeline surfaced ${formatCount(coverage.covered)}, the only one whose paper trail entered the corpus. The other ${formatCount(missed)} trails never made it in. A thin sample of meeting paper misses most of what boards do. The fix is more documents per district, not a smarter model.`;
  const caption = `Coverage ${coverage.covered} of ${coverage.total} (${formatPercent(coverage.rate)}). Recall is a data problem; precision held at ${precision.correct}/${precision.labeled}.`;
  const tiles: CoverageTile[] = Array.from(
    { length: coverage.total },
    (_, index) => {
      const found = index < coverage.covered;

      if (found && hit !== null && index === 0) {
        return {
          detail: `found ${hit.verdict.leadDays} days early`,
          found,
          title: districtShortName(hit.district),
        };
      }
      return {
        detail: found ? "found" : "paper never collected",
        found,
        title: null,
      };
    },
  );

  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
          <div>
            <h2 className="section-title">
              It found {coverage.covered} of {coverage.total}.
            </h2>
            <p className="section-lede">
              {limitationCopy}
            </p>
          </div>

          <div className="self-center">
            <Coverage label={figureLabel} tiles={tiles} />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
