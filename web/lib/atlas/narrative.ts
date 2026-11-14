/**
 * Frases geradas a partir dos números.
 *
 * Regra: o texto só afirma o que os dados mostram (direcção, tamanho, incerteza).
 * Causas físicas (porquê chove mais, aquece ou recua o gelo) nunca saem daqui: os dados não as provam.
 */
import { formatP, number } from "@/lib/atlas/format";
import type { Region, VariableMeta } from "@/lib/atlas/data/schema";

export type TrendVerdict = "rising" | "falling" | "unclear";

/** Subida ou descida só contam quando o teste as sustenta (p < 0,05). */
export function trendVerdict(trend: number, sig: boolean): TrendVerdict {
  if (!sig) return "unclear";
  return trend > 0 ? "rising" : "falling";
}

export const VERDICT_LABEL: Record<TrendVerdict, string> = {
  rising: "Aumento",
  falling: "Redução",
  unclear: "Sem sinal claro",
};

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const direction = (trend: number) => (trend >= 0 ? "sobe" : "desce");

/** Uma frase honesta sobre uma região: quanto, com que incerteza, e o que o teste diz. */
export function describeRegion(region: Region, variable: VariableMeta): string {
  const d = variable.decimals;
  const [low, high] = region.ci;
  const ci = `IC 95%: ${number(low, d)} a ${number(high, d)}`;
  const size = `${number(Math.abs(region.trend), d)} ${variable.trendUnit} (${ci})`;
  const share =
    region.trendPctOfMean === null
      ? ""
      : `, cerca de ${number(Math.abs(region.trendPctOfMean), 0)}% da média da região`;

  if (region.sig) {
    return `${capitalise(variable.copy.subject)} ${direction(region.trend)} ${size}${share}. Com p ${formatP(region.p)}, o acaso explica mal esta mudança.`;
  }
  return `A estimativa é de ${number(region.trend, d)} ${variable.trendUnit} (${ci}), mas com p ${formatP(region.p)} ainda não se distingue do acaso. Não quer dizer que não haja tendência: pode faltar tempo.`;
}

/** Frase sobre o tempo de emergência: desde quando é detectável, ou quanto falta. */
export function describeEmergence(
  emergence: number | null,
  yearsToDetect: number | null,
  firstYear: number,
): string {
  if (emergence !== null) {
    return `A tendência tornou-se detectável em ${emergence} (com dados desde ${firstYear}) e assim se manteve.`;
  }
  if (yearsToDetect !== null) {
    const unit = yearsToDetect === 1 ? "ano" : "anos";
    return `Ainda não é detectável. Se a tendência actual e o ruído se mantiverem, seriam precisos cerca de ${yearsToDetect} ${unit} de dados adicionais.`;
  }
  return "Ainda não é detectável e os dados não permitem estimar quando poderá ser.";
}
