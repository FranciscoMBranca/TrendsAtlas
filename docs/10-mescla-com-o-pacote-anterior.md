# 10. Mescla com o pacote anterior (TerraTempo Pro Package)

O pacote anterior tem 20 ficheiros. Dezanove são **esqueletos de uma a três linhas**; só `19_PLANO_DESENVOLVIMENTO_PRO.md` tem conteúdo (cerca de 40 linhas). Nada foi perdido: cada ficheiro tem agora um destino mais completo.

## Onde está cada ficheiro

| Pacote anterior | Ideia | Onde vive agora |
| --- | --- | --- |
| 00 Visão | Plataforma de inteligência ambiental com dados da NASA, para cientistas, estudantes e público | `00-visao-e-decisoes.md` |
| 01 Alinhamento com o desafio | Mapear requisitos para funcionalidades | `01-alinhamento-com-o-desafio.md` (R1 a R12) |
| 02 Proposta de valor | O que muda, onde, quanto, se é significativo | `00` e `02` (percurso do Detetive) |
| 03 Personas | Cientista, Estudante, Criança, Público geral | `11-publicos-premios-e-impacto.md` e `02` (modos) |
| 04 Datasets | MERRA-2, IMERG, MODIS NDVI, GLDAS, AIRS, OMI | `03-variaveis-e-dados.md` (catálogo por camadas) |
| 05 Variáveis | Temperatura, precipitação, NDVI, humidade do solo, evapotranspiração, aerossóis | `03` |
| 06 Metodologia | Mann-Kendall, Theil-Sen, regressão, intervalos | `05-metodo-e-formulas.md` |
| 07 Arquitectura | Next.js, FastAPI, Python | `04-arquitectura.md` (como opção A, D2 e D3) |
| 08 UX | Cientista, Explorador, Criança, Professor | `02`, secção 3 |
| 09 Mapa temporal | Reprodução temporal no mapa | `02` secção 4 e `SPEC-110` |
| 10 Assistente IA | Só explica com dados calculados | `04`, `06` e backlog B11, B13 |
| 11 API | Séries, tendências, regiões | `04` (rotas) |
| 12 Backlog | MVP, estatística, IA | `08-backlog.md` |
| 13 Roadmap 48 h | Dia 1 dados e backend; dia 2 site e pitch | `07-roteiro-e-gates.md` |
| 14 Validação | Comparar métodos e testes | `09` e `SPEC-014` |
| 15 Acessibilidade | Paletas inclusivas, linguagem simples | `02` secção 8 (W17, W26, W27) |
| 16 Pitch | Problema, solução, demonstração, impacto | `09`, secção 5 |
| 17 Prémios | Impacto social, ciência cidadã, educação | `11` |
| 18 Equipa de agentes | Especificações, Pipeline, Backend, Front-end, Revisão | `06-agentes-e-processo.md` (10 agentes) |
| 19 Plano profissional | Fases 0 a 5 | `07` (fases e gates) |

## O que o pacote trouxe de novo e foi adoptado

- **Modo Professor** (W29) e a divisão em quatro públicos: Criança, Explorador, Cientista, Professor.
- **Comparação de regiões** (P33, B17), prevista na fase de IA do pacote.
- **Regiões de demonstração**: Sahel e oceano Atlântico (em `03`).
- **AIRS** como produto candidato de camada 3.
- **Estratégia de prémios** (impacto social, ciência cidadã, educação), em `11`.

## Onde o plano v2 diverge do pacote (e porquê)

| Tema | Pacote anterior | Plano v2 | Razão |
| --- | --- | --- | --- |
| Dados da Fase 1 | Temperatura, precipitação, NDVI **e** humidade do solo | Só temperatura e precipitação (humidade do ar se estiver no mesmo ficheiro); NDVI e GLDAS na camada 2 | NDVI (HDF4) e GLDAS exigem leitores novos e nenhum leitor real existe ainda. Um leitor real vale mais do que quatro de demonstração. Se a equipa quiser NDVI e GLDAS na Fase 1, é uma decisão da equipa (D7) |
| Descoberta de variáveis relevantes por IA | Fase 4 | Varrimento **determinístico** (P31); IA só para explicar | Estatística tem de ser reprodutível e verificável |
| Regressão e teste t | Citados | Fórmulas 13 e 14, com validação | Pedido no enunciado |
| Regiões | Quatro | Quatro tipos do enunciado mais Sahel e Atlântico | Mais cobertura, mesma regra: só com dados reais |
| Estado | "Plano profissional" sem gates | Gates 1 a 3, ordem de corte, limiares fixados antes dos resultados | Evitar um demo bonito sem dados reais |

## O que continua em falta (nem o pacote nem o plano resolvem)

Nomes exactos de produtos e campos de dados (P00), regras do hackathon, hospedeiro do backend, nome final, e quem revê os textos para crianças.
