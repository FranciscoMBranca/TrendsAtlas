# R0 (W41): pilha real e mapa de colisões

Levantado a 2026-11-14 por leitura do código e da página publicada. Fontes:

- Protótipo publicado: https://terra-tempo.vercel.app (aberto com Playwright, Chromium headless).
- Código do protótipo: https://github.com/FranciscoMBranca/terra-tempo, ramo `main`, commit `f196de2` (2026-10-24, "icone"). É público; clonado só para leitura. Só tem o ramo `main`.
- Fase 0: este repositório, https://github.com/FranciscoMBranca/TrendsAtlas, commit `0988c9b` (2026-11-14).

> **Correcção ao plano:** a tarefa diz que o repositório do projecto é `terra-tempo`. Na verdade há **dois repositórios**: `terra-tempo` tem o protótipo (código gerado com Lovable e depois editado) e `TrendsAtlas` tem a Fase 0. O protótipo **não está** neste repositório.

> **Os dados publicados são os do repositório:** `data/temperature/meta.json` servido pela Vercel é igual, byte a byte, ao de `public/data/temperature/meta.json` no commit `f196de2`.

## 1. Pilhas lado a lado

| Camada | Protótipo (`terra-tempo`) | Fase 0 (`TrendsAtlas/web`) | Colide? |
| --- | --- | --- | --- |
| Framework | TanStack Start 1.168 (React 19, Vite 8, SSR com Nitro), gerado por Lovable (`.lovable/`, `@lovable.dev/vite-tanstack-config`) | Next.js 15.5 (App Router, React 19) | **Sim** |
| Encaminhamento | Uma rota (`src/routes/index.tsx`); a variável vive no URL (`/?v=sea_ice`) | Uma página (`app/page.tsx`); a variável vive em `useState` | Sim |
| Mapa | SVG próprio com **d3-geo**, projecção **Equal Earth**, células como polígonos projectados, contorno de terra de `land.json` (topojson). Um só ouvinte de ponteiro | **Leaflet** com mosaicos OpenStreetMap, células como rectângulos em canvas, projecção Web Mercator | **Sim** (visual e comportamento muito diferentes) |
| Gráficos | **Recharts** 2.15 | SVG escrito à mão (`components/Chart.tsx`) | Sim |
| CSS | **Tailwind v4** em modo CSS-first, tokens em `src/styles/tokens.css` (OKLCH), mais 12 ficheiros CSS por área; shadcn/ui (Radix) em `components/ui/` | CSS simples num ficheiro (`app/globals.css`), sem tokens partilhados | Sim |
| Tipos de letra | Newsreader, IBM Plex Sans, IBM Plex Mono, **do CDN do Google Fonts** | Fontes do sistema | Sim |
| Dados | Ficheiros estáticos `public/data/<variável>/{meta,grid_trend,regions,series_global}.json` + `variables.json` + `land.json`, `schemaVersion: 3`, validados com **zod**; sem API | Ficheiros estáticos `public/data/{manifest,mapa-*,serie-*}.json` com `schemaVersion: "0.1.0"`, **mais** API FastAPI para regiões | **Sim**: esquemas, nomes e formato diferentes |
| Ids das variáveis | Inglês: `temperature`, `precipitation`, `vegetation`, `sea_ice`, `aerosols`, `sea_level` | Português: `temperatura`, `precipitacao`, `humidade`, `aerossois` | Sim |
| Rótulo de demonstração | `meta.isDemo` (booleano) → "dados de exemplo" | `rotulo: "demonstracao"` → "DEMONSTRAÇÃO" | Sim (nome e texto) |
| Idiomas | Só pt, textos fixos nos componentes e em `meta.variable.copy` (dentro dos dados) | Catálogo de chaves pt/en (`lib/catalog.ts`) | Sim |
| Estatística no browser | Mann-Kendall + Sen + BH em TypeScript (`src/lib/stats/`), **sem** Hamed-Rao, com fixtures geradas pelo Python | Nenhuma: tudo vem da API ou dos ficheiros | Sim (duas implementações da mesma fórmula) |
| Pipeline Python | `pipeline/src/terratempo/` (pacote também chamado `terratempo`): sintético, emergência, regiões por caixa, **leitor IMERG** (`imerg.py`) e `download.py` | `pipeline/terratempo/`: fórmulas 1–7, 9, 13, 14, 17, mapas 5°, sintético | **Sim**: mesmo nome de pacote, conteúdos diferentes |
| Gestor de pacotes | **bun** (`bun.lock`, `bunfig.toml`) | npm (`package-lock.json`) | Sim |
| Testes do site | Vitest 4 + Testing Library (jsdom) | Vitest 5 | Pequena |
| Linter | ESLint 9 + Prettier | Nenhum (só `tsc`) | Sim |
| Deploy | Vercel (`terra-tempo.vercel.app`) | Por fazer | — |

