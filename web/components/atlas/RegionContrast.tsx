import type { AtlasData, Region, VariableMeta } from "@/lib/atlas/data/schema";
import { formatP, number, signed } from "@/lib/atlas/format";
import { VERDICT_LABEL, describeEmergence, describeRegion, trendVerdict } from "@/lib/atlas/narrative";

import { AnomalyChart } from "./AnomalyChart";
import { SectionHeader } from "./SectionHeader";

/** Eixo comum para comparar regiões: simétrico, com folga à volta dos intervalos. */
function sharedExtent(regions: readonly Region[]): number {
  const widest = Math.max(...regions.flatMap((r) => [Math.abs(r.ci[0]), Math.abs(r.ci[1])]));
  return widest * 1.15 || 1;
}

const toPercent = (value: number, extent: number) => `${((value + extent) / (2 * extent)) * 100}%`;

/**
 * Comparação das regiões num só eixo: o ponto é a estimativa, a barra é o intervalo
 * de confiança de 95%. Se a barra cruza o zero, os dados não distinguem a tendência do acaso.
 */
function ForestPlot({ regions, variable }: { regions: readonly Region[]; variable: VariableMeta }) {
  const extent = sharedExtent(regions);
  const d = variable.decimals;
  return (
    <figure className="forest">
      <figcaption className="technical">TENDÊNCIA E INCERTEZA · {variable.trendUnit}</figcaption>
      <div className="forest-rows">
        {regions.map((region) => {
          const verdict = trendVerdict(region.trend, region.sig);
          const left = toPercent(region.ci[0], extent);
          const right = toPercent(region.ci[1], extent);
          return (
            <div className="forest-row" key={region.id}>
              <span className="forest-name">{region.name}</span>
              <div
                className="forest-track"
                role="img"
                aria-label={`${region.name}: ${signed(region.trend, d)} com intervalo de ${signed(region.ci[0], d)} a ${signed(region.ci[1], d)}`}
              >
                <span className="forest-zero" style={{ left: "50%" }} />
                <span
                  className={`forest-interval forest-${verdict}`}
                  style={{ left, width: `calc(${right} - ${left})` }}
                />
                <span
                  className={`forest-dot forest-${verdict}`}
                  style={{ left: toPercent(region.trend, extent) }}
                />
              </div>
              <span className="forest-value">{signed(region.trend, d)}</span>
            </div>
          );
        })}
      </div>
      <div className="forest-axis technical" aria-hidden="true">
        <span>−{number(extent, d)}</span>
        <span>0</span>
        <span>+{number(extent, d)}</span>
      </div>
    </figure>
  );
}

function RegionCard({
  region,
  variable,
  firstYear,
}: {
  region: Region;
  variable: VariableMeta;
  firstYear: number;
}) {
  const { unit, decimals } = variable;
  const verdict = trendVerdict(region.trend, region.sig);
  return (
    <article className="region-card">
      <header>
        <h3>{region.name}</h3>
        <span className={`verdict verdict-${verdict}`}>{VERDICT_LABEL[verdict]}</span>
      </header>
      <div className={`region-figure text-trend-${region.trend < 0 ? "down" : "up"}`}>
        {signed(region.trend, decimals)} <small>{variable.trendUnit}</small>
      </div>
      <p className="region-sentence">
        {describeRegion(region, variable)}
        <span className="region-emergence">
          {describeEmergence(region.emergence, region.yearsToDetect, firstYear)}
        </span>
      </p>
      <AnomalyChart
        series={region.series}
        height={110}
        compact
        label={`Anomalias mensais de ${region.name}, com tendência`}
      />
      <dl className="region-facts">
        <div>
          <dt>Média</dt>
          <dd>
            {number(region.meanValue, decimals)} {unit}
          </dd>
        </div>
        <div>
          <dt>Variação</dt>
          <dd>
            {region.trendPctOfMean === null
              ? "—"
              : `${signed(region.trendPctOfMean, 1)}% por década`}
          </dd>
        </div>
        <div>
          <dt>Valor-p</dt>
          <dd>{formatP(region.p)}</dd>
        </div>
        <div>
          <dt>Células</dt>
          <dd>{region.cells}</dd>
        </div>
      </dl>
    </article>
  );
}

/** Secção 03: contraste entre regiões. */
export function RegionContrast({ data }: { data: AtlasData }) {
  const { regions, meta } = data;
  return (
    <section id="regioes" className="regions-section atlas-width">
      <div className="section-heading-row">
        <SectionHeader number="04" title="Contraste entre regiões" />
        <span className="technical">{regions.length} REGIÕES · MESMA ESCALA</span>
      </div>
      <div className="section-intro">
        <h3>
          O mesmo período, <em>histórias diferentes.</em>
        </h3>
        <p>
          Cada região tem a sua estimativa e a sua incerteza. Uma tendência só merece confiança
          quando o intervalo fica de um dos lados do zero.
        </p>
      </div>
      <ForestPlot regions={regions} variable={meta.variable} />
      <div className="region-cards">
        {regions.map((region) => (
          <RegionCard
            key={region.id}
            region={region}
            variable={meta.variable}
            firstYear={Number(meta.period.start.slice(0, 4))}
          />
        ))}
      </div>
    </section>
  );
}
