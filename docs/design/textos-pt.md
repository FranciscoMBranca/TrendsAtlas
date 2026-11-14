# R0 (W41): textos do protótipo (fonte para o catálogo pt de W44)

Todos os textos que o protótipo mostra, por secção. Servem para preencher o catálogo pt (W44) e, depois, os outros idiomas (SPEC-140).

**Marcas:** **[REVER]** = a frase não cumpre `CLAUDE.md` ou `docs/02` como está: linguagem de causa, número sem origem, "a mudança é real" sem significância calculada ao lado, comparação com a média global sem cálculo, ou afirmação sobre o planeta real feita com dados sintéticos. A marca diz **porquê**. Não é uma decisão: um humano decide se a frase muda, sai ou fica.

**Fontes:**
- Secção 1: textos que dependem da variável, lidos de `public/data/<v>/meta.json` (`variable.copy`) no commit `terra-tempo@f196de2`.
- Secção 2: modelos de frases no código (`src/lib/narrative.ts`, `src/lib/scale.ts`, `src/components/atlas/DataGate.tsx`, `src/lib/emergence.ts`).
- Secção 3: tudo o que a página mostra com a variável por defeito (temperatura), a 1280 px, extraído com `tests/visual/capture.mjs --extract` e formatado com `tests/visual/textos.py`. Ficam de fora as cadeias sem letras (números, sinais, marcas dos eixos): são dados e estão em `inventario-dados.md`. Os atributos `aria-label`, `title` e `alt` também são textos e aparecem com `@` na etiqueta.

Nota sobre a ortografia: o protótipo usa a grafia anterior ao Acordo Ortográfico de 1990 (Árctico, direcção, detectável, projecção, actual, correcção). O plano v7 usa a mesma. Decidir uma só grafia para o catálogo pt.

## 1. Textos por variável (`meta.variable.copy`)

| Variável | `opening` (título da abertura; `*…*` = itálico) | `headline` (secção Onde) | `up` / `down` (legenda) | `subject` (nas frases) | Marca |
| --- | --- | --- | --- | --- | --- |
| temperature | O planeta não aquece \*ao mesmo ritmo\* em todo o lado. | Mais calor aqui. Menos calor ali. | Aquece / Arrefece | a temperatura | **[REVER]** título e headline afirmam algo sobre o planeta real com dados sintéticos; nos dados mostrados nenhuma região desce, por isso "Menos calor ali" não tem suporte |
| precipitation | A mesma chuva não cai \*da mesma forma\* em todo o lado. | Mais chuva aqui. Menos chuva ali. | Mais chuva / Menos chuva | a precipitação | **[REVER]** mesma razão (afirmação sobre o real com dados sintéticos) |
| vegetation | A Terra não esverdece \*nem escurece\* por igual. | Mais verde aqui. Menos verde ali. | Mais verde / Menos verde | a vegetação | **[REVER]** idem |
| sea_ice | Os dois pólos não perdem gelo \*do mesmo modo\*. | O gelo recua aqui. Aguenta ali. | Mais gelo / Menos gelo | o gelo marinho | **[REVER]** idem; "aguenta" sugere um juízo |
| aerosols | O ar não se carrega \*de partículas\* por igual. | Mais poeira e fumo aqui. Menos ali. | Ar mais carregado / Ar mais limpo | a carga de aerossóis | **[REVER]** "poeira e fumo" nomeia origens das partículas (perto de uma causa); o AOD não distingue o tipo |
| sea_level | O mar não sobe \*por igual\* em todas as costas. | O mar sobe aqui mais depressa do que ali. | Sobe / Desce | o nível do mar | **[REVER]** afirmação sobre o real com dados sintéticos |

