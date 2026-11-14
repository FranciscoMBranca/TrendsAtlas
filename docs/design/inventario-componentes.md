# R0 (W41): inventário de componentes do protótipo

Fontes: código `terra-tempo@f196de2` (`src/components/atlas/`), página publicada (elementos interactivos em `tests/visual/extraido/interactivos.json`), capturas em `tests/visual/referencia/`.

Legenda dos estados: **C** carregar, **V** vazio, **E** erro, **H** hover, **F** foco visível. "código" = visto no código; "página" = visto na página; "—" = não existe; "?" = não verificado.

## Estrutura da página

Uma só rota (`src/routes/index.tsx`). A variável escolhida vive no URL (`/?v=<id>`), não em estado local. A raiz tem `data-palette="<id>"`, que troca as cores. Ordem:

1. `AtlasHeader` (fixo no topo)
2. `Opening` → `#abertura`
3. `Panorama` → `#panorama` (só desenha quando `variables.json` chega)
4. `DataGate` (mostra "A preparar a cartografia…" ou o erro; só depois desenha o resto)
5. `VariableSection` → `#o-que`
6. `TrendMap` → `#onde`
7. `EmergenceSection` → `#quando`
8. `RegionContrast` → `#regioes`
9. `SignificanceDemo` → `#significativo`
10. `MethodSection` → `#metodo`
11. `AtlasFooter` → `#fontes`

## Componentes por secção

### Cabeçalho (`AtlasHeader.tsx`, `VariableSwitcher.tsx`)

| Componente | Interacção | C | V | E | H | F | Notas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marca "Atlas de Tendências" (ícone de grelha + Newsreader) | Âncora `#abertura`, `aria-label="Atlas de Tendências, início"` | — | — | — | ? | código (`a:focus-visible`) | |
| Menu de secções (`nav aria-label="Secções"`) | 7 âncoras | — | — | — | ? | código | **Escondido a ≤ 760 px**, sem menu alternativo (só fica "Explorar o mapa"); página a 375 px |
| "Explorar o mapa ↗" | Âncora `#onde` | — | — | — | ? | código | |
| Barra de variáveis (`nav aria-label="Variável"`), 6 chips com amostra das duas cores | Muda `?v=` | ? (chips só aparecem com `variables.json`) | — | ? | ? | código (`.variable-chip:focus-visible`) | O chip activo tem borda e fundo diferentes e `aria-pressed` (código: `VariableSwitcher.tsx`, linha 22) |
| Secção activa ao rolar | — | | | | | | **Não existe** (o menu de secções não usa `aria-current` nem observador de intersecção) |

### #abertura (`Opening.tsx`)

| Componente | Interacção | C | V | E | H | F |
| --- | --- | --- | --- | --- | --- | --- |
| Linha superior (eyebrow): "DADOS SINTÉTICOS DE DEMONSTRAÇÃO · período · ANOMALIAS MENSAIS" | — | ? | — | — | — | — |
| `DataBadge`: "dados de exemplo" (ou o nome da fonte se `isDemo` for falso) | — | não aparece sem `meta` | — | — | — | — |
| Título `h1` com parte em itálico colorido (de `meta.variable.copy.opening`, marcação `*…*`) | — | ? | — | — | — | — |
| Subtítulo | — | ? | — | — | — | — |
| Nota lateral "UMA QUESTÃO DE GEOGRAFIA" | — | — | — | — | — | — |
| 3 métricas (número grande, unidade, rótulo, nota com p) | — | "carregar dados" (página, antes dos dados) | "—" + "Nenhuma região desce" (página) | ? | — | — |
| "Ler a geografia da mudança ↓" | Âncora | — | — | — | ? | código |
| "SISTEMA TERRA / ATLAS 001" | — | — | — | — | — | — |

### #panorama (`Panorama.tsx`)

| Componente | Interacção | C | V | E | H | F |
| --- | --- | --- | --- | --- | --- | --- |
| Cabeçalho de secção (número "00", nome, título com itálico, texto lateral) — `SectionHeader.tsx` | — | — | — | — | — | — |
| Tabela das 6 variáveis: nome + cobertura, tendência + p, barra de área significativa com linha do acaso, ano de "metade detectável" | Cada linha é um botão que muda a variável; a linha activa tem `aria-current` | a secção não aparece até `variables.json` chegar | "ainda não" no ano | ? | ? | código (`.panorama-row-button:focus-visible`) |
| Nota de rodapé da tabela + aviso "Dados de demonstração sintéticos" | — | — | — | — | — | — |

A 375 px a tabela passa a cartões (captura `panorama-375.png`).

### Estado global (`DataGate.tsx`)

| Estado | Texto | Papel ARIA |
| --- | --- | --- |
| A carregar | "A preparar a cartografia…" | `role="status"` |
| Erro | "Não foi possível ler os dados." + "Verifique os ficheiros em public/data e volte a carregar a página." + detalhe técnico | `role="alert"` |

O erro fala com quem desenvolve ("public/data"), não com o público. Não há estado vazio.

### #o-que (`VariableSection.tsx`, `AnomalyChart.tsx`)

| Componente | Interacção | Estados |
| --- | --- | --- |
| Nome da variável, descrição, fonte, nº de meses | — | — |
| Bloco "Média global, ponderada pela área": tendência, IC, p | — | — |
| Gráfico Recharts: anomalia mensal, média de 12 meses, recta de Theil-Sen; legenda própria (`aria-label="Legenda do gráfico"`) | Tooltip do Recharts ao passar o rato (?) | H: ? |
| Descrição acessível do gráfico | — | Texto: "Série mensal da anomalia global de…" |

