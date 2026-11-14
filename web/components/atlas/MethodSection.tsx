import { Button } from "@/components/ui/button";
import type { AtlasData } from "@/lib/atlas/data/schema";
import { downloadText, gridToCsv, regionsToCsv } from "@/lib/atlas/export";
import { yearOf } from "@/lib/atlas/format";

import { SectionHeader } from "./SectionHeader";

const JSON_FILES = [
  ["grid_trend.json", "Grelha de tendências"],
  ["regions.json", "Regiões"],
  ["series_global.json", "Série global"],
  ["meta.json", "Metadados"],
] as const;

const LIMITS = [
  "Significância estatística não é atribuição causal: o teste diz se a mudança é distinguível do acaso, não porquê.",
  "Poucas décadas misturam tendência com variabilidade natural lenta, como o El Niño: um período diferente pode dar outro resultado.",
  "A grelha de 5° suaviza detalhes locais; uma célula é uma média, não um sítio.",
  "Os intervalos de confiança assumem que o modelo (tendência monótona) descreve bem a série.",
  "O ano de emergência é descritivo: espreitar os dados ano a ano infla falsos positivos, por isso exigimos persistência até ao fim.",
  "«Quanto falta» assume que declive e ruído se mantêm; o declive estimado é ele próprio incerto, logo é uma ordem de grandeza.",
];

export function MethodSection({ data }: { data: AtlasData }) {
  const { meta, grid, regions } = data;
  const { method, source } = meta;
  const years = `${yearOf(meta.period.start)}–${yearOf(meta.period.end)}`;

  const steps = [
    [
      "Anomalias",
      `Anomalia = ${method.anomalies}. Assim sai o ciclo das estações e sobra a mudança.`,
    ],
    [
      "Tendência",
      `${method.trend}: a mediana dos declives de todos os pares de meses. Um mês extremo quase não a move.`,
    ],
    [
      "Teste",
      `${method.test}: conta quantos pares sobem menos quantos descem e pergunta se o acaso explicaria um saldo assim (α = ${method.alpha}).`,
    ],
    [
      "Autocorrelação",
      `${method.autocorrelationCorrection}: meses vizinhos parecem-se, o que dá menos informação independente do que parece; a correcção alarga a incerteza, nunca a reduz.`,
    ],
    [
      "Testes múltiplos",
      `Benjamini-Hochberg com q = ${method.fdrAlpha}: controla a proporção de falsos positivos entre as ${meta.grid.cells} células.`,
    ],
    [
      "Emergência",
      `Repetimos o teste em janelas que crescem (${meta.emergence.minYears} anos, 11, ... até ao fim) e registamos o início da sequência final de janelas significativas. Uma célula só emerge se o período completo for significativo.`,
    ],
    [
      "Quanto falta",
      `Se o declive e o ruído actuais persistirem, o erro-padrão do declive encolhe com n^(-3/2); resolvemos em quantos anos fica abaixo do declive (limite de ${meta.emergence.maxHorizonYears} anos). É uma ordem de grandeza condicional, não uma previsão.`,
    ],
    [
      "Áreas",
      `Médias globais e percentagens de área pesam cada célula por ${method.areaWeighting}, porque os meridianos convergem para os pólos.`,
    ],
  ] as const;

  return (
    <section id="metodo" className="method-section atlas-width">
      <div className="section-heading-row">
        <SectionHeader number="06" title="Método e dados" />
        <span className="technical">REPRODUTÍVEL · {years}</span>
      </div>

      <div className="method-grid">
        <ol className="method-steps">
          {steps.map(([title, text]) => (
            <li key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
            </li>
          ))}
        </ol>

        <div className="method-side">
          <div className="method-block">
            <h4>Fonte</h4>
            <p>
              <strong>{source.name}</strong>
              {source.product ? ` · ${source.product}` : ""}
              {source.version ? ` · v${source.version}` : ""}
            </p>
            <p>{source.note}</p>
            {source.doi && (
              <p>
                DOI:{" "}
                <a href={`https://doi.org/${source.doi}`} target="_blank" rel="noreferrer">
                  {source.doi}
                </a>
              </p>
            )}
          </div>

          <div className="method-block">
            <h4>Limites</h4>
            <ul>
              {LIMITS.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
          </div>

          <div className="method-block">
            <h4>Descarregar</h4>
            <div className="download-row">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(
                    `grelha_${meta.variable.id}.csv`,
                    gridToCsv(grid, data.meta.variable),
                  )
                }
              >
                Grelha (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(
                    `regioes_${meta.variable.id}.csv`,
                    regionsToCsv(regions, data.meta.variable),
                  )
                }
              >
                Regiões (CSV)
              </Button>
            </div>
            <ul className="json-links">
              {JSON_FILES.map(([file, label]) => (
                <li key={file}>
                  <a href={`/data/${meta.variable.id}/${file}`} download={file}>
                    {label} · {file} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
