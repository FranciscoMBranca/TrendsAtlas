import type { ManifestEntry } from "@/lib/atlas/data/schema";

interface VariableSwitcherProps {
  variables: readonly ManifestEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/**
 * Escolha da variável. Cada botão mostra a sua paleta (`data-palette` + o gradiente
 * da legenda), para a cor também ser uma pista de que o assunto mudou.
 */
export function VariableSwitcher({ variables, selectedId, onSelect }: VariableSwitcherProps) {
  return (
    <nav className="atlas-width variable-rail" aria-label="Variável">
      {variables.map((variable) => (
        <button
          key={variable.id}
          type="button"
          className="variable-chip"
          data-palette={variable.id}
          aria-pressed={variable.id === selectedId}
          onClick={() => onSelect(variable.id)}
        >
          <span className="chip-swatch" aria-hidden="true" />
          {variable.name}
        </button>
      ))}
    </nav>
  );
}
