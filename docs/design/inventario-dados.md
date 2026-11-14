# R0 (W41): inventário de dados do protótipo

Para cada número visível: de onde vem e que rótulo deve ter no produto. Estado visto a 2026-11-14 em https://terra-tempo.vercel.app, variável por defeito (temperatura). Código: `terra-tempo@f196de2`.

## 1. Pedidos de rede (1280 px, carga inicial)

Lista completa em `tests/visual/extraido/rede.json`. Não há API: tudo são ficheiros estáticos.

| Pedido | Tipo | Bytes | Conteúdo |
| --- | --- | --- | --- |
| `/` | HTML | 5 843 | Página (SSR) |
| `/assets/styles-BeRSrv-j.css` | CSS | 91 446 | Estilos compilados (Tailwind + `src/styles/*`) |
| `/assets/index-VxfTxT0k.js` | JS | 340 588 | Código |
| `/assets/routes-XIHv_FLb.js` | JS | 591 651 | Código da rota |
| `fonts.googleapis.com/css2?…` | CSS | 15 987 | Tipos de letra (CDN externo) |
| 6 × `fonts.gstatic.com/…woff2` | fonte | 14 648 a 58 084 | Newsreader, IBM Plex Sans, IBM Plex Mono |
| `/data/variables.json` | JSON | 2 122 | Índice das 6 variáveis com números-resumo |
| `/data/temperature/meta.json` | JSON | 2 851 | Metadados, método, emergência ano a ano, destaques, textos da variável |
| `/data/temperature/series_global.json` | JSON | 11 338 | Série global mensal |
| `/data/temperature/grid_trend.json` | JSON | 403 904 | 2 592 células a 5°: tendência, p, significância, emergência |
| `/data/temperature/regions.json` | JSON | 46 333 | Regiões: tendência, IC, p, série, emergência |
| `/data/land.json` | JSON | 55 207 | Contorno de terra (topojson) para o mapa |

Ao mudar de variável pedem-se os quatro ficheiros de `/data/<variável>/`. Total da carga inicial: 1 745 754 bytes (cerca de 1,75 MB), soma dos corpos descomprimidos acima; o tamanho transferido (com compressão) não foi medido.

## 2. Origem dos dados

| Ficheiro | Origem | `isDemo` | Rótulo que deve ter |
| --- | --- | --- | --- |
| `data/<v>/*.json` para as 6 variáveis | **Sintético**: "Gerador terratempo.synthetic", v1, gerado entre 2026-10-22 18:29 e 18:32 (campo `generatedAt`). Texto do próprio ficheiro: "Estes dados são inventados para testar o pipeline e o site. NÃO são medições da NASA" | `true` nas 6 | **DEMONSTRAÇÃO** |
| `data/variables.json` | Derivado dos seis `meta.json` pelo pipeline do protótipo (`export_web.py`) | `true` em todas | **DEMONSTRAÇÃO** |
| `data/land.json` | Contorno geográfico; fonte e licença **desconhecidas** (não citadas no código nem na página) | — | Geografia, não precisa de rótulo; **falta a citação** |
| Regiões (nomes e caixas) | Escritas à mão em `pipeline/config/regions/<v>.demo.json` | — | DEMONSTRAÇÃO. O plano (docs/03, secção 5) diz que as caixas são propostas pela Ciência e aprovadas por uma pessoa; estas não passaram por isso |

Nenhum número do protótipo vem de dados reais da NASA.

## 3. Cada número visível, por secção

Legenda da origem: **ficheiro** = lido de um JSON; **calculado** = calculado no browser a partir de um JSON; **constante** = escrito no código; **sintético no browser** = gerado com semente no browser.

### #abertura

