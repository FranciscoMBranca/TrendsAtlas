# R0 (W41): tokens do protótipo

Valores exactos e origem de cada um. Duas fontes, sempre indicadas:

- **[código]**: ficheiro do repositório `terra-tempo`, commit `f196de2` (`src/styles/…`).
- **[página]**: estilos calculados no Chromium sobre https://terra-tempo.vercel.app a 1280 px, variável por defeito (temperatura), com `tests/visual/capture.mjs --extract`. Dados em bruto: `tests/visual/extraido/estilos.json`; resumo: `tests/visual/extraido/estilos-resumo.txt`. A contagem é o número de elementos visíveis com esse valor.

## 1. Cores

### 1.1 Base (`:root`) [código: `src/styles/tokens.css`]

O sRGB é uma conversão aproximada (`tests/visual/contrast.py`); o valor normativo é o OKLCH.

| Token | Valor | sRGB aprox. | Uso observado [página] |
| --- | --- | --- | --- |
| `--background` | `oklch(0.965 0.01 87)` | `#f6f3ec` | Fundo da página, cabeçalho; texto do botão activo |
| `--foreground` | `oklch(0.237 0.009 248)` | `#1b1f23` | Texto principal (158 elementos) |
| `--muted-foreground` | `oklch(0.504 0.022 238)` | `#596670` | Texto secundário (157 elementos) |
| `--border` | `oklch(0.871 0.018 88)` | `#d9d4c8` | Todas as linhas (6010 elementos com borda) |
| `--primary` | `oklch(0.386 0.062 220)` | `#124b5b` | Ligações, botão activo, "Explorar o mapa" (26 textos, 16 fundos) |
| `--primary-foreground` | `var(--background)` | `#f6f3ec` | Texto sobre `--primary` |
| `--secondary` | `oklch(0.928 0.013 85)` | `#ebe7de` | Fundo de chips de variável e células da tabela Panorama (13) |
| `--map-ink` | `oklch(0.25 0.025 190)` | `#132624` | Contornos de terra do mapa |

Cores de sobreposição vistas só na página: `oklab(0.965 0.0005 0.0100 / 0.95)` (botões de zoom do mapa, fundo a 95%) e `oklab(0.504 -0.0117 -0.0187 / 0.55)` (linha "Anomalia mensal" da legenda do gráfico).

### 1.2 Paletas por variável [código: `src/styles/tokens.css`, atributo `data-palette` na raiz da página]

Regra escrita no código: a cor diz a **direcção**, nunca "bom" ou "mau". Mapa, gráficos e legendas usam só `--trend-down` e `--trend-up`.

| Paleta | `--trend-down` | sRGB | `--trend-up` | sRGB |
| --- | --- | --- | --- | --- |
| `:root` (por defeito = precipitação) | `oklch(0.491 0.112 66)` | `#8a5100` | `oklch(0.457 0.079 184)` | `#07655c` |
| `temperature` | `oklch(0.47 0.1 250)` | `#295e90` | `oklch(0.52 0.15 35)` | `#ae4024` |
| `precipitation` | `oklch(0.491 0.112 66)` | `#8a5100` | `oklch(0.457 0.079 184)` | `#07655c` |
| `vegetation` | `oklch(0.49 0.11 55)` | `#8f4d16` | `oklch(0.46 0.11 145)` | `#29672e` |
| `sea_ice` | `oklch(0.5 0.13 50)` | `#9b4805` | `oklch(0.45 0.1 245)` | `#185a89` |
| `aerosols` | `oklch(0.46 0.07 225)` | `#246075` | `oklch(0.45 0.12 330)` | `#793974` |
| `sea_level` | `oklch(0.5 0.1 90)` | `#796006` | `oklch(0.4 0.11 255)` | `#164781` |

- `--legend-gradient`: `linear-gradient(90deg, var(--trend-down), var(--background) 50%, var(--trend-up))` [código].
- Cor de cada célula: `color-mix(in oklab, <trend-down|trend-up> X%, var(--background))`, com X = |tendência| / máximo da grelha × 100 [código: `src/lib/scale.ts`, `trendColor`].
- Opacidade das células não significativas com o filtro activo: `0.15` [código: `scale.ts`, `FADED_OPACITY`].
- O tema Tailwind mapeia `--color-destructive` para `--trend-down` [código: `tokens.css`, `@theme inline`].

