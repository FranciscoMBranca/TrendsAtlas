import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ALPHA,
  DEMO_FIRST_YEAR,
  runDemo,
  simulateFalseAlarms,
  type DemoParams,
  type FalseAlarmOutcome,
} from "@/lib/atlas/demo/significance-demo";
import type { AtlasMeta, MonthlyPoint } from "@/lib/atlas/data/schema";
import { formatP, number, signed } from "@/lib/atlas/format";
import { describeEmergence } from "@/lib/atlas/narrative";

import { AnomalyChart } from "./AnomalyChart";
import { SectionHeader } from "./SectionHeader";

const FALSE_ALARM_SERIES = 400;
const FALSE_ALARM_MONTHS = 120;

const PRESETS: { label: string; params: Omit<DemoParams, "seed"> }[] = [
  { label: "Sinal claro", params: { trendPerDecade: 0.6, noiseSd: 0.3, years: 20 } },
  { label: "Ruído a esconder o sinal", params: { trendPerDecade: 0.3, noiseSd: 2, years: 8 } },
  { label: "Sem tendência", params: { trendPerDecade: 0, noiseSd: 1, years: 20 } },
];

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}

function Slider({ id, label, value, min, max, step, format, onChange }: SliderProps) {
  return (
    <div className="demo-slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{format(value)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

/** Transforma valores soltos numa série mensal a partir de Janeiro de 2001, para o gráfico. */
const toSeries = (values: readonly number[]): MonthlyPoint[] =>
  values.map((anomaly, t) => ({
    date: `${2001 + Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`,
    anomaly,
  }));

/** Secção 04: sentir, a mexer, quando uma tendência deixa de ser acaso. */
export function SignificanceDemo({ meta }: { meta: AtlasMeta }) {
  const [params, setParams] = useState<DemoParams>({ ...PRESETS[0]!.params, seed: 1 });
  const [alarms, setAlarms] = useState<FalseAlarmOutcome | null>(null);

  const outcome = useMemo(() => runDemo(params), [params]);
  const series = useMemo(() => toSeries(outcome.values), [outcome.values]);
  const set = <K extends keyof DemoParams>(key: K, value: DemoParams[K]) =>
    setParams((current) => ({ ...current, [key]: value }));

  const { result } = outcome;
  const trendLabel = `${signed(params.trendPerDecade)} unid. por década`;

  return (
    <section id="significativo" className="demo-section atlas-width">
      <div className="section-heading-row">
        <SectionHeader number="05" title="É significativo?" />
        <span className="technical">DEMONSTRAÇÃO · RECALCULA NO BROWSER</span>
      </div>
      <div className="section-intro">
        <h3>
          Uma tendência não é <em>um número</em>. É um número e a sua dúvida.
        </h3>
        <p>
          Inventámos uma série com uma tendência conhecida e juntámos ruído. Mexa nos controlos e
          veja o teste de Mann-Kendall (o mesmo do mapa) decidir se a tendência se distingue do
          acaso.
        </p>
      </div>

      <div className="demo-grid">
        <div className="demo-controls">
          <div className="demo-presets" role="group" aria-label="Exemplos">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="preset-button"
                onClick={() => setParams((current) => ({ ...preset.params, seed: current.seed }))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Slider
            id="demo-trend"
            label="Tendência verdadeira"
            value={params.trendPerDecade}
            min={-1}
            max={1}
            step={0.05}
            format={(v) => `${signed(v)} unid./déc.`}
            onChange={(v) => set("trendPerDecade", v)}
          />
          <Slider
            id="demo-noise"
            label="Ruído mensal"
            value={params.noiseSd}
            min={0.1}
            max={3}
            step={0.1}
            format={(v) => `${number(v, 1)} unid.`}
            onChange={(v) => set("noiseSd", v)}
          />
          <Slider
            id="demo-years"
            label="Anos de dados"
            value={params.years}
            min={3}
            max={24}
            step={1}
            format={(v) => `${v} anos`}
            onChange={(v) => set("years", v)}
          />
          <Button variant="editorial" size="sm" onClick={() => set("seed", params.seed + 1)}>
            Nova amostra de ruído
          </Button>
        </div>

        <div className="demo-result">
          <AnomalyChart
            series={series}
            height={280}
            label="Série sintética com a recta de tendência estimada"
          />
          {result ? (
            <div
              className={`demo-verdict ${outcome.significant ? "is-significant" : "is-noise"}`}
              role="status"
            >
              <strong>
                {outcome.significant
                  ? "Significativa: o acaso explica mal esta tendência."
                  : "Ainda não significativa: com estes dados, o teste não distingue a tendência do acaso."}
              </strong>
              <dl>
                <div>
                  <dt>Imposta</dt>
                  <dd>{trendLabel}</dd>
                </div>
                <div>
                  <dt>Estimada</dt>
                  <dd>{signed(result.slopePerDecade)}</dd>
                </div>
                <div>
                  <dt>IC 95%</dt>
                  <dd>
                    [{signed(result.ciPerDecade[0])}; {signed(result.ciPerDecade[1])}]
                  </dd>
                </div>
                <div>
                  <dt>Valor-p</dt>
                  <dd>{formatP(result.p)}</dd>
                </div>
              </dl>
              <p>
                {result.ciPerDecade[0] <= 0 && result.ciPerDecade[1] >= 0
                  ? "O intervalo cruza o zero: com estes dados, não dá para afirmar se o valor sobe ou desce."
                  : "O intervalo fica de um lado do zero: a direcção da mudança é fiável, mesmo que o tamanho seja incerto."}
              </p>
              <p className="demo-emergence">
                <strong>Emergência. </strong>
                {outcome.emergence
                  ? describeEmergence(
                      outcome.emergence.year,
                      outcome.emergence.yearsToDetect,
                      DEMO_FIRST_YEAR,
                    )
                  : "Com menos de 10 anos de dados não há janela suficiente para medir a emergência."}
              </p>
            </div>
          ) : (
            <p className="demo-verdict is-noise">Série inválida para o teste.</p>
          )}
        </div>
      </div>

      <div className="alarm-box">
        <div>
          <h4>E num mapa inteiro?</h4>
          <p>
            Com p &lt; {number(ALPHA)} em cada célula, cerca de 5% aparecem significativas só por
            acaso. Simulámos {FALSE_ALARM_SERIES} células de ruído puro, sem nenhuma tendência real:
          </p>
        </div>
        <div className="alarm-action">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setAlarms(
                simulateFalseAlarms(
                  FALSE_ALARM_SERIES,
                  FALSE_ALARM_MONTHS,
                  params.seed,
                  meta.method.fdrAlpha,
                ),
              )
            }
          >
            Simular
          </Button>
          {alarms && (
            <p role="status">
              <strong>{alarms.rawCount}</strong> de {alarms.series} aparecem como «significativas»
              com p &lt; {number(ALPHA)}. Com controlo de falsas descobertas, só{" "}
              <strong>{alarms.fdrCount}</strong>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
