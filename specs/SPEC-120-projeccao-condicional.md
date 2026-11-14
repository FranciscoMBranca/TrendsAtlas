# SPEC-120: Projecção condicional

- **Item do backlog:** P32, B15, W25
- **Dono:** Pipeline (cálculo), Backend (rota), Front-end (interface)
- **Aprovador humano:** responsável de Ciência e dados
- **Estado:** exemplo (rascunho; a fórmula 15 precisa de validação)
- **Dependências:** P29, P07

## 1. Objectivo
Mostrar o que aconteceria **se** a tendência linear observada continuasse, com uma banda de incerteza que cresce com o horizonte. Não é uma previsão do clima.

## 2. Entradas e saídas
- Entrada: série mensal de anomalias, declive e erro-padrão (fórmulas 13 a 15), horizonte em anos.
- Saída: valores centrais e banda por ano, mais um campo `condicional: true` e o texto de aviso.

## 3. Comportamento
1. Calcular a projecção linear e a banda segundo a fórmula 15 (a incerteza do declive e a do nível crescem com o horizonte).
2. Esconder a projecção quando: a tendência não é significativa, a série tem menos de 10 anos ou o horizonte excede o máximo.
3. O aviso "Isto não é uma previsão do clima" vai sempre junto da projecção, em todos os modos de público.

## 4. Critérios de aceitação
1. A banda é estritamente mais larga no horizonte final do que no primeiro ano projectado (teste).
2. Em dados sintéticos com tendência conhecida e ruído, a cobertura da banda fica dentro do intervalo fixado em 5.
3. Sem tendência significativa, a rota devolve "projecção indisponível" e a interface não a desenha.
4. O aviso está presente em todas as respostas e em todos os modos.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Horizonte máximo | a fixar pela equipa (proposta: não mais do que metade do comprimento da série) | Evitar extrapolação exagerada |
| Cobertura da banda a 95% em simulação | entre 90% e 98% (a confirmar) | Banda honesta |

## 6. Testes
`test_banda_cresce`, `test_cobertura_sintetica`, `test_escondida_se_nao_significativa`, `test_aviso_presente`.

## 7. Fora do âmbito
Modelos climáticos; cenários de emissões; qualquer causa.

## 8. Segurança e honestidade
O texto nunca diz "vai acontecer"; diz "se a tendência continuar".

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Fórmula 15 validada por simulação
- [ ] Sem segredos
