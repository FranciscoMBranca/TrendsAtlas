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
                Dados: {meta.source.name}, {meta.source.product}, versão {meta.source.version}
                {meta.source.doi && (
                  <>
                    {" "}· DOI{" "}
                    <a href={`https://doi.org/${meta.source.doi}`} target="_blank" rel="noopener noreferrer">
                      {meta.source.doi}
                    </a>
                  </>
                )}
                .
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
            DADOS OBSERVADOS · ESQUEMA v
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