### #onde (`TrendMap.tsx`, `map/*`, `Legend.tsx`)

| Componente | Interacção | Estados |
| --- | --- | --- |
| Cabeçalho "Um planeta. Dois sinais." + frase da variável | — | — |
| Controlos: variável (texto), período (texto), critério `p < 0,05` / `Com FDR` (`SegmentedControl`, `role="radio"`), interruptor "Mostrar só significativas" (`role="switch"`) | Clique e teclado | F: código; H: ? |
| Mapa (`MapCanvas`, SVG Equal Earth): 2 592 células, contorno de terra, pontilhado de significância, caixas tracejadas das regiões | Ponteiro: tooltip da célula (`MapTooltip`, `aria-live`); zoom e repor (3 botões, `aria-label`); regiões como `path role="button"` com `onKeyDown` ("Explorar Árctico"…) | C: "A preparar a cartografia…"; H: tooltip; F nas regiões: ? |
| Descrição acessível do mapa | — | `aria-label` com o resumo das cores e a indicação de que as regiões estão em botões abaixo |
| Legenda: gradiente, extremos, unidade, chave do pontilhado com o critério | — | Muda com o critério |
| Faixa de regiões (`RegionStrip`): cartões com nome, tendência, p, seta ↗ | Botão com `aria-pressed` (`RegionStrip.tsx`); o efeito do clique não foi verificado | H: ? |
| Nota de rodapé do mapa | — | — |

### #quando (`emergence/*`)

| Componente | Interacção | Estados |
| --- | --- | --- |
| Cabeçalho + texto lateral | — | — |
| 3 métricas (área emergida, área vista no 1.º ano, "pode ficar clara em até 20 anos") | — | — |
| Vista "Quando emergiu" / "Quanto falta" (`role="radio"`) | Clique e teclado | — |
| Reproduzir a linha do tempo (botão ▶, `aria-label` muda para "Pausar") + controlo deslizante do ano (`#emergence-year`) | Animação ano a ano | — |
| Mapa de emergência (o mesmo `MapCanvas` com outra pintura) + tooltip (`EmergenceTooltip`, `aria-live`) | Ponteiro | — |
| Legenda (cedo/tarde, "Ainda não detectável") | — | — |
| Gráfico Recharts "Área com tendência detectável, ano a ano" (4 séries) | — | — |
| Nota sobre o ano de emergência ser descritivo | — | — |

### #regioes (`RegionContrast.tsx`)

| Componente | Interacção | Estados |
| --- | --- | --- |
| Cabeçalho "O mesmo período, histórias diferentes." | — | — |
| Gráfico de floresta: uma linha por região com ponto e intervalo, escala comum | — | — |
| Cartão por região: nome, veredicto ("Aumento"/"Redução"/"Sem sinal claro"), frase (`lib/narrative.ts`), frase de emergência, mini-gráfico Recharts, factos (Média, Variação, Valor-p, Células) | — | Sem sinal: frase alternativa |

### #significativo (`SignificanceDemo.tsx`)

| Componente | Interacção | Estados |
| --- | --- | --- |
| Exemplos: "Sinal claro", "Ruído a esconder o sinal", "Sem tendência" | Botões | ? (activo) |
| 3 controlos deslizantes: tendência, ruído, anos (`#demo-trend`, `#demo-noise`, `#demo-years`) | Recalcula no browser | — |
| "Nova amostra de ruído" | Botão | — |
| Gráfico Recharts da série com recta | — | — |
| Veredicto (`role="status"`), imposta/estimada/IC/p, frase sobre o intervalo, emergência | — | Significativa / não |
| "E num mapa inteiro?": simulação de 400 células de ruído | Botão "Simular" | ? |

### #metodo (`MethodSection.tsx`)

| Componente | Interacção | Estados |
| --- | --- | --- |
| Lista de definição: Anomalias, Tendência, Teste, Autocorrelação, Testes múltiplos, Emergência, Quanto falta, Áreas | — | — |
| Fonte (da `meta.source`) + nota | — | Real/demonstração muda o texto |
| Limites (6 pontos) | — | — |
| Descarregar: "Grelha (CSV)", "Regiões (CSV)" (`lib/export.ts`) | Botões | — |
| Ligações aos 4 JSON (↗) | Ligações | — |

### Rodapé (`AtlasFooter.tsx`, `#fontes`)

Ligação "NASA GPM · IMERG" (externa, `target="_blank"`), texto sobre dados sintéticos, método, "EDIÇÃO DEMONSTRATIVA · ESQUEMA v3", período e data de geração. Sem `meta`: só "Atlas de Tendências."

## Interacções transversais

- **Âncoras:** 8 secções com `id` (`#abertura` … `#metodo`) e `#fontes`. Todas presentes nas três larguras (relatório `tests/visual/referencia/_relatorio.json`, `missing: []`).
- **Variável no URL:** `?v=<id>` com `replace: true` e sem voltar ao topo; um id desconhecido cai na variável por defeito (`lib/variables.ts`, `pickVariable`).
- **Movimento:** regra `prefers-reduced-motion` em `base.css`; a linha do tempo anima.
- **Teclado:** foco visível em ligações, botões, selects, inputs e `[tabindex]`; as regiões do mapa respondem a teclas. Não verificado: ordem de tabulação, armadilhas de foco, células do mapa por teclado (não parecem focáveis: só as 4 regiões).
- **Leitor de ecrã:** mapas e gráficos têm `aria-label` com descrição; tooltips com `aria-live`. Não testado com um leitor real.

## Não verificado nesta R0

Estados hover (não capturados), erro de rede de cada ficheiro (não simulado), comportamento das ligações ↗ dos cartões de região, ordem de tabulação completa.
