# R0 (W41): divergências face ao protótipo

Duas listas: o que **pode** divergir de propósito (para não parecer defeito no teste visual) e o que o protótipo tem **de errado** face às regras do projecto. Nenhuma está aprovada: um humano decide cada linha no Gate R0.

## 1. Divergências permitidas (propostas)

| # | O quê | Porquê | Efeito no teste visual (R7) |
| --- | --- | --- | --- |
| P1 | Selector de idioma no cabeçalho (pt, en; depois es, fr, zh) | SPEC-140, D8. O protótipo só tem pt e não tem selector | Excluir a zona do selector na captura do cabeçalho, ou nova referência do cabeçalho |
| P2 | Rótulo **DEMONSTRAÇÃO** visível em cada secção com números (não só "dados de exemplo" em 10 px na abertura) | Princípio 1 de `docs/00`; regra de `CLAUDE.md` | Novo elemento em cada secção; nova referência ou máscara |
| P3 | Preferências de leitura: tamanho de texto, contraste, paletas para daltonismo, movimento reduzido | W36 (Must) | Só com as preferências por defeito se compara com a referência |
| P4 | Modo leve e PWA | W26 | Fora da comparação |
| P5 | Resultado do Detetive (frase, gráfico, tabela, selo, regra do valor-p, "quanto falta", exportação) para uma região escolhida pelo utilizador | SPEC-101; o protótipo não tem esta vista | Vista nova, sem referência; decidir onde fica (fim de "Quando" ou vista própria, R4) |
| P6 | "Mundo inteiro", país ou estado, desenhar região, escolha de meses | W37, W38, W39, SPEC-102 | Controlos novos em "Onde" e "Quando" |
| P7 | Tipos de letra servidos localmente, não do Google Fonts | Modo leve (W26), sem CDN externo, privacidade | Mesma família e pesos: diferença esperada perto de zero, **a medir na R1** |
| P8 | Texto mínimo de 12 px (proposta) onde o protótipo usa 9 e 10 px | Legibilidade para todas as idades (docs/02, secção 8); 152 elementos estão a 9–10 px | Muda a altura de várias secções: precisa de nova referência ou de aceitar a diferença nessas secções |
| P9 | Menu de secções acessível em ecrã pequeno (≤ 760 px) | No protótipo o menu desaparece e não há alternativa | Cabeçalho a 375 px diferente |
| P10 | Destaque da secção activa ao rolar | Plano R2 (W43) | Cabeçalho muda conforme a posição |
| P11 | Textos corrigidos onde há **[REVER]** aprovado (`textos-pt.md`) | Regras de honestidade | Mudam linhas de texto; diferença local |
| P12 | Escala de cores do mapa fixa por variável (SPEC-130), em vez do máximo dos dados | Comparar períodos à vista; a Fase 0 já o faz | As cores das células mudam se o extremo fixo não for igual ao máximo actual |
| P13 | Números com vírgula decimal em todo o lado (o Método mostra "α = 0.05", "q = 0.1") | Coerência em pt | Pequena |

## 2. O que o protótipo tem de errado face às regras do projecto

### Honestidade e textos (`CLAUDE.md`, `docs/00`, `docs/02`)

| # | Problema | Onde | Regra |
| --- | --- | --- | --- |
| E1 | O título grande afirma algo sobre o planeta real ("O planeta não aquece ao mesmo ritmo em todo o lado.") com dados sintéticos | `#abertura`, `meta.variable.copy.opening` (6 variáveis) | Princípio 1 de `docs/00` |
| E2 | "onde a mudança é real" sem a regra p < 0,05 ao lado | `#abertura` (subtítulo) | W40, `docs/02` |
| E3 | "Mais calor aqui. Menos calor ali." quando nenhuma região desce nos dados mostrados | `#onde` | "Nunca escrever um número que não venha da análise"; aqui é uma afirmação sem suporte |
| E4 | "NASA GPM · IMERG é a fonte de referência do atlas" fixo para todas as variáveis | Rodapé | Citação errada para 5 de 6 variáveis |
| E5 | Nomes de lugares reais (Índia, Sul da Amazónia, Leste da China, Barents e Kara, Weddell…) com tendências inventadas, e o rótulo de demonstração pequeno | `#onde`, `#regioes`, abertura | Princípio 1; risco de captura de ecrã passar por resultado real |
| E6 | "o acaso explica bem esta variação: não há evidência de tendência" | `#regioes` (região não significativa) | `docs/02`: "não quer dizer que não haja tendência; pode faltar tempo" |
| E7 | "Metade" com dois significados (2020 no Panorama, 2018 em Quando) | `#panorama`, `#quando` | Clareza; cada número com definição única |
| E8 | "PODE FICAR CLARA EM ATÉ 20 ANOS": o 20 está escrito à mão | `#quando` | "Todo o número vem de um cálculo ou ficheiro" |
| E9 | "Mais poeira e fumo aqui" (aerossóis) nomeia a natureza das partículas | `#onde` com aerossóis | Sem causas; o AOD não distingue o tipo |
| E10 | A mensagem de erro dos dados fala de `public/data` | Estado de erro global | Público geral |
| E11 | `land.json` sem fonte nem licença citadas | Mapa | D08 (citações) |
| E12 | Regiões com caixas escritas à mão, sem aprovação | `pipeline/config/regions/*.demo.json` | `docs/03`, secção 5 |

### Acessibilidade

| # | Problema | Medição |
| --- | --- | --- |
| A1 | 152 elementos de texto com 9 ou 10 px (rótulos mono, notas, valores técnicos) | Estilos calculados a 1280 px (`tokens.md`, 2.2) |
| A2 | Menu de secções escondido a ≤ 760 px, sem menu alternativo | Página a 375 px: só "Explorar o mapa" visível |
| A3 | Sem indicação da secção activa | Código: o menu não usa `aria-current` |
| A4 | Células do mapa não acessíveis por teclado (só as 4 regiões são botões) | Código (`MapCanvas.tsx`); há descrição em `aria-label` e as regiões em botões abaixo do mapa |
| A5 | Bordas de controlos a 1,33:1 sobre o fundo | Se a borda for a única pista de um controlo (chips, segmentos), falha WCAG 1.4.11 (3:1). Não verificado controlo a controlo |
| A6 | Tipos de letra de CDN externo | Sem eles, a página muda 1,5–6,5 % dos píxeis e várias secções mudam de altura (`limiar-visual.md`) |

**Contraste de texto: cumpre.** Todos os pares de texto dos tokens passam AA (4,5:1); o mais justo é `--muted-foreground` sobre `--secondary`, 4,75:1 (`tokens.md`, 1.3).

Não verificado nesta R0: ordem de tabulação completa, leitor de ecrã real, axe, zoom a 200 %.
