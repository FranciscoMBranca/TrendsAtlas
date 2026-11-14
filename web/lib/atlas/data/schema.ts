/**
 * Contrato dos ficheiros em `public/data/` (ver docs/04-contrato-de-dados.md).
 *
 * Os JSON vêm do pipeline Python, de fora da aplicação. Validamo-los na
 * fronteira com zod: se o formato mudar, o site mostra um erro claro em vez de
 * desenhar lixo. Os tipos TypeScript derivam dos schemas, para nunca divergirem.
 */
import { z } from "zod";

const interval = z.tuple([z.number(), z.number()]);

export const gridCellSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Na unidade da variável, por década (`meta.variable.trendUnit`). */
  trend: z.number(),
  p: z.number().min(0).max(1),
  /** Intervalo de confiança de 95% da tendência. */
  ci: interval,
  /** p < alpha, sem correcção para testes múltiplos. */
  sig: z.boolean(),
  /** Sobrevive ao controlo de falsas descobertas (Benjamini-Hochberg). */
  sigFdr: z.boolean(),
  /** Ano a partir do qual a tendência é detectável e assim se mantém; null = ainda não. */
  emergence: z.number().int().nullable(),
  /** Idem, com controlo de falsas descobertas em cada janela. */
  emergenceFdr: z.number().int().nullable(),
  /** Anos extra até ser detectável, se a tendência actual persistir; null = já detectável ou sem previsão. */
  yearsToDetect: z.number().int().nullable(),
});

export const monthlyPointSchema = z.object({
  /** Primeiro dia do mês, ISO (YYYY-MM-DD). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Anomalia, na unidade da variável. */
  anomaly: z.number(),
});

export const regionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** [oeste, sul, este, norte] em graus; não atravessa o antimeridiano. */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  trend: z.number(),
  p: z.number().min(0).max(1),
  ci: interval,
  sig: z.boolean(),
  /** Valor médio da região, na unidade da variável. */
  meanValue: z.number(),
  /** Tendência por década em % da média da região; null se a média for 0. */
  trendPctOfMean: z.number().nullable(),
  cells: z.number().int().positive(),
  emergence: z.number().int().nullable(),
  yearsToDetect: z.number().int().nullable(),
  series: z.array(monthlyPointSchema).min(1),
});

const highlightRegion = z.object({
  regionId: z.string(),
  name: z.string(),
  trend: z.number(),
});

export const variableSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  unit: z.string(),
  trendUnit: z.string(),
  /** Casas decimais ao mostrar tendências (NDVI precisa de mais do que °C). */
  decimals: z.number().int().min(0).max(5),
  /** Onde há dados: o "global" de uma variável só oceânica não é o planeta todo. */
  coverage: z.enum(["global", "land", "ocean", "polar-ocean"]),
  /** Escolhe as cores do mapa (ver src/styles/tokens.css). */
  palette: z.string(),
  copy: z.object({
    /** Legenda da cor negativa e da positiva, p. ex. "Menos chuva" / "Mais chuva". */
    down: z.string(),
    up: z.string(),
    headline: z.string(),
    /** Título da abertura; o trecho entre asteriscos vai em itálico. */
    opening: z.string(),
    /** "a precipitação": sujeito de frases como "A precipitação sobe …". */
    subject: z.string(),
    description: z.string(),
  }),
});

export const metaSchema = z.object({
  schemaVersion: z.literal(3),
  generatedAt: z.string(),
  isDemo: z.boolean(),
  source: z.object({
    name: z.string(),
    product: z.string(),
    version: z.string(),
    doi: z.string(),
    note: z.string(),
  }),
  variable: variableSchema,
  period: z.object({ start: z.string(), end: z.string(), months: z.number().int().positive() }),
  grid: z.object({
    stepDeg: z.number().positive(),
    nLat: z.number().int(),
    nLon: z.number().int(),
    cells: z.number().int(),
  }),
  method: z.object({
    trend: z.string(),
    test: z.string(),
    autocorrelationCorrection: z.string(),
    alpha: z.number(),
    fdrAlpha: z.number(),
    anomalies: z.string(),
    areaWeighting: z.string(),
  }),
  emergence: z.object({
    minYears: z.number().int(),
    maxHorizonYears: z.number().int(),
    /** Fracção de área "significativa" esperada só por acaso, em %. */
    chanceLevelPct: z.number(),
    byYear: z
      .array(
        z.object({
          year: z.number().int(),
          /** % da área significativa na janela que termina nesse ano (o que se veria então). */
          pctSeen: z.number(),
          pctSeenFdr: z.number(),
          /** % da área cuja tendência já tinha emergido (e assim ficou) até esse ano. */
          pctEmerged: z.number(),
          pctEmergedFdr: z.number(),
        }),
      )
      .min(1),
    /** % da área onde a tendência ainda não é detectável. */
    pendingAreaPct: z.number(),
    /** Dessa, a % onde há uma previsão de anos até detectar. */
    pendingWithForecastPct: z.number(),
  }),
  highlights: z.object({
    regionIncrease: highlightRegion.nullable(),
    regionDecrease: highlightRegion.nullable(),
    significantAreaPct: z.number(),
    significantAreaPctFdr: z.number(),
    globalTrend: z.object({ trend: z.number(), p: z.number(), ci: interval }),
  }),
});

/** Linha do índice `variables.json`: o suficiente para o selector e para o painel comparativo. */
export const manifestEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  unit: z.string(),
  trendUnit: z.string(),
  decimals: z.number().int(),
  coverage: variableSchema.shape.coverage,
  isDemo: z.boolean(),
  source: z.string(),
  globalTrend: z.number(),
  globalP: z.number(),
  significantAreaPct: z.number(),
  significantAreaPctFdr: z.number(),
  /** % da área onde a tendência ainda não é detectável. */
  pendingAreaPct: z.number(),
  /** Primeiro ano em que metade da área (com FDR) já tinha emergido; null = nunca. */
  firstEmergenceYear: z.number().int().nullable(),
  chanceLevelPct: z.number(),
});

export const manifestSchema = z.object({
  schemaVersion: z.literal(3),
  variables: z.array(manifestEntrySchema).min(1),
});

export const gridSchema = z.array(gridCellSchema).min(1);
export const regionsSchema = z.array(regionSchema).min(1);
export const seriesSchema = z.array(monthlyPointSchema).min(2);

export type GridCell = z.infer<typeof gridCellSchema>;
export type MonthlyPoint = z.infer<typeof monthlyPointSchema>;
export type Region = z.infer<typeof regionSchema>;
export type VariableMeta = z.infer<typeof variableSchema>;
export type ManifestEntry = z.infer<typeof manifestEntrySchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type AtlasMeta = z.infer<typeof metaSchema>;

export interface AtlasData {
  meta: AtlasMeta;
  grid: GridCell[];
  regions: Region[];
  /** Série global mensal (anomalia média ponderada pela área). */
  series: MonthlyPoint[];
}