As descrições longas (`variable.description`) estão em cada `meta.json`; a da temperatura aparece na secção 3 (#o-que).

## 2. Modelos de frases no código

| Origem | Modelo | Marca |
| --- | --- | --- |
| `narrative.ts`, `describeRegion` (significativa) | `{Subject} {sobe\|desce} {|tendência|} {unidade por década} (IC 95%: {baixo} a {alto}){, cerca de N% da média da região}. Com p {p}, o acaso explica mal esta mudança.` | **[REVER]** "o acaso explica mal" é uma leitura solta do valor-p; falta a regra fixa de W40 ("Valor-p abaixo de 0,05: …") |
| `narrative.ts`, `describeRegion` (não significativa) | `A estimativa é de {tendência} {unidade} (IC 95%: …), mas com p {p} o acaso explica bem esta variação: não há evidência de tendência.` | **[REVER]** "o acaso explica bem" afirma mais do que o teste diz; `docs/02` pede "não quer dizer que não haja tendência; pode faltar tempo" |
| `narrative.ts`, `describeEmergence` | `A tendência tornou-se detectável em {ano} (com dados desde {ano0}) e assim se manteve.` | — |
| `narrative.ts`, `describeEmergence` | `Ainda não é detectável. Se a tendência actual e o ruído se mantiverem, seriam precisos cerca de {N} {ano\|anos} de dados adicionais.` | — (condicional, cumpre) |
| `narrative.ts`, `describeEmergence` | `Ainda não é detectável e os dados não permitem estimar quando poderá ser.` | — |
| `narrative.ts`, `VERDICT_LABEL` | `Aumento` / `Redução` / `Sem sinal claro` | — |
| `scale.ts`, `SIGNIFICANCE_MODES` | `p < 0,05` / `Com FDR`; legendas `p < 0,05, sem correcção para testes múltiplos` / `controlo de falsas descobertas (Benjamini-Hochberg)` | — |
| `DataGate.tsx` | `A preparar a cartografia…` / `Não foi possível ler os dados.` / `Verifique os ficheiros em public/data e volte a carregar a página.` | **[REVER]** a mensagem de erro fala com quem desenvolve, não com o público |
| `Opening.tsx` (antes dos dados) | `carregar dados` | — |
| `emergence.ts`, `HORIZON_BUCKETS` | rótulos dos baldes de "Quanto falta" (ex.: `11 a 20 anos`) | — |
| `AtlasFooter.tsx` | `NASA GPM · IMERG é a fonte de referência do atlas.` / `Esta edição usa dados sintéticos; não permite inferências sobre o clima real.` / `Dados: {fonte}, {produto}.` / `EDIÇÃO DEMONSTRATIVA` / `DADOS OBSERVADOS` | **[REVER]** a primeira frase é fixa e errada para 5 das 6 variáveis |

## 3. Textos capturados na página (temperatura, 1280 px)

### Título da página

- `title` Atlas de Tendências — A geografia da mudança

### Meta description

- `meta` Onde o planeta está a mudar, quanto, e se a mudança é distinguível do acaso: temperatura, chuva, vegetação, gelo, aerossóis e nível do mar. Mapas interactivos, regiões em contraste e método explicado.

### Cabeçalho

- `span` Atlas de Tendências
- `a` Panorama
- `a` O quê
- `a` Onde
- `a` Quando
- `a` Regiões
- `a` Significância
- `a` Método
- `a` Explorar o mapa
- `button` Temperatura do ar
- `button` Precipitação
- `button` Vegetação (NDVI)
- `button` Gelo marinho
- `button` Aerossóis (AOD)
- `button` Nível do mar
- `a@aria-label` Atlas de Tendências, início
- `nav@aria-label` Secções
- `nav@aria-label` Variável

### #abertura

- `p` DADOS SINTÉTICOS DE DEMONSTRAÇÃO · 2001–2024 · ANOMALIAS MENSAIS
- `span` dados de exemplo
- `h1` O planeta não aquece **[REVER]** afirmação sobre o planeta real feita com dados sintéticos (princípio 1 de docs/00); o título vem de meta.variable.copy.opening
- `em` ao mesmo ritmo **[REVER]** parte do título acima
- `h1` em todo o lado. **[REVER]** parte do título acima
- `p` Uma leitura de 24 anos de temperatura do ar, aqui com dados sintéticos, e de onde a mudança é real. **[REVER]** "onde a mudança é real" só com significância calculada e a regra p < 0,05 dita ao lado (W40); 24 vem de meta.period
- `span` UMA QUESTÃO DE GEOGRAFIA
- `aside` Uma tendência global pode esconder realidades locais opostas. O lugar importa tanto como o número.
- `small` °C
- `small` /déc.
- `span` MAIOR SUBIDA REGIONAL
- `span` Árctico · p < 0,001
- `span` MAIOR DESCIDA REGIONAL
- `span` Nenhuma região desce
- `span` ÁREA COM TENDÊNCIA SIGNIFICATIVA
- `span` p < 0,05 · 79% com controlo FDR
- `a` Ler a geografia da mudança
- `span` SISTEMA TERRA / ATLAS 001 **[REVER]** rótulo decorativo sem origem; confirmar se fica

### #panorama

- `h2` Panorama das variáveis
- `h3` O mesmo teste,
- `em` seis assuntos.
- `p` Para cada variável: a tendência média, a parte do mapa em que ela se distingue do acaso e desde quando. Clique numa linha para abrir o atlas dessa variável.
- `th` VARIÁVEL
- `th` TENDÊNCIA MÉDIA
- `th` ÁREA SIGNIFICATIVA (FDR)
- `th` METADE DA ÁREA DETECTÁVEL
- `button` Temperatura do ar
- `span` Globo inteiro
- `small` °C por década
- `span` p
- `button` Precipitação
- `small` mm/dia por década
- `td` ainda não
- `button` Vegetação (NDVI)
- `span` Só em terra
- `small` NDVI por década
- `button` Gelo marinho
- `span` Oceanos polares
- `small` % por década
- `button` Aerossóis (AOD)
- `small` AOD por década
- `button` Nível do mar
- `span` Só no oceano
- `small` mm por década
- `p` A linha vertical marca o que o acaso daria sozinho (
- `p` %). A área é ponderada por cos(latitude) e só conta onde a variável tem dados, por isso percentagens de variáveis com cobertura diferente (gelo marinho, nível do mar) não se referem à mesma parte do planeta.
- `p` Dados de demonstração sintéticos: os números ilustram o método, não o planeta.
- `div@aria-label` 79% da área, contra 5% esperado só por acaso
- `i@title` Nível esperado só por acaso
- `div@aria-label` 9% da área, contra 5% esperado só por acaso
- `div@aria-label` 12% da área, contra 5% esperado só por acaso
- `div@aria-label` 20% da área, contra 5% esperado só por acaso
- `div@aria-label` 3% da área, contra 5% esperado só por acaso
- `div@aria-label` 98% da área, contra 5% esperado só por acaso

### #o-que

- `h2` O quê está a mudar
- `strong` Temperatura do ar
- `p` Temperatura do ar a 2 metros do chão. As anomalias mensais mostram quanto cada mês se afastou do normal para esse mês do ano, o que tira a estação da conta.
- `p` O ciclo das estações sai da conta e sobra a mudança.
- `span` Dados sintéticos de demonstração
- `span` °C
- `span` meses
- `span` MÉDIA GLOBAL
- `span` , PONDERADA PELA ÁREA
- `small` °C por década
- `p` Intervalo de confiança de 95%:
- `p` a
- `p` . Valor-p
- `p` . Uma média global pequena pode esconder regiões com sinais opostos, como mostra o mapa a seguir. **[REVER]** comparação com a média global: só se o mapa mostrar de facto sinais opostos calculados nos mesmos dados (docs/02)
- `li` Anomalia mensal
- `li` Média de 12 meses
- `li` Tendência (Theil-Sen)
- `ul@aria-label` Legenda do gráfico
- `div@aria-label` Série mensal da anomalia global de temperatura do ar (média global), com média de 12 meses e recta de tendência

### #onde

- `h2` Onde está a mudar
- `span` GRELHA GLOBAL
- `span` 5° × 5°
- `h3` Um planeta. **[REVER]** título editorial ligado à afirmação "dois sinais"
- `em` Dois sinais. **[REVER]** com temperatura sintética quase todo o mapa sobe; confirmar por variável
- `p` Mais calor aqui. Menos calor ali. **[REVER]** com estes dados nenhuma região arrefece de forma significativa (abertura: "Nenhuma região desce"); texto fixo em meta.variable.copy.headline
- `p` A mudança não tem a mesma direcção em todo o lado. **[REVER]** afirmação não verificada nos dados mostrados (ver linha acima)
- `span` VARIÁVEL
- `span` Temperatura do ar
- `span` PERÍODO
- `span` CRITÉRIO
- `button` p < 0,05
- `button` Com FDR
- `span` Mostrar só significativas
- `span` Tendência por década
- `text` 60° N
- `text` 30° N
- `text` 30° S
- `text` 60° S
- `span` Arrefece
- `span` Aquece
- `p` °C por década
- `span` Tendência significativa
- `span` p < 0,05, sem correcção para testes múltiplos
- `span` Árctico
- `span` °C
- `span` /déc.
- `span` p
- `span` Ásia central
- `span` Pacífico Sul
- `span` Atlântico Norte subpolar
- `p` Dados de exemplo, não resultados observados.
- `p` Projecção Equal Earth: as áreas no mapa são proporcionais às áreas reais.
- `p` O pontilhado indica p < 0,05, sem correcção para testes múltiplos: em milhares de células, cerca de 5% aparecem assim só por acaso.
- `div@aria-label` Critério de significância
- `svg@aria-label` Mapa de tendências: Temperatura do ar. Cor da descida: arrefece; cor da subida: aquece; pontos: tendência significativa. As regiões estão também listadas em botões abaixo do mapa.
- `path@aria-label` Explorar Árctico
- `path@aria-label` Explorar Ásia central
- `path@aria-label` Explorar Pacífico Sul
- `path@aria-label` Explorar Atlântico Norte subpolar
- `button@aria-label` Ampliar mapa
- `button@aria-label` Reduzir mapa
- `button@aria-label` Repor mapa

### #quando

- `h2` Quando saberemos
- `span` TEMPO DE EMERGÊNCIA · JANELAS DE
- `span` A
- `span` ANOS
- `h3` Quando é que a mudança
- `em` deixa de ser ruído?
- `p` Uma tendência não aparece de repente. Repetimos o teste ano após ano, com dados cada vez mais longos, e registámos quando cada célula passou a ser detectável e assim ficou. Onde ainda não é, estimamos quantos anos de dados faltam.
- `span` DA ÁREA JÁ TEM TENDÊNCIA DETECTÁVEL
- `span` metade emergiu até 2018
- `span` SE VIA EM
- `span` o puro acaso explicaria ~
- `span` PODE FICAR CLARA EM ATÉ 20 ANOS **[REVER]** o 20 está escrito à mão no componente (EmergenceSection.tsx), embora o cálculo use HORIZON_BUCKETS
- `span` se as tendências actuais persistirem
- `span` VISTA
- `button` Quando emergiu
- `button` Quanto falta
- `label` ANO
- `text` 60° N
- `text` 30° N
- `text` 30° S
- `text` 60° S
- `span` ← Emergiu cedo
- `span` Emergiu tarde →
- `p` ano em que passou a ser detectável
- `span` Ainda não detectável
- `span` ÁREA COM TENDÊNCIA DETECTÁVEL, ANO A ANO
- `li` Já emergida (p < 0,05)
- `li` Já emergida (com FDR)
- `li` O que se via nesse ano
- `li` Nível do acaso
- `p` O sinal só conta quando fica acima do nível do acaso. Em
- `p` % da área já parecia significativa; em
- `tspan` nível do acaso
- `p` O ano de emergência é descritivo: olhar para os dados ano após ano é espreitar várias vezes, o que infla falsos positivos. Por isso exigimos que a tendência se mantenha detectável até ao fim, e uma célula só emerge se o teste do período completo for significativo. «Quanto falta» é uma projecção condicional (se o declive e o ruído actuais persistirem): uma ordem de grandeza, nunca uma previsão do clima.
- `div@aria-label` Vista do mapa de emergência
- `button@aria-label` Reproduzir a linha do tempo
- `svg@aria-label` Mapa do ano em que a tendência de cada célula passou a ser detectável. Cor forte: cedo; pálida: tarde; cinzento: ainda não.
- `ul@aria-label` Legenda do gráfico
- `div@aria-label` Percentagem da área do planeta com tendência detectável em cada ano, comparada com o nível esperado só por acaso

### #regioes

- `h2` Contraste entre regiões
- `span` REGIÕES · MESMA ESCALA
- `h3` O mesmo período,
- `em` histórias diferentes.
- `p` Cada região tem a sua estimativa e a sua incerteza. Uma tendência só merece confiança quando o intervalo fica de um dos lados do zero.
- `figcaption` TENDÊNCIA E INCERTEZA ·
- `figcaption` °C por década
- `span` Árctico
- `span` Ásia central
- `span` Pacífico Sul
- `span` Atlântico Norte subpolar
- `span` Aumento
- `p` A temperatura sobe 0,57 °C por década (IC 95%: 0,56 a 0,59). Com p < 0,001, o acaso explica mal esta mudança.
- `span` A tendência tornou-se detectável em 2010 (com dados desde 2001) e assim se manteve.
- `dt` Média
- `dd` °C
- `dt` Variação
- `dt` Valor-p
- `dt` Células
- `p` A temperatura sobe 0,37 °C por década (IC 95%: 0,33 a 0,42). Com p < 0,001, o acaso explica mal esta mudança.
- `p` A temperatura sobe 0,06 °C por década (IC 95%: 0,03 a 0,09). Com p < 0,001, o acaso explica mal esta mudança.
- `span` A tendência tornou-se detectável em 2021 (com dados desde 2001) e assim se manteve.
- `p` A temperatura sobe 0,14 °C por década (IC 95%: 0,10 a 0,18). Com p < 0,001, o acaso explica mal esta mudança.
- `div@aria-label` Árctico: +0,57 com intervalo de +0,56 a +0,59
- `div@aria-label` Ásia central: +0,37 com intervalo de +0,33 a +0,42
- `div@aria-label` Pacífico Sul: +0,06 com intervalo de +0,03 a +0,09
- `div@aria-label` Atlântico Norte subpolar: +0,14 com intervalo de +0,10 a +0,18
- `div@aria-label` Anomalias mensais de Árctico, com tendência
- `div@aria-label` Anomalias mensais de Ásia central, com tendência
- `div@aria-label` Anomalias mensais de Pacífico Sul, com tendência
- `div@aria-label` Anomalias mensais de Atlântico Norte subpolar, com tendência

### #significativo

- `h2` É significativo?
- `span` DEMONSTRAÇÃO · RECALCULA NO BROWSER
- `h3` Uma tendência não é
- `em` um número
- `h3` . É um número e a sua dúvida.
- `p` Inventámos uma série com uma tendência conhecida e juntámos ruído. Mexa nos controlos e veja o teste de Mann-Kendall (o mesmo do mapa) decidir se a tendência se distingue do acaso.
- `button` Sinal claro
- `button` Ruído a esconder o sinal
- `button` Sem tendência
- `span` Tendência verdadeira
- `output` +0,60 unid./déc.
- `span` Ruído mensal
- `output` 0,3 unid.
- `span` Anos de dados
- `output` 20 anos
- `button` Nova amostra de ruído
- `strong` Significativa: o acaso explica mal esta tendência. **[REVER]** interpretação do valor-p a validar pela Ciência; falta a regra fixa de W40
- `dt` Imposta
- `dd` +0,60 unid. por década
- `dt` Estimada
- `dt` IC 95%
- `dt` Valor-p
- `p` O intervalo fica de um lado do zero: a direcção da mudança é fiável, mesmo que o tamanho seja incerto.
- `strong` Emergência.
- `p` A tendência tornou-se detectável em 2010 (com dados desde 2001) e assim se manteve.
- `h4` E num mapa inteiro?
- `p` Com p <
- `p` em cada célula, cerca de 5% aparecem significativas só por acaso. Simulámos
- `p` células de ruído puro, sem nenhuma tendência real:
- `button` Simular
- `div@aria-label` Exemplos
- `div@aria-label` Série sintética com a recta de tendência estimada

### #metodo

- `h2` Método e dados
- `span` REPRODUTÍVEL ·
- `h4` Anomalias
- `p` Anomalia = valor menos a média do mesmo mês do calendário. Assim sai o ciclo das estações e sobra a mudança.
- `h4` Tendência
- `p` Theil-Sen: a mediana dos declives de todos os pares de meses. Um mês extremo quase não a move.
- `h4` Teste
- `p` Mann-Kendall: conta quantos pares sobem menos quantos descem e pergunta se o acaso explicaria um saldo assim (α = 0.05).
- `h4` Autocorrelação
- `p` Hamed-Rao: meses vizinhos parecem-se, o que dá menos informação independente do que parece; a correcção alarga a incerteza, nunca a reduz.
- `h4` Testes múltiplos
- `p` Benjamini-Hochberg com q = 0.1: controla a proporção de falsos positivos entre as 2592 células.
- `h4` Emergência
- `p` Repetimos o teste em janelas que crescem (10 anos, 11, ... até ao fim) e registamos o início da sequência final de janelas significativas. Uma célula só emerge se o período completo for significativo.
- `h4` Quanto falta
- `p` Se o declive e o ruído actuais persistirem, o erro-padrão do declive encolhe com n^(-3/2); resolvemos em quantos anos fica abaixo do declive (limite de 100 anos). É uma ordem de grandeza condicional, não uma previsão.
- `h4` Áreas
- `p` Médias globais e percentagens de área pesam cada célula por cos(latitude), porque os meridianos convergem para os pólos.
- `h4` Fonte
- `strong` Dados sintéticos de demonstração
- `p` · Gerador terratempo.synthetic
- `p` · v1
- `p` Estes dados são inventados para testar o pipeline e o site. NÃO são medições da NASA e não descrevem o clima real.
- `h4` Limites
- `li` Significância estatística não é atribuição causal: o teste diz se a mudança é distinguível do acaso, não porquê.
- `li` Poucas décadas misturam tendência com variabilidade natural lenta, como o El Niño: um período diferente pode dar outro resultado.
- `li` A grelha de 5° suaviza detalhes locais; uma célula é uma média, não um sítio.
- `li` Os intervalos de confiança assumem que o modelo (tendência monótona) descreve bem a série.
- `li` O ano de emergência é descritivo: espreitar os dados ano a ano infla falsos positivos, por isso exigimos persistência até ao fim.
- `li` «Quanto falta» assume que declive e ruído se mantêm; o declive estimado é ele próprio incerto, logo é uma ordem de grandeza.
- `h4` Descarregar
- `button` Grelha (CSV)
- `button` Regiões (CSV)
- `a` Grelha de tendências
- `a` grid_trend.json
- `a` Regiões
- `a` regions.json
- `a` Série global
- `a` series_global.json
- `a` Metadados
- `a` meta.json

### Rodapé (#fontes)

- `a` NASA GPM · IMERG **[REVER]** texto fixo no código (AtlasFooter.tsx): diz que o IMERG é a fonte de referência mesmo com temperatura sintética seleccionada
- `p` é a fonte de referência do atlas. **[REVER]** ver linha acima
- `p` Esta edição usa dados sintéticos; não permite inferências sobre o clima real.
- `p` Média e áreas ponderadas pelo co-seno da latitude. Grelha de
- `p` ° ×
- `p` Significância estatística não é atribuição causal.
- `div` EDIÇÃO DEMONSTRATIVA
- `div` · ESQUEMA v
- `div` MESES
- `div` Gerado a

<!-- 14 marcas [REVER] geradas automaticamente -->
