// Thin client for the Terra Tempo API. Static files in /data are the degraded mode (B07).

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Label = "real" | "demonstracao";

export interface VariableMeta {
  id: string;
  unidade: string;
  fonte: string;
  produto_candidato: string;
  resolucao_graus: number;
  periodo: { inicio: number; fim: number };
  rotulo: Label;
  camada: number;
}

export interface Manifest {
  schemaVersion: string;
  contem_demonstracao: boolean;
  presets: string[];
  variaveis: VariableMeta[];
}

export interface TrendMap {
  schemaVersion: string;
  variavel: string;
  unidade: string;
  rotulo: Label;
  periodo: { inicio: number; fim: number };
  resolucao_graus: number;
  lats: number[];
  lons: number[];
  fdr_q: number;
  declive_decada: (number | null)[][];
  p: (number | null)[][];
  significativa: number[][];
}

export type Region =
  | { tipo: "globo" }
  | { tipo: "rectangulo"; oeste: number; sul: number; este: number; norte: number }
  | { tipo: "poligono"; coordenadas: number[][][] };

export type Seal =
  | "significativa"
  | "ainda_nao_significativa"
  | "sem_tendencia_clara"
  | "dados_insuficientes"
  | "resultado_dividido";

export interface Analysis {
  schemaVersion: string;
  variavel: string;
  unidade: string;
  rotulo: Label;
  regiao: { tipo: string; n_celulas: number; resolucao_graus: number; menor_que_resolucao: boolean };
  meses: number[] | null;
  passo: "mes" | "ano";
  n_pontos: number;
  aviso_poucos_pontos: boolean;
  periodo: { inicio: number; fim: number };
  serie: { t: string; anomalia: number | null }[];
  tendencia_linha: (number | null)[];
  banda_inferior: (number | null)[];
  banda_superior: (number | null)[];
  estatisticas: Record<string, number | null>;
  selo: Seal;
  regra_valor_p: number;
  quanto_falta_anos: number | null;
  frase: { chave: string; parametros: { declive_decada: number | null; meses: number[] | null; anos: number | null } };
}

export interface ApiError {
  chave: string;
  parametros: Record<string, string | number>;
}

export async function getManifest(): Promise<{ manifest: Manifest; apiOk: boolean }> {
  try {
    const r = await fetch(`${API_URL}/variaveis`, { cache: "no-store" });
    if (r.ok) return { manifest: await r.json(), apiOk: true };
  } catch {
    /* fall through to static data */
  }
  const r = await fetch("/data/manifest.json");
  return { manifest: await r.json(), apiOk: false };
}

export async function getMap(variable: string, preset: string): Promise<TrendMap> {
  // Pre-computed maps are static files: they work without the API (SPEC-130 level 1).
  const r = await fetch(`/data/mapa-${variable}-${preset}.json`);
  if (!r.ok) throw new Error("map");
  return r.json();
}

export async function analyseRegion(body: {
  variavel: string;
  regiao: Region;
  inicio?: number;
  fim?: number;
  meses?: number[];
}): Promise<{ ok: true; data: Analysis } | { ok: false; error: ApiError }> {
  let r: Response;
  try {
    r = await fetch(`${API_URL}/regiao/analise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: { chave: "erro.rede", parametros: {} } };
  }
  if (r.ok) return { ok: true, data: await r.json() };
  try {
    const j = await r.json();
    if (j?.detail?.chave) return { ok: false, error: j.detail };
  } catch {
    /* ignore */
  }
  return { ok: false, error: { chave: "erro.generico", parametros: {} } };
}