## 2. Estado do CI

| Repositório | Estado | Detalhe |
| --- | --- | --- |
| `TrendsAtlas` (Fase 0) | **Falha** no último run do `main` ([run 43608521484](https://github.com/FranciscoMBranca/TrendsAtlas/actions/runs/43608521484)) | Job `python` falha no passo `pip install -e "pipeline[dev]" -r api/requirements.txt httpx`: `api/requirements.txt` tem `-e ../pipeline`, que é relativo à pasta `api/` mas o pip corre na raiz. Jobs `web` e `secrets` passam. **Não corrigido aqui** (a tarefa proíbe alterar a Fase 0). |
| `terra-tempo` (protótipo) | Sem GitHub Actions | A API do GitHub devolve 0 workflows |

## 3. Mapa de colisões (o que a Fase 0 pôs em `web/` contra o protótipo)

| Ficheiro da Fase 0 | Equivalente no protótipo | Colisão |
| --- | --- | --- |
| `web/app/page.tsx`, `components/Detective.tsx` (percurso em 4 ecrãs, painel + mapa lado a lado) | `routes/index.tsx` + 8 secções numa página longa com âncoras | Estrutura oposta: ecrãs separados contra leitura contínua |
| `web/components/MapView.tsx` (Leaflet) | `components/atlas/map/*` (d3-geo, SVG) | Biblioteca e projecção diferentes |
| `web/components/Chart.tsx` | `AnomalyChart.tsx`, `EmergenceChart.tsx` (Recharts) | Biblioteca diferente |
| `web/components/Result.tsx` (frase, selo, regra do valor-p, tabela, CSV) | `RegionContrast.tsx` (frase, IC, veredicto), `SignificanceDemo.tsx` | O protótipo **não tem** o resultado do Detetive para uma região escolhida pelo utilizador |
| `web/lib/catalog.ts` (pt/en) | textos fixos nos `.tsx`, `lib/narrative.ts` e `meta.variable.copy` | O protótipo não tem catálogo; textos dentro dos dados |
| `web/lib/api.ts` (API + recurso estático) | `lib/data/load.ts`, `schema.ts` (zod), `use-atlas-data.ts` (TanStack Query) | Contratos diferentes |
| `web/lib/colour.ts` (escala fixa por variável) | `lib/scale.ts` (escala simétrica pelo máximo da grelha) + `tokens.css` (paleta por variável) | Regras de escala diferentes: a Fase 0 fixa o extremo (SPEC-130), o protótipo usa o máximo dos dados |
| `web/public/data/*` | `public/data/*` | Esquemas e nomes diferentes |
| `web/app/globals.css` | `src/styles/*.css` | Tudo |

## 4. Consequências para a decisão D2 (um humano decide; esta tarefa **não** escolhe)

**Opção A: migrar o protótipo para a pilha da Fase 0 (Next.js).**
- Reescrever o mapa d3-geo em Next.js é possível (d3-geo não depende do framework), mas abandonar Leaflet; ou manter Leaflet e **não** ficar igual ao protótipo (Equal Earth não existe em Leaflet sem plugins).
- Portar os 12 ficheiros CSS e os tokens (Tailwind v4 funciona em Next.js).
- Trocar Recharts? Pode manter-se em Next.js.
- Mantém a API FastAPI e o catálogo de idiomas da Fase 0.

**Opção B: adoptar a pilha do protótipo (TanStack Start) e trazer para lá o que a Fase 0 tem.**
- O visual e o comportamento ficam iguais à partida (é o próprio código).
- Trazer: catálogo de idiomas (SPEC-140), percurso do Detetive (SPEC-101/102), cliente da API, rótulos `DEMONSTRAÇÃO`.
- Custo: bun em vez de npm, Lovable no ciclo (`.lovable/`, configuração Vite própria), dois pacotes `terratempo` a fundir.

**Em qualquer opção:**
- Um só pacote Python `terratempo`. O protótipo tem um leitor IMERG (`imerg.py`) e `download.py` que interessam ao P03; a Fase 0 tem as fórmulas 13, 14 e 17 e a API.
- Um só esquema de dados (`schemaVersion`) e um só conjunto de ids de variáveis.
- Uma só implementação de cada fórmula (`CLAUDE.md`: "cada fórmula vive num só sítio"). O protótipo calcula Mann-Kendall no browser para a demonstração "É significativo?"; isso é uma segunda implementação, hoje protegida por fixtures. Decidir se fica.
- Tipos de letra locais (modo leve, W26), não do CDN.
