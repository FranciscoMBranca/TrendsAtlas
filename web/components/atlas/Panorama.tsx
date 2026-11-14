import type { Manifest } from "@/lib/atlas/data/schema";
import { formatP, number, signed } from "@/lib/atlas/format";

import { SectionHeader } from "./SectionHeader";

const COVERAGE = {
  global: "Globo inteiro",
  land: "Só em terra",
  ocean: "Só no oceano",
  "polar-ocean": "Oceanos polares",
} as const;

interface PanoramaProps {
  manifest: Manifest;
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Painel comparativo: as mesmas três perguntas (quanto, quanto do mapa, desde quando)
 * para todas as variáveis. Não compara magnitudes (°C e mm não se comparam), compara
 * a EVIDÊNCIA: que fracção da área tem uma tendência distinguível do acaso.
 */
export function Panorama({ manifest, selectedId, onSelect }: PanoramaProps) {
  const anyDemo = manifest.variables.some((v) => v.isDemo);
  return (
    <section id="panorama" className="panorama atlas-width">
      <SectionHeader number="00" title="Panorama das variáveis" />
      <div className="section-intro">
        <h3>
          O mesmo teste, <em>seis assuntos.</em>
        </h3>
        <p>
          Para cada variável: a tendência média, a parte do mapa em que ela se distingue do acaso e
          desde quando. Clique numa linha para abrir o atlas dessa variável.
        </p>
      </div>
      <table className="panorama-table">
        <thead>
          <tr>
            <th scope="col">VARIÁVEL</th>
            <th scope="col">TENDÊNCIA MÉDIA</th>
            <th scope="col">ÁREA SIGNIFICATIVA (FDR)</th>
            <th scope="col">METADE DA ÁREA DETECTÁVEL</th>
          </tr>
        </thead>
        <tbody>
          {manifest.variables.map((v) => (
            <tr
              key={v.id}
              className="panorama-row"
              data-palette={v.id}
              data-selected={v.id === selectedId}
            >
              <td>
                <button
                  type="button"
                  className="panorama-row-button"
                  aria-current={v.id === selectedId ? "true" : undefined}
                  onClick={() => onSelect(v.id)}
                >
                  <span className="chip-swatch" aria-hidden="true" />
                  {v.name}
                </button>
                <span className="panorama-coverage">{COVERAGE[v.coverage]}</span>
              </td>
              <td className="panorama-trend" data-label="Tendência média">
                {signed(v.globalTrend, v.decimals + 1)}
                <small>{v.trendUnit}</small>
                <span className="panorama-coverage">p {formatP(v.globalP)}</span>
              </td>
              <td data-label="Área significativa (FDR)">
                <div
                  className="area-bar"
                  role="img"
                  aria-label={`${number(v.significantAreaPctFdr, 0)}% da área, contra ${number(v.chanceLevelPct, 0)}% esperado só por acaso`}
                >
                  <span style={{ width: `${v.significantAreaPctFdr}%` }} />
                  <i style={{ left: `${v.chanceLevelPct}%` }} title="Nível esperado só por acaso" />
                </div>
                <div className="area-value">{number(v.significantAreaPctFdr, 0)}%</div>
              </td>
              <td data-label="Metade da área detectável">{v.firstEmergenceYear ?? "ainda não"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="panorama-note">
        A linha vertical marca o que o acaso daria sozinho (
        {number(manifest.variables[0]!.chanceLevelPct, 0)}%). A área é ponderada por cos(latitude) e
        só conta onde a variável tem dados, por isso percentagens de variáveis com cobertura
        diferente (gelo marinho, nível do mar) não se referem à mesma parte do planeta.
        {anyDemo
          ? " Dados de demonstração sintéticos: os números ilustram o método, não o planeta."
          : ""}
      </p>
    </section>
  );
}
