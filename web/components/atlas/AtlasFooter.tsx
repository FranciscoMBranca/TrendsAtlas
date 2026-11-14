import type { AtlasMeta } from "@/lib/atlas/data/schema";
import { yearOf } from "@/lib/atlas/format";

export function AtlasFooter({ meta }: { meta: AtlasMeta | undefined }) {
  return (
    <footer id="fontes" className="atlas-footer">
      <div className="atlas-width footer-inner">
        <div>
          {meta ? (
            <>
              <p>
                {meta.isDemo
                  ? "Esta edição usa dados sintéticos; não permite inferências sobre o clima real."
                  : `Dados: ${meta.source.name}, ${meta.source.product}.`}
              </p>
              <p className="mt-2">
                Média e áreas ponderadas pelo co-seno da latitude. Grelha de {meta.grid.stepDeg}° ×{" "}
                {meta.grid.stepDeg}°.
                <br />
                Significância estatística não é atribuição causal.
              </p>
            </>
          ) : (
            <p>Atlas de Tendências.</p>
          )}
        </div>
        {meta && (
          <div className="footer-meta">
            {meta.isDemo ? "EDIÇÃO DEMONSTRATIVA" : "DADOS OBSERVADOS"} · ESQUEMA v
            {meta.schemaVersion}
            <br />
            {yearOf(meta.period.start)}–{yearOf(meta.period.end)} / {meta.period.months} MESES
            <br />
            Gerado a {meta.generatedAt.slice(0, 10)}
          </div>
        )}
      </div>
    </footer>
  );
}
