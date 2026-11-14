import type { ManifestEntry } from "@/lib/atlas/data/schema";

/** Variável aberta quando o endereço não diz qual. */
export const DEFAULT_VARIABLE = "temperature";

/**
 * Escolhe a variável a mostrar: a pedida no endereço se existir no índice, senão a de
 * defeito, senão a primeira. Um `?v=` inventado nunca deve partir a página.
 */
export function pickVariable(variables: readonly ManifestEntry[], requested?: string): string {
  const ids = variables.map((v) => v.id);
  if (requested && ids.includes(requested)) return requested;
  return ids.includes(DEFAULT_VARIABLE) ? DEFAULT_VARIABLE : ids[0]!;
}
