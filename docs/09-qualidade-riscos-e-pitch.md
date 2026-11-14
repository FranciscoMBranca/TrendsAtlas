# 09. Qualidade, riscos e pitch

## 1. Estratégia de testes

| Nível | O quê | Onde |
| --- | --- | --- |
| Unitários | Cada fórmula contra valores calculados à mão e contra bibliotecas de referência (`pymannkendall`, `scipy.stats.theilslopes`, `linregress`) | `pipeline/tests/` |
| Contrato | Esquemas, `schemaVersion`, rótulo real/demonstração, valores em falta como `null` | `api/tests/`, `web/` |
| Propriedade | "Emergiu se e só se significativa no período completo"; resultado invariante a ordem das células | `validation/` |
| Teste nulo | Dados sem tendência não devem dar mais falsos positivos do que o nível escolhido (q = 0,10) | `validation/` |
| Retrospectivo | Prever o ano de emergência com dados até um ano e comparar com o real | `validation/` |
| Ponta a ponta | Percurso das 3 perguntas com Playwright | `web/` |
| Honestidade | Teste automático falha se um ficheiro sintético não tiver o rótulo | CI |
| Segredos | Análise no CI | `.github/` |

**Regra:** os limiares dos testes de validação fixam-se na SPEC **antes** de ver resultados.

## 2. Lista de verificação da revisão

- [ ] O PR cumpre cada critério de aceitação da SPEC.
- [ ] Há testes, e falhavam antes da implementação.
- [ ] Nenhum segredo, chave ou valor de credencial no código.
- [ ] Nenhuma fórmula duplicada fora do pipeline.
- [ ] Rótulos real/demonstração intactos.
- [ ] Textos sem causas, sem alarmismo, sem números escritos à mão.
- [ ] Limiares não foram alterados depois de ver resultados.
- [ ] Sem mexer em pastas de outro dono.

## 3. Riscos

| Risco | Prob. | Impacto | Mitigação |
| --- | --- | --- | --- |
| Leitor real falha (formato, autenticação) | Alta | Muito alto | P00 primeiro; ficheiro real guardado; Gate 1 |
| Nomes de produtos ou campos errados | Média | Alto | Fichas de produto do catálogo oficial, nunca de memória |
| Regras proíbem trabalho prévio | Média | Alto | Ler as regras antes; reconstruir a partir das specs |
| Backend gratuito sem memória ou tempo suficiente | Média | Alto | Verificar limites cedo; cubos a 2°; modo degradado |
| Download dos dados lento ou limitado | Média | Alto | Começar o download no T+0; usar um período curto se preciso |
| Agentes geram código com erros estatísticos | Média | Muito alto | Testes contra bibliotecas de referência; Revisor independente; verificação cruzada com Giovanni |
| Falsos positivos (excesso de "significativo") | Média | Alto | FDR; teste nulo; honestidade nos selos |
| Custo da API de IA | Baixa | Médio | Tecto de custo; assistente opcional |
| Cansaço da equipa | Alta | Médio | Turnos e congelamento às ~T+38 h |
| Demonstração falha ao vivo | Média | Muito alto | Modo apresentação offline e vídeo gravado |
| Texto para crianças inadequado | Baixa | Alto | Modelos fixos revistos por quem ensina |
| Interpretação como "previsão do clima" | Média | Alto | Rótulo fixo e linguagem condicional |

## 4. Limitações a mostrar na página "Como funciona"

- A temperatura do MERRA-2 é uma reanálise, não uma medição directa.
- A significância depende do método e da autocorrelação; é uma indicação, não uma prova.
- Séries curtas dão tendências instáveis.
- Regiões pequenas usam a célula que as contém.
- A projecção é linear e condicional; não é uma previsão.
- Nada aqui explica **causas**.

## 5. Pitch

**Frase central (rascunho de um colega, a aperfeiçoar):** "Escolha qualquer lugar do planeta e descubra automaticamente quais as variáveis ambientais que apresentam tendências significativas."

### Estrutura de 3 minutos (proposta)

| Tempo | Conteúdo |
| --- | --- |
| 0:00 a 0:20 | O problema: muitos dados da NASA, pouca gente os consegue usar |
| 0:20 a 0:50 | A promessa: 3 perguntas, um resultado honesto |
| 0:50 a 2:10 | Demonstração ao vivo (ou gravada): região, variável, resultado, "o que está a mudar aqui?" |
| 2:10 a 2:30 | Modo apresentação e modo Criança: acessível a todos |
| 2:30 a 2:50 | Rigor: validação, limitações, dados rotulados |
| 2:50 a 3:00 | Fecho e próximos passos |

### Regras do pitch

- Cada número vem de um ficheiro ou cálculo rastreado.
- Dizemos o que **não** sabemos; isso é força, não fraqueza.
- Só afirmamos o que foi realmente construído e testado.
- Demonstração gravada como plano B.
- Citações dos conjuntos de dados no ecrã final.

### O que nos distingue (se estiver feito)

1. Resposta honesta: mostra a incerteza e o "quanto falta" para ser significativo.
2. Acessível: três modos de público, incluindo crianças.
3. Verificável: validação retrospectiva e verificação cruzada.
4. Utilizável em ligações lentas.

## Testes novos da v6 (mapa interactivo, idiomas e acessibilidade)

| Tema | Teste | Quem |
| --- | --- | --- |
| Carga | N pedidos de recálculo em simultâneo no hospedeiro real: memória abaixo do tecto, nenhum pedido sem resposta, "ocupado" com sugestão quando a fila enche | Backend e DevOps |
| Mapa | Mudar só "só significativas" não muda nenhum número; períodos predefinidos iguais aos ficheiros estáticos; API desligada, o nível 1 continua | Backend e Front-end |
| Idiomas | Todas as chaves existem nos cinco idiomas; nenhuma frase fixa no código; chinês desenha-se sem caixas vazias; textos longos (fr, es) não partem o ecrã | Front-end |
| Acessibilidade | Verificação automática (por exemplo, axe) mais uma passagem **só com teclado** e outra com leitor de ecrã; contraste; ecrã estreito | Qualidade |
| Pessoas | Pelo menos três pessoas de perfis diferentes (idade, estudos, lugar) fazem o percurso sem ajuda | Qualidade |
| Ligação lenta | Percurso completo com a rede limitada; peso das páginas dentro do limiar da SPEC-130 | Front-end |

## 6. Entrega

- [ ] Repositório público com licença e README em inglês.
- [ ] Citações dos dados da NASA e dos parceiros.
- [ ] Site e API no ar; ligação testada de um telemóvel.
- [ ] Vídeo de reserva.
- [ ] Formulário de submissão com todos os itens obrigatórios (confirmar a lista nas regras).
