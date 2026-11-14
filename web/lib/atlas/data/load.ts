import { type ZodType } from "zod";

import {
  type AtlasData,
  type Manifest,
  gridSchema,
  manifestSchema,
  metaSchema,
  regionsSchema,
  seriesSchema,
} from "./schema";

export const DATA_BASE_URL = "/data";

/** Erro com mensagem própria para o ecrã (o detalhe técnico vai na `cause`). */
export class AtlasDataError extends Error {}

type Fetcher = (input: string) => Promise<Response>;

async function loadJson<T>(file: string, schema: ZodType<T>, fetcher: Fetcher): Promise<T> {
  const url = `${DATA_BASE_URL}/${file}`;
  let response: Response;
  try {
    response = await fetcher(url);
  } catch (cause) {
    throw new AtlasDataError(`Não foi possível pedir ${file}.`, { cause });
  }
  if (!response.ok) throw new AtlasDataError(`${file}: resposta ${response.status}.`);

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue ? issue.path.join(".") : "";
    throw new AtlasDataError(`${file} não cumpre o contrato (${where}: ${issue?.message}).`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

/** O índice das variáveis disponíveis (`variables.json`). */
export const loadManifest = (fetcher: Fetcher = (url) => fetch(url)): Promise<Manifest> =>
  loadJson("variables.json", manifestSchema, fetcher);

/** Carrega e valida os quatro ficheiros de UMA variável (`public/data/<id>/`). */
export async function loadAtlasData(
  variableId: string,
  fetcher: Fetcher = (url) => fetch(url),
): Promise<AtlasData> {
  const [meta, grid, regions, series] = await Promise.all([
    loadJson(`${variableId}/meta.json`, metaSchema, fetcher),
    loadJson(`${variableId}/grid_trend.json`, gridSchema, fetcher),
    loadJson(`${variableId}/regions.json`, regionsSchema, fetcher),
    loadJson(`${variableId}/series_global.json`, seriesSchema, fetcher),
  ]);
  if (meta.variable.id !== variableId) {
    throw new AtlasDataError(`${variableId}/meta.json descreve '${meta.variable.id}'.`);
  }
  return { meta, grid, regions, series };
}
