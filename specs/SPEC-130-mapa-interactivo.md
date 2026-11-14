# SPEC-130: Mapa global interactivo (dois níveis)

- **Item do backlog:** P34, P35, B18, B19, W30, W31
- **Dono:** Pipeline (cálculo), Backend (rota), Front-end (mapa e filtros)
- **Aprovador humano:** responsável de Ciência e dados
- **Estado:** exemplo (rascunho; limiares por fixar depois de medir no hospedeiro real)
- **Dependências:** P05, P07, P08, P11, B04, W02

## 1. Objectivo
Um mapa global que responde aos filtros do utilizador, em dois níveis: **nível 1**, pré-calculado e sem API; **nível 2**, período livre recalculado na API. A honestidade estatística mantém-se nos dois: a correcção de testes múltiplos (FDR) aplica-se **a cada mapa**, nunca é saltada.

## 2. Entradas e saídas
- Nível 1: `variavel`, `preset` (completo, 20 anos, 10 anos; a fixar), `enso` (ligado ou desligado), `so_significativas` (só no navegador).
- Nível 2: `variavel`, `inicio`, `fim` (meses), `enso`.
- Saída por célula: `tendencia_por_decada`, `p_ajustado`, `significativa`, `n_meses`; no cabeçalho `schemaVersion`, `rotulo` (real ou demonstração), filtros aplicados e a escala de cores. Valores em falta são `null`. Sem frases: só chaves e parâmetros.

## 3. Comportamento
1. Nível 1 lê ficheiros pré-calculados (P34); funciona com a API desligada.
2. Nível 2 recorta a série ao período; com menos de 10 anos devolve erro claro.
3. Calcula anomalias, Theil-Sen, Mann-Kendall com Hamed-Rao e FDR **sobre as células desse pedido**; com `enso` ligado aplica o ajuste (fórmula 10) como o pipeline.
4. O cálculo corre em blocos de células e **um cálculo pesado de cada vez por processo**; o pico de memória fica abaixo do tecto (ver `04`).
5. Respostas repetidas saem da cache.
6. Se a fila estiver cheia ou o tempo máximo passar, a API responde "ocupado" e o site oferece os períodos predefinidos.
7. `so_significativas` não altera nenhum número; só o que o site esbate.
8. A escala de cores é **fixa** e vem do manifesto; não depende do filtro.
9. O site mostra um **aviso de comparações múltiplas** no nível 2 ("cada período novo é um teste novo") e um contador de períodos testados na sessão.

## 4. Critérios de aceitação
1. Para o período completo e sem ajuste, o nível 2 dá o mesmo resultado que o ficheiro pré-calculado (teste de igualdade).
2. Mudar só `so_significativas` não muda nenhum número.
3. Com dados sintéticos sem tendência, a fracção de células "significativas" não excede o nível q fixado (teste nulo, por pedido).
4. Um período com menos de 10 anos devolve erro e nenhum mapa.
5. A escala devolvida é idêntica para dois períodos diferentes.
6. O rótulo `demonstração` mantém-se em todas as combinações.
7. O resultado não depende da ordem das células.
8. Com a API desligada, o nível 1 abre e o nível 2 explica porque está desactivado.
9. No teste de carga, o pico de memória fica abaixo do tecto e nenhum pedido fica sem resposta.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Tempo máximo de um recálculo sem cache | a medir no hospedeiro real e fixar **antes** de implementar (referência de projecto: cerca de 2,7 s para o núcleo da tendência num só núcleo; ver `04`) | Experiência de uso |
| Tempo com cache | a fixar | Fluidez |
| Recálculos em simultâneo por instância | 2 (um por vCPU), a confirmar na medição | Memória e CPU |
| Pico de memória por recálculo | abaixo do tecto a fixar (referência: cerca de 12 MB em blocos de 16) | 1 GB por instância |
| Falsos positivos no teste nulo | não superior a q (proposta 0,10) mais tolerância a fixar | Honestidade |
| Pedidos por minuto por origem | a fixar | Protecção da API |

Se o tempo exceder o limiar, usam-se mais instâncias ou combinações pré-calculadas; **não** se relaxa o limiar nem a correcção estatística.

## 6. Testes
`test_periodo_completo_igual_ao_pre_calculado`, `test_so_significativas_nao_muda_numeros`, `test_nulo_sem_falsos_positivos`, `test_periodo_curto_erro`, `test_escala_fixa`, `test_rotulo_demonstracao`, `test_ordem_das_celulas`, `test_fila_cheia_devolve_ocupado`, `test_carga_memoria`; Playwright: mudar filtros e ver o mapa mudar, API desligada.

## 7. Fora do âmbito
Mapa a 1° (usa o pipeline regional); filtro de estação do ano no mapa global (o Detetive já o tem por região, SPEC-102; no mapa seria um recálculo das 2 592 células e fica fora desta spec); previsões.

## 8. Segurança e honestidade
Validação de todos os parâmetros, limites de pedidos, cache sem dados pessoais. O texto do mapa não fala em causas. O aviso de comparações múltiplas não se pode desligar.

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Limiares iguais aos fixados e medidos no hospedeiro real
- [ ] Sem segredos
- [ ] Rótulos intactos
