import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AtlasData } from "@/lib/atlas/data/schema";
import { summarizeEmergence } from "@/lib/atlas/emergence";
import { number } from "@/lib/atlas/format";

import { SegmentedControl } from "../map/SegmentedControl";
import { SectionHeader } from "../SectionHeader";
import { EmergenceChart } from "./EmergenceChart";
import { EmergenceLegend } from "./EmergenceLegend";
import { EmergenceMap, type EmergenceView } from "./EmergenceMap";

const VIEW_OPTIONS = [
  { value: "when", label: "Quando emergiu" },
  { value: "left", label: "Quanto falta" },
] as const satisfies readonly { value: EmergenceView; label: string }[];

const PLAY_INTERVAL_MS = 650;

/** Secção 03: o tempo de emergência, a pergunta que o atlas faz e quase ninguém faz. */
export function EmergenceSection({ data }: { data: AtlasData }) {
  const { grid, meta } = data;
  const { emergence } = meta;
  const years = emergence.byYear.map((row) => row.year);
  const firstYear = years[0]!;
  const lastYear = years.at(-1)!;
  const firstDataYear = Number(meta.period.start.slice(0, 4));

  const [view, setView] = useState<EmergenceView>("when");
  const [year, setYear] = useState(lastYear);
  const [playing, setPlaying] = useState(false);

  const summary = useMemo(() => summarizeEmergence(grid), [grid]);
  const within20 = summary.buckets.slice(0, 3).reduce((sum, b) => sum + b.pct, 0);
  const first = emergence.byYear[0]!;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setYear((current) => {
        if (current >= lastYear) {
          setPlaying(false);
          return lastYear;
        }
        return current + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, lastYear]);

  const togglePlay = () => {
    if (!playing && year >= lastYear) setYear(firstYear);
    setPlaying((value) => !value);
  };

  return (
    <section id="quando" className="emergence-section atlas-width">
      <div className="section-heading-row">
        <SectionHeader number="03" title="Quando saberemos" />
        <span className="technical">
          TEMPO DE EMERGÊNCIA · JANELAS DE {emergence.minYears} A {lastYear - firstDataYear + 1}{" "}
          ANOS
        </span>
      </div>
      <div className="section-intro">
        <h3>
          Quando é que a mudança <em>deixa de ser ruído?</em>
        </h3>
        <p>
          Uma tendência não aparece de repente. Repetimos o teste ano após ano, com dados cada vez
          mais longos, e registámos quando cada célula passou a ser detectável e assim ficou. Onde
          ainda não é, estimamos quantos anos de dados faltam.
        </p>
      </div>

      <div className="metrics emergence-metrics">
        <div className="metric">
          <div className="metric-value">{number(summary.emergedPct, 0)}%</div>
          <span className="metric-label">DA ÁREA JÁ TEM TENDÊNCIA DETECTÁVEL</span>
          <span className="metric-p">
            {summary.medianYear !== null
              ? `metade emergiu até ${summary.medianYear}`
              : "nenhuma emergiu"}
          </span>
        </div>
        <div className="metric">
          <div className="metric-value">{number(first.pctSeen, 0)}%</div>
          <span className="metric-label">SE VIA EM {firstYear}</span>
          <span className="metric-p">
            o puro acaso explicaria ~{number(emergence.chanceLevelPct, 0)}%
          </span>
        </div>
        <div className="metric">
          <div className="metric-value">{number(within20, 0)}%</div>
          <span className="metric-label">PODE FICAR CLARA EM ATÉ 20 ANOS</span>
          <span className="metric-p">se as tendências actuais persistirem</span>
        </div>
      </div>

      <div className="map-controls emergence-controls">
        <div className="control-group">
          <span className="technical">VISTA</span>
          <SegmentedControl
            label="Vista do mapa de emergência"
            options={VIEW_OPTIONS}
            value={view}
            onChange={(next) => {
              setView(next);
              setPlaying(false);
            }}
          />
        </div>
        {view === "when" && (
          <div className="control-group timeline-control">
            <Button
              variant="map"
              size="icon"
              aria-label={playing ? "Pausar a linha do tempo" : "Reproduzir a linha do tempo"}
              onClick={togglePlay}
            >
              {playing ? <Pause /> : <Play />}
            </Button>
            <label htmlFor="emergence-year" className="technical">
              ANO
            </label>
            <input
              id="emergence-year"
              type="range"
              min={firstYear}
              max={lastYear}
              step={1}
              value={year}
              onChange={(event) => {
                setPlaying(false);
                setYear(Number(event.target.value));
              }}
            />
            <output htmlFor="emergence-year" className="timeline-year">
              {year}
            </output>
          </div>
        )}
      </div>

      <EmergenceMap
        grid={grid}
        stepDeg={meta.grid.stepDeg}
        view={view}
        year={year}
        firstYear={firstYear}
        lastYear={lastYear}
        firstDataYear={firstDataYear}
      />
      <EmergenceLegend view={view} firstYear={firstYear} lastYear={lastYear} />
      {view === "left" && (
        <p className="emergence-note emergence-caveat">
          Leitura com cuidado: o horizonte parte do declive estimado, que é ruidoso. Castanho forte
          quer dizer «quase detectável hoje», não «vai emergir»; muitas destas células são ruído que
          um ano mais de dados pode desfazer.
        </p>
      )}

      <div className="emergence-chart-block">
        <div>
          <span className="technical">ÁREA COM TENDÊNCIA DETECTÁVEL, ANO A ANO</span>
          <ul className="series-key" aria-label="Legenda do gráfico">
            <li>
              <i className="key-line key-smooth" />
              Já emergida (p &lt; 0,05)
            </li>
            <li>
              <i className="key-line key-dotted" />
              Já emergida (com FDR)
            </li>
            <li>
              <i className="key-line key-monthly" />O que se via nesse ano
            </li>
            <li>
              <i className="key-line key-chance" />
              Nível do acaso
            </li>
          </ul>
          <p className="emergence-note">
            O sinal só conta quando fica acima do nível do acaso. Em {firstYear},{" "}
            {number(first.pctSeen, 0)}% da área já parecia significativa; em {lastYear},{" "}
            {number(emergence.byYear.at(-1)!.pctEmerged, 0)}%.
          </p>
        </div>
        <EmergenceChart emergence={emergence} year={view === "when" ? year : lastYear} />
      </div>

      <p className="map-footnote">
        O ano de emergência é descritivo: olhar para os dados ano após ano é espreitar várias vezes,
        o que infla falsos positivos. Por isso exigimos que a tendência se mantenha detectável até
        ao fim, e uma célula só emerge se o teste do período completo for significativo. «Quanto
        falta» é uma projecção condicional (se o declive e o ruído actuais persistirem): uma ordem
        de grandeza, nunca uma previsão do clima.
      </p>
    </section>
  );
}