### 1.3 Contraste WCAG (calculado, `tests/visual/contrast.py`)

| Par | Contraste | AA texto normal (4,5:1) |
| --- | --- | --- |
| `--foreground` sobre `--background` | 14,97:1 | sim |
| `--muted-foreground` sobre `--background` | 5,30:1 | sim |
| `--muted-foreground` sobre `--secondary` | 4,75:1 | sim (margem pequena) |
| `--primary` sobre `--background` | 8,64:1 | sim |
| `--background` sobre `--primary` (botão activo) | 8,64:1 | sim |
| Todas as 12 cores de paleta sobre `--background` | 5,34:1 a 8,38:1 | sim |
| Todas as 12 cores de paleta sobre `--secondary` | 4,78:1 a 7,50:1 | sim |
| `--border` sobre `--background` | 1,33:1 | não se aplica a texto; **falha 3:1** para contornos de controlos (WCAG 1.4.11) se a borda for a única pista do controlo |

Não medido: o contraste das **células do mapa** (misturas a X% com o fundo) e do texto a 55% de opacidade.

## 2. Tipografia

### 2.1 Famílias [código: `tokens.css` `@theme`; carregamento em `src/routes/__root.tsx`]

| Token | Valor | Uso [página] |
| --- | --- | --- |
| `--font-display` | `"Newsreader", Georgia, serif` | Títulos, marca, números grandes (54 elementos) |
| `--font-sans` | `"IBM Plex Sans", sans-serif` | Corpo, navegação (94) |
| `--font-mono` | `"IBM Plex Mono", monospace` | Rótulos em maiúsculas, valores técnicos, eixos (210) |

Carregadas de `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,wght@0,400;0,500;1,500&display=swap` (6 ficheiros woff2 de `fonts.gstatic.com`, 14,6 a 58,1 kB cada). Pesos pedidos: Plex Mono 400/500, Plex Sans 400/500/600, Newsreader 400/500 e itálico 500.

### 2.2 Tamanhos [página]

| Tamanho | Elementos | Exemplos |
| --- | --- | --- |
| 9px | 35 | `span.edition` (abertura), `span.technical` (onde) |
| 9.09px | 10 | etiquetas de latitude do mapa (SVG `text`) |
| 10px | 117 | `span.data-badge`, `span.technical` |
| 11px | 30 | `p.eyebrow`, `small` |
| 11.2px | 6 | `small` (panorama) |
| 12px | 67 | `aside.margin-note`, `a.explore-link` |
| 13px | 20 | ligações do cabeçalho |
| 14px | 16 | células da tabela Panorama |
| 18px | 11 | `p.opening-subtitle`, linhas do Panorama |
| 20px | 11 | `h4` (método) |
| 21px | 4 | `span.region-name` (onde) |
| 22px | 5 | `h3` (regiões) |
| 40px | 12 | `h3` das secções |
| 54px | 6 | `div.metric-value` (números grandes) |
| 76px | 1 | `h1` da abertura (altura de linha 78.28px, peso 500, Newsreader) |

Tamanhos que mudam com a largura [página, medidos nas três larguras]: `h1` da abertura 43px a 375, 68px a 768 e 76px a 1280; números grandes (`.metric-value`) 40px a 375 e 54px a 768 e 1280.

> Nota: **152 elementos com 9 ou 10 px** de texto. Ver `divergencias.md` (legibilidade, W36).

### 2.3 Pesos, alturas de linha e espaçamento entre letras [página]

- Pesos: 400 (310 elementos), 500 (45; títulos e marca), 700 (3; `strong`).
- Alturas de linha mais usadas: 16px (84), 20.4px (36), 15px (32), 17.6px (24), 14.4px (22), 19.2px (19), 20.8px (17), 22.4px (12), 32px (11), 44.8px (8).
- `letter-spacing`: só `0.66px` (cabeçalhos da tabela Panorama).
- Tokens Tailwind presentes mas pouco usados: `--tracking-tight: -.025em`, `--tracking-widest: .1em`, `--leading-relaxed: 1.625` [página, `:root`].

