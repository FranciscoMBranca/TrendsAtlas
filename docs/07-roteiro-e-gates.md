# 07. Roteiro e gates

> **Pressuposto:** hackathon de cerca de **48 horas** (não verificado). Se a duração for outra, as fases e os gates mantêm-se; escala-se o tempo. `T+0` é a hora de arranque.

## Fases

| Fase | Janela | Objectivo | Itens principais |
| --- | --- | --- | --- |
| 0. Fundação | T+0 a T+3 h | Repositório, CLAUDE.md, agentes, CI, contratos de dados, descoberta de produtos | D01 a D04, P00, B01, B02 |
| 1. Dados reais | T+3 a T+15 h | Leitores reais de temperatura e precipitação, anomalias, testes de tendência | P02, P03, P05 a P11, P29, P36 |
| 2a. API (em paralelo à 1) | T+3 a T+15 h | Rotas com dados sintéticos rotulados, depois reais | B03 a B07 |
| 2b. Site (em paralelo) | T+3 a T+15 h | Percurso do Detetive sobre a API simulada | W01 a W08, W20, W37, W38, W40 |
| 2c. Idiomas (em paralelo, pelo grupo) | T+3 a T+27 h | Infraestrutura de idiomas cedo; catálogos pt e en primeiro; es, fr e zh depois, com revisão humana | W16, W32 a W35, N03 a N08 |
| Gate 1 | ~T+15 h | Um número real ponta a ponta | ver abaixo |
| 3. Integração | T+15 a T+27 h | Região desenhada, "o que está a mudar", selo, "quanto falta" | B08, B14, W23, W27, W39, P37 |
| Gate 2 | ~T+24 a T+27 h | **Primeira demonstração no ar** | ver abaixo |
| 4. Diferenciais | T+27 a T+39 h | Modos de público, apresentação, projecção, validação, aerossóis (AOD) | W21, W22, W25, P14, P15, P18, P28 |
| Congelamento | ~T+38 h | Só correcções; nada de funcionalidades novas | |
| 5. Pitch e polimento | últimas horas | Guião, README em inglês, vídeo, citações, ensaio | N01, D08 |

## Gate 1: um número real ponta a ponta

- [ ] Um ficheiro real da NASA lido por um leitor com testes.
- [ ] Anomalia mensal, tendência e teste calculados para uma região real.
- [ ] A API devolve esse número com o rótulo `real`.
- [ ] O site mostra-o.
- [ ] Os testes e a análise de segredos passam no CI.

**Se falhar:** parar as funcionalidades novas e corrigir o leitor. Sem dados reais não há produto.

## Gate 2: primeira demonstração no ar

- [ ] O percurso das 3 perguntas funciona com temperatura e precipitação reais.
- [ ] O resultado mostra gráfico, tabela, selo e "quanto falta".
- [ ] "Mundo inteiro" e a escolha de meses funcionam no percurso; a regra do valor-p (abaixo de 0,05) aparece junto ao selo.
- [ ] Dados de demonstração têm rótulo; um teste verifica-o.
- [ ] Site na Vercel, API no hospedeiro, modo degradado testado (desligar a API).
- [ ] Alguém de fora da equipa percorreu o fluxo sem ajuda.
- [ ] Mapa interactivo com os filtros do nível 1 a funcionar; com a API desligada, continua a abrir.
- [ ] Troca de idioma sem recarregar, com pt e en completos e revistos.
- [ ] Teste de carga do recálculo no hospedeiro real feito; limiar da SPEC-130 fixado.

## Gate 3: congelamento

- [ ] Todos os números do pitch rastreados até um cálculo ou ficheiro.
- [ ] Limitações visíveis na página "Como funciona".
- [ ] Citações dos conjuntos de dados presentes.
- [ ] README em inglês com instruções de execução.
- [ ] Vídeo ou demonstração gravada como plano B.
- [ ] Cada idioma mostra o seu estado de revisão; os não revistos têm o aviso de tradução automática.
- [ ] Verificação de acessibilidade feita: teclado, leitor de ecrã, contraste, ecrã pequeno e ligação lenta.

## Ordem de corte (se o tempo apertar)

Cortar de baixo para cima; a Camada A nunca se corta.

1. Assistente de conversa (B11, W14)
2. Período livre recalculado (P35, B18, W31); os filtros do nível 1 ficam
3. Concordância entre produtos (P17, W12)
4. Pontos quentes (P16, W11)
5. Variáveis das camadas 2 e 3 (os aerossóis, P18, são as últimas a cortar)
6. Lente de Angola (W15)
7. Fragilidade (P15, W10)
8. Modos Explorador e Cientista separados (fica só Criança e um modo completo); modo Professor (W29)
9. Projecção na interface (W25)

Nunca se corta: Camada A (inclui meses ou estação e "Mundo inteiro"), filtros do nível 1, modo leve (W26), preferências de acessibilidade (W36) e **um idioma já entregue**. Um idioma sem revisão humana mantém-se com o aviso de tradução automática, não se retira. A revisão pode faltar; o aviso não.

## Ritmo e cuidados

- Os agentes trabalham em paralelo, mas **as junções são feitas por humanos**.
- Sono: planear turnos; ninguém decide pitch ou deploy sem dormir.
- Revisão de custos a cada 12 h.
- Ensaio do pitch pelo menos duas vezes antes da entrega.
