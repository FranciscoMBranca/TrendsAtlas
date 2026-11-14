import { ArrowUpRight } from "lucide-react";

import type { ManifestEntry } from "@/lib/atlas/data/schema";

import { VariableSwitcher } from "./VariableSwitcher";

const SECTIONS = [
  { href: "#panorama", label: "Panorama" },
  { href: "#o-que", label: "O quê" },
  { href: "#onde", label: "Onde" },
  { href: "#quando", label: "Quando" },
  { href: "#investigar", label: "Investigue" },
  { href: "#regioes", label: "Regiões" },
  { href: "#significativo", label: "Significância" },
  { href: "#metodo", label: "Método" },
] as const;

interface AtlasHeaderProps {
  variables?: readonly ManifestEntry[] | undefined;
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
}

export function AtlasHeader({ variables, selectedId, onSelect }: AtlasHeaderProps) {
  return (
    <header className="atlas-header">
      <div className="atlas-width header-inner">
        <a href="#abertura" className="wordmark" aria-label="Atlas de Tendências, início">
          <span className="atlas-mark" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i} />
            ))}
          </span>
          <span className="wordmark-text">Atlas de Tendências</span>
        </a>
        <nav className="header-nav" aria-label="Secções">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a href="#onde" className="nav-map">
            Explorar o mapa <ArrowUpRight />
          </a>
        </nav>
      </div>
      {variables && selectedId && onSelect && (
        <VariableSwitcher variables={variables} selectedId={selectedId} onSelect={onSelect} />
      )}
    </header>
  );
}
