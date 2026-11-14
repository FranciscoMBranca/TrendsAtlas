# 01. Alinhamento com o desafio da NASA

Este ficheiro cruza três coisas: o **enunciado e a lista de recursos** que a NASA disponibilizou, o **plano anterior** (atlas, Tempo de Emergência, modelo ao ENSO) e as **sugestões de dois colegas**. O resultado é uma lista de requisitos (R1 a R12), cada um com o item do backlog que o cumpre.

> Fonte: o texto do enunciado e a lista de recursos tal como a equipa os colou. Li os títulos e as descrições; **não abri as ligações dos recursos**. Nada aqui foi confirmado nos sites da NASA.

## 1. O que o enunciado pede

O desafio pede uma ferramenta que escolha variáveis medidas ou modeladas, mostre como mudam no tempo e determine **o que muda, onde, quanto e se a mudança é significativa**. O enunciado diz que "uma resposta que inclua tanto a visualização quanto a análise atende ao escopo completo".

| ID | Requisito (do enunciado) | Como cumprimos | Backlog | Prioridade |
| --- | --- | --- | --- | --- |
| R1 | Identificar variáveis de interesse | Catálogo de variáveis com definições simples; pergunta "o que quer investigar?" | W20, W27, P00 | Must |
| R2 | Obter os dados **para uma região específica** | Escolha de região no mapa (clicar, desenhar, regiões-exemplo) | B08, W13, P30 | Must |
| R3 | Gerar e visualizar uma série temporal num período longo | Gráfico da série (anomalias) com tendência e intervalo de confiança | W06, W20 | Must |
| R4 | Taxa de variação ao longo do tempo | Declive por década (Theil-Sen e regressão linear) | P07, P29 | Must |
| R5 | Testar a significância: teste t, Mann-Kendall ou intervalos de confiança | **Os três**: Mann-Kendall, teste t da regressão e intervalos de confiança, lado a lado | P07, P29 | Must |
| R6 | Visualização **e** análise na mesma resposta | Um ecrã de resultado com gráfico, tabela e frase | W20 | Must |
| R7 | Público: estudantes e público geral; definições simples | Glossário simples e três modos de linguagem (Criança, Explorador, Cientista) e um modo Professor opcional | W21, W27 | Must / Should |
| R8 | Abordagem: breve série de perguntas e exemplos para assistir | Fluxo "Detetive de Dados" em 3 perguntas; modo apresentação e exemplos guiados | W20, W22, W24 | Must / Should |
| R9 | IA opcional para identificar dados com potencial numa região (deserto, floresta tropical, estuário, cidade) | Regiões-exemplo e "o que está a mudar aqui?" (ordena variáveis por região); modelo ao ENSO treinado | P31, B14, P30, P12 | Should |
| R10 | Dados diários ou mensais (mensais são o mais fácil) | Só dados **mensais** | P05 | Must |
| R11 | Uma tendência não significativa também interessa; às vezes só falta tempo | "Ainda não é significativa; faltam cerca de N anos" (projecção condicional) | P10, W05 | Must |
| R12 | Tirar a sazonalidade; tendências lineares chegam | Anomalias mensais (formula 1) e declive linear | P05 | Must |
| R13 | Tendência numa estação do ano (vídeo: "um pouco mais difícil, mas perfeitamente possível"; o exemplo é o verão) | Escolha de meses na pergunta 3; um valor por ano e os mesmos testes (fórmula 17, SPEC-102) | P36, W37 | Must |
| R14 | A região pode ser o mundo inteiro; o exemplo do vídeo é um estado | Botão "Mundo inteiro" e escolha por país ou estado, além de clicar e desenhar | W38, W39, P37, B08 | Must (globo) / Should (por nome) |
| R15 | Exemplo do vídeo: AOD (aerossóis) do MODIS no satélite Aqua, média de um estado, desde 2002 | Aerossóis sobem a Should; demonstração "AOD, Wisconsin, verão" com verificação no Giovanni | P18, P28, D13 | Should |
| R16 | Regra do valor-p: abaixo de 0,05 é significativa; acima disso não quer dizer "sem tendência" | Regra em texto fixo junto ao selo; diferença para o FDR (q = 0,10) do mapa explicada | W40 | Must |
| R17 | Variáveis citadas no vídeo (nuvens, radiação, neve, temperatura do mar, vento, pressão, vapor de água...); a aplicação pode usar só um tipo | Catálogo alargado, cada variável só depois de ficha P00 | P38 | Could |

> R13 a R17 vêm do **vídeo de descrição do desafio** (transcrição e tradução feitas pela equipa), não do enunciado escrito. Não foram confirmadas nos sites da NASA.

**Duas coisas que o enunciado diz em letras pequenas e o plano anterior não cumpria:**

1. O enunciado cita o **teste t** e a regressão linear. O pipeline anterior só tinha Mann-Kendall e intervalo do declive de Sen. Entra agora a regressão linear com R², teste t e intervalo de confiança (itens P29, fórmulas 13 e 14 em `05-metodo-e-formulas.md`).
2. O enunciado pede dados **para uma região específica**. A grelha de 5° do plano anterior é grosseira para isso: a caixa aproximada de Angola (4°S a 18°S, 12°E a 24°E) cobre **cerca de 9 células**. A solução (mapa global leve + série regional a resolução maior no backend) está em `03-variaveis-e-dados.md`.

## 2. Os recursos da NASA e como os usamos

Só temos o título e a descrição de cada recurso. A coluna "uso" é a proposta; confirmar ao abrir cada um.

