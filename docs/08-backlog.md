# 08. Backlog

Prioridade: **M** (Must, tem de existir), **S** (Should, deve existir), **C** (Could, só se sobrar tempo). Dono: agente responsável. `Dep.` indica dependências principais. Spec: `X` quando existe um exemplo em `../specs/`.

## Descoberta e dados (P)

| ID | Item | Prio | Dono | Dep. | Spec |
| --- | --- | --- | --- | --- | --- |
| P00 | Descoberta de produtos: fichas de produto, ficheiro real por produto | M | Pipeline | | |
| P02 | Leitor MERRA-2 (temperatura; humidade se confirmada) | M | Pipeline | P00 | |
| P03 | Leitor IMERG (precipitação) | M | Pipeline | P00 | |
| P05 | Anomalias mensais e ponderação por cos(latitude) | M | Pipeline | P02 | |
| P06 | Agregação a 5° (mapa) e a 1° ou 2° (cubos) | M | Pipeline | P05 | |
| P07 | Testes de tendência: Theil-Sen, Mann-Kendall, factor de Hamed-Rao | M | Pipeline | P05 | |
| P08 | Correcção FDR (Benjamini-Hochberg) | M | Pipeline | P07 | |
| P09 | Tempo de Emergência | S | Pipeline | P07 | |
| P10 | "Quanto falta" (projecção condicional de anos) | M | Pipeline | P09 | |
| P11 | Exportação versionada com `schemaVersion` e manifesto | M | Pipeline | P06 | |
| P12 | Índice ENSO real e ajuste (ridge, desfasamentos 0 a 6) | S | Pipeline | P05 | |
| P13 | ΔE e teste nulo (taxa de falsos positivos) | S | Ciência | P12 | |
| P14 | Teste retrospectivo ("a previsão acertou?") | S | Ciência | P09 | X (014) |
| P15 | Fragilidade (início, método, ENSO) | S | Ciência | P07, P12 | |
| P16 | Pontos quentes compostos | C | Ciência | P09 | |
| P17 | Concordância entre dois produtos de temperatura | C | Ciência | P02 | |
| P18 | Leitor de aerossóis (AOD): MERRA-2 primeiro; MODIS Aqua se o HDF4 couber (D13) | S | Pipeline | P00 | |
| P19 | Leitor NDVI | C | Pipeline | P00 | |
| P20 | Leitor de gelo marinho (projecção polar) | C | Pipeline | P00 | |
| P21 | Leitor de nível do mar (média mensal de grelhas de 5 dias) | C | Pipeline | P00 | |
| P22 | Gerador de dados sintéticos rotulados | M | Pipeline | | |
| P24 | Leitor GLDAS (humidade do solo, evapotranspiração) | C | Pipeline | P00 | |
| P25 | Leitor de ozono (OMI) | C | Pipeline | P00 | |
| P26 | Caudal de rios (fora do MVP) | C | Pipeline | P00 | |
| P28 | Verificação cruzada com o Giovanni (uma região, uma variável); primeiro caso: AOD, Wisconsin, verão, se P18 existir | S | Ciência | P07 | |
| P29 | Regressão linear, R², teste t e intervalo (fórmulas 13 e 14) | M | Pipeline | P05 | |
| P30 | Perfis das regiões-exemplo | M | Ciência | P06 | |
| P31 | "O que está a mudar aqui?" (varrimento das variáveis reais) | S | Pipeline | P07, P29 | |
| P33 | Comparação de duas regiões (mesma variável e período) | S | Pipeline | P29 |
| P34 | Mapas a 5° pré-calculados por variável, período predefinido e ENSO (ligado e desligado; o ENSO depende de P12) | M | Pipeline | P08, P11 | X (130) |
| P35 | Recálculo vectorizado das 2 592 células para um período livre, em blocos, com FDR por pedido | S | Pipeline | P07, P08 | X (130) |
| P32 | Projecção condicional com banda crescente | S | Pipeline | P29 | X (120) |
| P36 | Tendência de uma estação do ano: meses escolhidos, um valor por ano (fórmula 17) | M | Pipeline | P05, P07, P29 | X (102) |
| P37 | Limites de países e estados ou províncias, simplificados (fonte e licença a confirmar) | S | Pipeline | P00 | |
| P38 | Variáveis extra citadas no vídeo (nuvens, radiação, vento, pressão, vapor de água, neve, temperatura do mar), cada uma só depois de ficha P00 | C | Pipeline | P00 | |

## Backend (B)

| ID | Item | Prio | Dono | Dep. |
| --- | --- | --- | --- | --- |
| B01 | Esqueleto da API, rota de saúde, CORS, limites | M | Backend | |
| B02 | OpenAPI e cliente TypeScript gerado | M | Backend | B01 |
| B03 | `GET /variaveis` (manifesto) | M | Backend | P11 |
| B04 | Rotas de mapa e série | M | Backend | P11 |
| B05 | Validação de entradas e erros claros | M | Backend | B01 |
| B06 | Variáveis de ambiente e configuração do hospedeiro | M | Backend, DevOps | B01 |
| B07 | Modo degradado coordenado com o site | M | Backend, Front-end | B04 |
| B08 | `POST /regiao/analise` (polígono ou globo, variável, período, meses opcionais) | M | Backend | P06, P07, P29, P36 |
| B09 | `GET /validacao` | S | Backend | P14 |
| B10 | Cache e limites de pedidos | S | Backend | B08 |
| B11 | `POST /assistente/pergunta` com ferramentas | C | Assistente | B08 |
| B12 | Explicação em linguagem simples a partir dos números (devolve chave e parâmetros, nunca frases) | S | Backend | B08 |
| B13 | Verificador de números do texto | C | Assistente | B12 |
| B14 | `POST /regiao/o-que-muda` | S | Backend | P31 |
| B15 | Rota de projecção | S | Backend | P32 |
| B17 | `POST /regiao/comparar` | S | Backend | P33 |
| B16 | Mapeador pergunta para variável (determinístico) | S | Backend | B03 |
| B18 | Rota `mapa/calculo` (período livre): cache, fila, tempo máximo, recurso aos predefinidos | S | Backend | P35, B10 |
| B19 | Teste de carga no hospedeiro real (memória, tempo, fila) e fixação dos limiares | S | Backend, DevOps | B18 |