## 3. Espaçamento [página]

Não há escala própria: o Tailwind define `--spacing: .25rem` (4px), mas os CSS por área usam valores soltos. Valores observados:

- Preenchimentos (`padding`): 2, 4, 5, 6, 9, 10, 12, 14, 17, 18, 20, 24, 25, 28, 30, 56, 64px.
- Margens: 3, 4, 5, 6, 7, 8, 10, 12, 14, 18, 22, 23, 24, 30, 36, 44px.
- Intervalos (`gap`): 4, 6, 8, 10, 12, 14, 15, 16, 20, 24, 25, 30, 36, 40, 55px.

Proposta para a R1 (a aprovar): uma escala de tokens que cubra estes valores, e uma lista dos valores do protótipo que se arredondam (ex.: 23 → 24, 17 → 16).

## 4. Raios e sombras

| Token | Valor | Origem |
| --- | --- | --- |
| `--radius-sm`, `--radius-md`, `--radius-lg` | `2px` | [código: `tokens.css`] |
| Raio observado | `2px` (11 botões), `50%` (pontos do gráfico de regiões), `3.35544e+07px` (interruptor "Mostrar só significativas", forma de pílula) | [página] |
| `--radius-xl` | `.75rem` (do Tailwind; não visto em uso) | [página] |
| Sombra dos controlos (botões de zoom, demo) | `0 1px 3px 0 rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)` (equivale a `shadow-sm` do Tailwind) | [página] |
| Sombra do botão do interruptor | `0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)` (`shadow-lg`) | [página] |

## 5. Larguras máximas [página; regras em `src/styles/*.css`]

| Valor | Onde |
| --- | --- |
| `1360px` | `.atlas-width` (contentor de todas as secções e do cabeçalho) |
| `850px` | `h1` da abertura |
| `840px` | `p.map-footnote` |
| `828px` | gráficos de série (Recharts) |
| `800px` | gráfico da demonstração |
| `760px` | `h3` de secção |
| `650px` | subtítulo da abertura |
| `560px` | parágrafos do rodapé |
| `546px` | nota do Panorama |
| `340px` | textos laterais de introdução das secções |
| `260px` | legenda do pontilhado |
| `70ch`, `720px`, `300px`, `280px` | outras regras em `src/styles/*.css` (não vistas a 1280 px) |

## 6. Pontos de quebra [página: `@media` das folhas de estilo; código: `src/styles/responsive.css` e outros]

| Condição | Origem |
| --- | --- |
| `max-width: 640px` | `responsive.css` e outros |
| `max-width: 760px` | `responsive.css`, `method.css`: o menu de secções desaparece (só fica "Explorar o mapa") |
| `max-width: 1100px` | `responsive.css`, `map.css` |
| `min-width: 1500px` | `responsive.css` |
| `width >= 40rem / 48rem / 64rem / 80rem / 96rem` | utilitários do Tailwind (640/768/1024/1280/1536 px) |
| `prefers-reduced-motion: reduce` | `base.css` |
| `hover: hover` | Tailwind |

## 7. Movimento

- `--default-transition-duration: .15s`, `--default-transition-timing-function: cubic-bezier(.4, 0, .2, 1)` [página].
- `--animate-pulse: pulse 2s cubic-bezier(.4, 0, .6, 1) infinite` [página].
- Há regra para `prefers-reduced-motion` [código: `base.css`]; a linha do tempo da secção "Quando" anima com o botão de reprodução.

## 8. O que não foi extraído

- Estilos dos estados hover e foco: só vistos no código (`base.css`: `a, button, select, input, [tabindex]:focus-visible`; `variables.css`: `.variable-chip:focus-visible`, `.panorama-row-button:focus-visible`), não medidos na página.
- Valores a 375 e 768 px (os estilos foram lidos só a 1280 px; as capturas cobrem as três larguras).
- Tema escuro: há `@custom-variant dark` no código, mas a página não o usa.
