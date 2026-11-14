import { ArrowDown } from "lucide-react";

import type { AtlasData } from "@/lib/atlas/data/schema";
import { formatP, number, signed, yearOf } from "@/lib/atlas/format";
import { computeHighlights } from "@/lib/atlas/highlights";

import { DataBadge } from "./DataBadge";

interface MetricProps {
  value: string;
  tone?: "up" | "down";
  unit?: string | undefined;
  label: string;
  detail: string;
}

function Metric({ value, tone, unit, label, detail }: MetricProps) {
  return (
    <div className="metric">
      <div className={`metric-value ${tone ? `text-trend-${tone}` : ""}`}>
        {value}
        {tone && unit && <small>{unit}/déc.</small>}
      </div>
      <span className="metric-label">{label}</span>
      <span className="metric-p">{detail}</span>
    </div>
  );
}

/** Frase de abertura: só diz "medida pela NASA" quando os dados são mesmo da NASA. */
function subtitle(data: AtlasData | undefined): string {
  if (!data) return "Uma leitura de duas décadas do sistema Terra e de onde a mudança é real.";
  const years = yearOf(data.meta.period.end) - yearOf(data.meta.period.start) + 1;
  const what = data.meta.variable.name.toLowerCase();
  return data.meta.isDemo
    ? `Uma leitura de ${years} anos de ${what}, aqui com dados sintéticos, e de onde a mudança é real.`
    : `Uma leitura de ${years} anos de ${what} (${data.meta.source.name}), e de onde a mudança é real.`;
}

/** O trecho entre asteriscos vai em itálico: "A *mesma* chuva" -> A <em>mesma</em> chuva. */
function renderEmphasis(text: string) {
  return text.split("*").map((part, i) => (i % 2 === 1 ? <em key={i}>{part}</em> : part));
}

export function Opening({ data }: { data: AtlasData | undefined }) {
  const highlights = data ? computeHighlights(data.grid, data.regions) : null;
  const { increase, decrease } = highlights ?? {};
  const period = data ? `${yearOf(data.meta.period.start)}–${yearOf(data.meta.period.end)}` : "";
  const eyebrow = data
    ? `${data.meta.source.name} · ${period} · ANOMALIAS MENSAIS`
    : "ATLAS DE TENDÊNCIAS";

  return (
    <section id="abertura" className="opening atlas-width">
      <div className="eyebrow-row">
        <p className="eyebrow">{eyebrow.toUpperCase()}</p>
        <DataBadge meta={data?.meta} />
      </div>
      <div className="opening-copy">
        <div>
          <h1>
            {data
              ? renderEmphasis(data.meta.variable.copy.opening)
              : "Uma leitura do sistema Terra, em mudança."}
          </h1>
          <p className="opening-subtitle">{subtitle(data)}</p>
        </div>
        <aside className="margin-note">
          <span className="technical">UMA QUESTÃO DE GEOGRAFIA</span>
          Uma tendência global pode esconder realidades locais opostas. O lugar importa tanto como o
          número.
        </aside>
      </div>
      <div className="metrics">
        <Metric
          tone="up"
          unit={data?.meta.variable.unit}
          value={increase ? signed(increase.trend, data?.meta.variable.decimals) : "—"}
          label="MAIOR SUBIDA REGIONAL"
          detail={
            increase
              ? `${increase.name} · p ${formatP(increase.p)}`
              : data
                ? "Nenhuma região sobe"
                : "A carregar dados"
          }
        />
        <Metric
          tone="down"
          unit={data?.meta.variable.unit}
          value={decrease ? signed(decrease.trend, data?.meta.variable.decimals) : "—"}
          label="MAIOR DESCIDA REGIONAL"
          detail={
            decrease
              ? `${decrease.name} · p ${formatP(decrease.p)}`
              : data
                ? "Nenhuma região desce"
                : "A carregar dados"
          }
        />
        <Metric
          value={highlights ? `${number(highlights.significantAreaPct, 0)}%` : "—"}
          label="ÁREA COM TENDÊNCIA SIGNIFICATIVA"
          detail={
            highlights
              ? `p < 0,05 · ${number(highlights.significantAreaPctFdr, 0)}% com controlo FDR`
              : "A carregar dados"
          }
        />
      </div>
      <div className="opening-bottom">
        <a href="#onde" className="explore-link">
          Ler a geografia da mudança <ArrowDown />
        </a>
        <span className="edition">SISTEMA TERRA / ATLAS 001</span>
      </div>
    </section>
  );
}
