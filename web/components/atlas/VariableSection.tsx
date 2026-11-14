import type { AtlasData } from "@/lib/atlas/data/schema";
import { formatP, signed } from "@/lib/atlas/format";

import { AnomalyChart } from "./AnomalyChart";
import { SectionHeader } from "./SectionHeader";

const MEAN_LABEL = {
  global: "MÉDIA GLOBAL",
  land: "MÉDIA EM TERRA",
  ocean: "MÉDIA NO OCEANO",
  "polar-ocean": "MÉDIA NOS OCEANOS POLARES",
} as const;

/** Secção 01: o que é a variável e como evoluiu em média no planeta. */
export function VariableSection({ data }: { data: AtlasData }) {
  const { meta, series } = data;
  const global = meta.highlights.globalTrend;
  const months = meta.period.months;

  return (
    <section id="o-que" className="variable-section atlas-width">
      <div className="variable-intro">
        <SectionHeader number="01" title="O quê está a mudar" />
        <p>
          <strong>{meta.variable.name}.</strong> {meta.variable.copy.description} O ciclo das
          estações sai da conta e sobra a mudança.
        </p>
        <span className="variable-source">
          {meta.source.name}
          <br />
          {meta.variable.unit} · {months} meses
        </span>
      </div>

      <div className="series-block">
        <div className="series-summary">
          <span className="technical">
            {MEAN_LABEL[meta.variable.coverage]}, PONDERADA PELA ÁREA
          </span>
          <div className="series-figure">
            {signed(global.trend, meta.variable.decimals + 1)}{" "}
            <small>{meta.variable.trendUnit}</small>
          </div>
          <p>
            Intervalo de confiança de 95%: {signed(global.ci[0], meta.variable.decimals + 1)} a{" "}
            {signed(global.ci[1], meta.variable.decimals + 1)}. Valor-p {formatP(global.p)}. Uma
            média global pequena pode esconder regiões com sinais opostos, como mostra o mapa a
            seguir.
          </p>
          <ul className="series-key" aria-label="Legenda do gráfico">
            <li>
              <i className="key-line key-monthly" />
              Anomalia mensal
            </li>
            <li>
              <i className="key-line key-smooth" />
              Média de 12 meses
            </li>
            <li>
              <i className="key-line key-trend" />
              Tendência (Theil-Sen)
            </li>
          </ul>
        </div>
        <AnomalyChart
          series={series}
          height={300}
          unit={meta.variable.unit}
          decimals={meta.variable.decimals}
          label={`Série mensal da anomalia global de ${meta.variable.name.toLowerCase()} (${MEAN_LABEL[meta.variable.coverage].toLowerCase()}), com média de 12 meses e recta de tendência`}
        />
      </div>
    </section>
  );
}