| Recurso | Uso proposto | Risco |
| --- | --- | --- |
| Giovanni | **Verificação cruzada**: para 3 regiões e 2 variáveis, comparar a nossa série com a que o Giovanni gera (item P28). Não é dependência do produto | Não confirmei que o Giovanni tenha uma API estável para pedidos automáticos; por isso não depender dele |
| Séries temporais hidrológicas | Fonte candidata para o caudal de rios (fora do MVP) | Dados por estação ou bacia, não em grelha: modelo de dados diferente |
| AppEEARS | Alternativa para extrair NDVI (MODIS) por área, se o leitor HDF4 atrasar | Fluxo de pedidos assíncrono; confirmar limites |
| Climate Data Online (NCDC) | Comparar a temperatura de uma estação com a nossa série, se houver estação perto | Poucas estações em Angola; confirmar antes de prometer |
| Artigo: séries de clorofila (SeaWiFS) com teste de significância | Modelo de como apresentar uma série e o seu teste | Só leitura |
| KNMI Climate Explorer | Segunda ferramenta de verificação cruzada para temperatura e precipitação | Só verificação manual |
| Artigos: métodos de teste de tendências; guia de significância estatística | Base para o glossário simples e a página "Como funciona" | Só leitura; citar como fonte |
| Recursos da CSA (RADARSAT, Geo.ca, SWOT, tutorial SAR) | **Fora do MVP.** O SWOT (altura da água em lagos, rios e oceanos) é uma ideia de futuro para a variável hidrológica | Formatos e processamento próprios |

Modelos e instrumentos que o enunciado nomeia (MODIS, OMI, AIRS, GPM, MERRA-2, GLDAS) estão no catálogo de variáveis de `03-variaveis-e-dados.md`.

## 3. As sugestões dos colegas: o que adoptámos

### Colega 1: "EarthTrend Detective"

| Sugestão | Decisão | Razão |
| --- | --- | --- |
| Os 4 requisitos principais (variáveis, região, série, teste) | **Adoptada como Camada A** | Coincide com o enunciado; tem de funcionar na perfeição antes de qualquer diferencial |
| Fluxo em 3 perguntas: o quê, onde, quando | **Adoptada** | Corresponde à "breve série de perguntas" do enunciado |
| Lista larga de variáveis (humidade do solo, evapotranspiração, ozono, caudal) | **Adoptada por camadas** | São candidatas reais, mas cada uma precisa de um leitor novo; entram por prioridade |
| Obter os dados em directo pelo Giovanni | **Ajustada** | Pedidos em directo a uma ferramenta web são frágeis em 48 horas. Pré-calculamos e usamos o Giovanni para **verificar** |
| Calcular declive, R², valor-p, Mann-Kendall | **Adoptada** | Cobre o teste t e a regressão que o plano anterior não tinha |
| "A IA explica em linguagem simples" | **Adoptada, com guarda-corpos** | A explicação só pode usar números calculados; um verificador automático compara os números do texto com os da análise (B12) |
| "Escolha qualquer lugar e descubra quais variáveis têm tendências significativas" | **Adoptada** como "O que está a mudar aqui?" (P31, B14) | É a frase que responde ao núcleo do desafio |
| Frases tipo "mais depressa do que a média global" | **Só se for calculado** | Uma comparação com a média global tem de vir dos dados, não do texto |
| Stack: Next.js, Leaflet, FastAPI | **Quase toda compatível** | Ver decisão D2 e D3 em `00-visao-e-decisoes.md` |
| Período 2000 a 2026 | **Ajustada** | O período real depende do primeiro mês disponível de cada produto e do último ano completo; fixa-se na spec |

### Colega 2: acessível a todo o mundo

| Sugestão | Decisão | Razão |
| --- | --- | --- |
| Filtros de visualização para crianças, simples e encantadores | **Adoptada** como modos de público (W21) | O enunciado fala em estudantes e público geral |
| Modo de apresentação: ver a mudança no mapa ao longo do tempo, como um vídeo | **Adoptada** (W22) | É também o "exemplo demonstrativo que o usuário pudesse assistir" do enunciado |
| "Previsão" ao tocar numa área | **Ajustada** para **projecção condicional** (P32, W25) | Uma previsão do clima não está ao nosso alcance. Mostramos "se a tendência continuar", com incerteza, e dizemo-lo |
| Tocar numa área e ver a informação | **Adoptada** (W23) | Responde ao "onde" |
| Acessível a todos | **Adoptada**, e alargada ao **modo leve** (W26) para ligações lentas | Acessível também quer dizer leve de descarregar |

## 4. Lacunas do plano anterior que este alinhamento revelou

1. **Teste t, regressão e R²** em falta (R5).
2. **Resolução** pouco adequada a regiões pequenas (R2).
3. **Experiência guiada** em falta: o plano anterior era um atlas para explorar, e o enunciado pede um percurso de "detetive" (R8).
4. **Público escolar** não estava previsto (R7).
5. **Variáveis hidrológicas e de solo** ausentes, embora o enunciado as cite (R1).
6. **Idioma**: o plano anterior punha a versão em inglês entre os primeiros cortes. Para um júri internacional isso é arriscado; ver D8 em `00-visao-e-decisoes.md`.
7. **Período** com 288 meses (2001 a 2024) era do plano anterior; o número de meses depende agora do último ano completo disponível, e as fórmulas usam n em geral.
8. **Estação do ano** (v7): o plano só analisava todos os meses juntos, com a sazonalidade retirada; o vídeo mostra uma tendência de verão (R13).
9. **"Mundo inteiro" e região por nome** (v7): existiam a série global na API e as regiões desenhadas, mas a pergunta 2 não as oferecia (R14).
10. **Exemplo do vídeo (AOD, MODIS Aqua)** não era reproduzível: aerossóis estavam em "Could" (R15).