## Site (W)

| ID | Item | Prio | Dono | Dep. |
| --- | --- | --- | --- | --- |
| W01 | Estrutura, tema, rótulo DEMONSTRAÇÃO/real | M | Front-end | B02 |
| W02 | Mapa base e selecção de célula | M | Front-end | W01 |
| W03 | Mapa global de tendências | M | Front-end | B04 |
| W30 | Filtros do mapa, nível 1: variável, período predefinido, ENSO, só significativas; escala fixa | M | Front-end | W03, P34 |
| W31 | Período livre no mapa (mínimo 10 anos), com aviso de comparações múltiplas e recurso aos predefinidos | S | Front-end | W30, B18 |
| W04 | Desenhar rectângulo e polígono | M | Front-end | W02 |
| W05 | Tempo de Emergência no mapa | S | Front-end | P09 |
| W06 | Gráfico da série com tendência e banda | M | Front-end | B08 |
| W07 | Tabela de estatísticas | M | Front-end | B08 |
| W08 | Selo de significância e "quanto falta" | M | Front-end | B08 |
| W09 | "A previsão acertou?" | S | Front-end | B09 |
| W10 | Fragilidade (células esbatidas) | C | Front-end | P15 |
| W11 | Pontos quentes | C | Front-end | P16 |
| W12 | Concordância entre produtos | C | Front-end | P17 |
| W14 | Chat do assistente | C | Front-end | B11 |
| W15 | Lente de Angola | C | Front-end | P30 |
| W16 | Infraestrutura de idiomas: catálogo de chaves, troca sem recarregar, formatação de números e datas, tipo de letra para chinês | M | Front-end | W01 |
| W32 | Catálogo de textos pt e en | M | Front-end | W16 |
| W33 | Catálogo de textos es | S | Front-end | W16 |
| W34 | Catálogo de textos fr | S | Front-end | W16 |
| W35 | Catálogo de textos mandarim (chinês simplificado) | S | Front-end | W16 |
| W36 | Preferências de leitura: tamanho de texto, contraste, paletas para daltonismo, movimento reduzido | M | Front-end | W01 |
| W17 | Acessibilidade e descrição textual do mapa | M | Front-end | W03 |
| W20 | Percurso do Detetive em 3 perguntas | M | Front-end | W02, B08 |
| W21 | Modos Criança, Explorador, Cientista | S | Front-end | W20 |
| W29 | Modo Professor: percurso guiado e ficha de actividade exportável | C | Front-end | W21, W24 |
| W22 | Modo apresentação (time-lapse) | S | Front-end | W03 |
| W23 | Cartão ao tocar numa área | M | Front-end | W02 |
| W24 | Exemplos guiados | S | Front-end | W22 |
| W25 | Interface da projecção | S | Front-end | B15 |
| W26 | Modo leve e PWA | S | Front-end | W03 |
| W27 | Glossário e definições simples | M | Front-end | W01 |
| W28 | Exportar CSV e imagem | S | Front-end | W06 |
| W37 | Selector de meses ou estação na pergunta 3 | M | Front-end | W20, P36 |
| W38 | "Mundo inteiro" na pergunta 2 | M | Front-end | W20, B08 |
| W39 | Escolher país ou estado por nome na pergunta 2 | S | Front-end | W20, P37 |
| W40 | Regra do valor-p junto ao selo e explicação da diferença para o mapa (q = 0,10) | M | Front-end | W08 |

## Automação (D)

| ID | Item | Prio | Dono |
| --- | --- | --- | --- |
| D01 | `CLAUDE.md` e agentes em `.claude/agents/` | M | DevOps |
| D02 | CI: testes, linter, tipos | M | DevOps |
| D03 | Protecção do ramo principal | M | DevOps |
| D04 | Análise de segredos | M | DevOps |
| D05 | Pré-visualização Vercel por PR | S | DevOps |
| D06 | Acção de actualização de dados (abre PR; só depois de a Fase 1 correr à mão) | C | DevOps |
| D07 | Reprodutibilidade (versões fixas, sementes, instruções) | M | DevOps |
| D08 | Código aberto, licença e citações dos dados | M | Documentação |

## Narrativa (N)

| ID | Item | Prio | Dono |
| --- | --- | --- | --- |
| N01 | Guião do pitch e demonstração gravada | M | Documentação |
| N02 | Revisão dos textos do modo Criança por quem ensina | S | Humano |
| N03 | Revisão humana pt e en (interface, glossário, modo Criança) | M | Humano |
| N04 | Revisão humana es | S | Humano |
| N05 | Revisão humana fr | S | Humano |
| N06 | Revisão humana mandarim | S | Humano |
| N07 | Glossário dos termos estatísticos (fonte única) traduzido nos cinco idiomas | M | Humano |
| N08 | Testes de uso com pessoas de idades, níveis de ensino e lugares diferentes | S | Humano |

## Mapa de requisitos do desafio

A tabela R1 a R12 e a correspondência com estes IDs estão em `01-alinhamento-com-o-desafio.md`.