| Número no ecrã | Origem | Rótulo |
| --- | --- | --- |
| "2001–2024" | ficheiro: `meta.period.start/end` | DEMONSTRAÇÃO |
| "24 anos" (subtítulo) | calculado de `meta.period` | DEMONSTRAÇÃO |
| "+0,57 °C/déc." (maior subida regional) | calculado: `computeHighlights(regions.json)` em `lib/highlights.ts`; igual a `meta.highlights.regionIncrease.trend = 0.5729` (o teste `src/lib/data/data-consistency.test.ts` compara os dois) | DEMONSTRAÇÃO |
| "Árctico · p < 0,001" | ficheiro: `regions.json` (nome e p da região) | DEMONSTRAÇÃO |
| "—" / "Nenhuma região desce" | calculado: nenhuma região com tendência negativa | DEMONSTRAÇÃO |
| "75%" (área com tendência significativa) | calculado: `significantAreaPercentage(grid, "raw")` sobre `grid_trend.json`, pesado por cos(lat); igual a `meta.highlights.significantAreaPct = 74.7` | DEMONSTRAÇÃO |
| "p < 0,05 · 79% com controlo FDR" | calculado (modo `fdr`); `meta.highlights.significantAreaPctFdr = 78.6`. O "0,05" é constante | DEMONSTRAÇÃO |
| "ATLAS 001" | constante (`Opening.tsx`) | sem origem; decorativo |

### #panorama (uma linha por variável)

| Número | Origem | Rótulo |
| --- | --- | --- |
| Tendência média (ex.: +0,240 °C por década) | ficheiro: `variables.json → globalTrend` | DEMONSTRAÇÃO |
| p (ex.: < 0,001) | ficheiro: `globalP` | DEMONSTRAÇÃO |
| Área significativa FDR (ex.: 79 %) | ficheiro: `significantAreaPctFdr` | DEMONSTRAÇÃO |
| "Metade da área detectável" (ex.: 2020; "ainda não") | ficheiro: `firstEmergenceYear` = primeiro ano em que `pctEmergedFdr ≥ 50` (`pipeline/src/terratempo/export_web.py`, linha 286) | DEMONSTRAÇÃO. **Ver conflito abaixo** |
| Nível do acaso "5 %" | ficheiro: `chanceLevelPct` | constante do método |
| Cobertura ("Globo inteiro", "Só em terra"…) | ficheiro: `coverage` | — |

### #o-que

| Número | Origem | Rótulo |
| --- | --- | --- |
| "288 meses" | ficheiro: `meta.period.months` | DEMONSTRAÇÃO |
| "+0,240 °C por década", IC "+0,232 a +0,247", "Valor-p < 0,001" | ficheiro: `meta.highlights.globalTrend` (`trend`, `ci`, `p`) | DEMONSTRAÇÃO |
| Gráfico (anomalia mensal, média de 12 meses, recta de Theil-Sen) | ficheiro: `series_global.json`; a média de 12 meses e a recta: **desconhecido** se vêm do ficheiro ou são calculadas no browser (não verificado) | DEMONSTRAÇÃO |
| Eixos (−0,40 … 0,40; 2001 … 2021) | calculado pelo Recharts | — |

### #onde

| Número | Origem | Rótulo |
| --- | --- | --- |
| Cor de cada célula | ficheiro: `grid_trend.json → trend`; escala = máximo de |tendência| na grelha (`lib/scale.ts`) | DEMONSTRAÇÃO |
| Pontilhado (significativa) | ficheiro: `sig` ou `sigFdr` conforme o critério escolhido | DEMONSTRAÇÃO |
| Legenda "−1,0 … +1,0 °C por década" | calculado: `trendExtent(grid)` arredondado em `Legend.tsx` | DEMONSTRAÇÃO |
| "5° × 5°", "2001 – 2024" | ficheiro: `meta.grid.stepDeg`, `meta.period` | — |
| Cartões das regiões (+0,57, +0,37, +0,06, +0,14 °C/déc.; p) | ficheiro: `regions.json` | DEMONSTRAÇÃO |
| Latitudes do mapa (60° N…) | constante (grelha da projecção) | — |
| "cerca de 5%" (nota do pontilhado) | constante no texto | constante do método |

### #quando

| Número | Origem | Rótulo |
| --- | --- | --- |
| "JANELAS DE 10 A 24 ANOS" | ficheiro: `meta.emergence.minYears` e `meta.period` | DEMONSTRAÇÃO |
| "75 % da área já tem tendência detectável" | calculado: `summary.emergedPct` de `grid_trend.json` (`lib/emergence.ts`) | DEMONSTRAÇÃO |
| "metade emergiu até 2018" | calculado: `summary.medianYear`, mediana do ano de emergência **entre as células que emergiram** (`lib/emergence.ts`) | DEMONSTRAÇÃO. **Ver conflito abaixo** |
| "21 % se via em 2010" | ficheiro: `meta.emergence.byYear[0].pctSeen` | DEMONSTRAÇÃO |
| "o puro acaso explicaria ~5 %" | ficheiro: `meta.emergence.chanceLevelPct` | constante do método |
| "18 % pode ficar clara em até 20 anos" | calculado: soma dos 3 primeiros baldes de `HORIZON_BUCKETS`; **o "20" do rótulo é constante** no componente | DEMONSTRAÇÃO; o 20 deve vir da constante |
| Ano do selector (2010 … 2024) | ficheiro: `meta.emergence.byYear` | — |
| Gráfico de área ano a ano | ficheiro: `meta.emergence.byYear` (`pctEmerged`, `pctEmergedFdr`, `pctSeen`) | DEMONSTRAÇÃO |

### #regioes

| Número | Origem | Rótulo |
| --- | --- | --- |
| Tendência, IC 95 % e p de cada região | ficheiro: `regions.json` | DEMONSTRAÇÃO |
| "Média" (ex.: −18,37 °C), "Células" (ex.: 272) | ficheiro: `regions.json` | DEMONSTRAÇÃO |
| "Variação" | mostra "—" na temperatura: `trendPctOfMean = null` (não faz sentido em °C) | — |
| Ano de emergência por região (ex.: 2010) | ficheiro: `regions.json` | DEMONSTRAÇÃO |
| Escala comum "−0,68 … +0,68" | calculado: máximo dos limites dos IC | DEMONSTRAÇÃO |

### #significativo

| Número | Origem | Rótulo |
| --- | --- | --- |
| Controlos (+0,60 unid./déc., ruído 0,3, 20 anos) | constante: valores iniciais em `SignificanceDemo.tsx` | É uma **simulação**; já diz "DEMONSTRAÇÃO · RECALCULA NO BROWSER" |
| Série, "Estimada +0,53", IC, p, ano de emergência | sintético no browser (`lib/demo/significance-demo.ts`, semente fixa, `lib/stats/random.ts`) | Simulação, idem |
| "400 células de ruído puro" | constante `FALSE_ALARM_SERIES = 400` | Simulação |

### #metodo e rodapé

| Número | Origem | Rótulo |
| --- | --- | --- |
| "2001–2024", "288 MESES", "ESQUEMA v3", "Gerado a 2026-10-22" | ficheiro: `meta` | — |
| "α = 0.05", "q = 0.1" | ficheiro: `meta.method.alpha`, `fdrAlpha` (escritos com ponto decimal, não vírgula) | — |
| "2592 células" | ficheiro: `meta.grid.cells` | — |
| "limite de 100 anos" | ficheiro: `meta.emergence.maxHorizonYears` (lido em `MethodSection.tsx`, linha 56) | — |
| "5° × 5°" | ficheiro: `meta.grid.stepDeg` | — |

## 4. Conflitos e lacunas encontrados

1. **"Metade" com dois significados.** Panorama: "Metade da área detectável: 2020" (primeiro ano em que 50 % de toda a área emergiu, com FDR). Quando: "metade emergiu até 2018" (mediana entre as células que emergiram, sem FDR). As palavras parecem iguais e os números diferem. Decidir um só conceito ou nomes diferentes.
2. **Rodapé fixo:** "NASA GPM · IMERG é a fonte de referência do atlas" aparece para todas as variáveis, incluindo temperatura, aerossóis e nível do mar, onde o IMERG não é a fonte. Texto fixo em `AtlasFooter.tsx`.
3. **Nomes reais com tendências inventadas:** "Índia", "Sul da Amazónia", "Leste da China", "Barents e Kara", "Weddell" recebem tendências sintéticas. Com o rótulo "dados de exemplo" pequeno, uma captura de ecrã pode passar por resultado real. Ver `divergencias.md`.
4. **Rótulo de demonstração fraco:** "dados de exemplo" em 10 px, mono, numa caixa na abertura. O título grande ("O planeta não aquece ao mesmo ritmo…") afirma algo sobre o planeta real. O princípio 1 de `docs/00` pede rótulo visível **em cada ecrã**.
5. **`land.json` sem citação** de fonte nem licença.
6. **Duas implementações de Mann-Kendall** (Python no pipeline e TypeScript no browser, sem Hamed-Rao no browser). As fixtures garantem que coincidem nas séries de teste.
