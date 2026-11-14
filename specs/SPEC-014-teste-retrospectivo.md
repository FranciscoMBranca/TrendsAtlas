# SPEC-014: Teste retrospectivo ("a previsão acertou?")

- **Item do backlog:** P14
- **Dono:** Ciência e validação
- **Aprovador humano:** responsável de Ciência e dados
- **Estado:** exemplo (rascunho; limiares a confirmar pela equipa antes de usar)
- **Dependências:** P07, P09, P10

## 1. Objectivo
Medir se o "quanto falta" calculado com dados até um ano de corte acerta no ano em que a tendência realmente passa a ser significativa.

## 2. Entradas e saídas
- Entrada: cubo mensal de anomalias, anos de corte candidatos.
- Saída: tabela por célula (ano previsto, ano real, erro em anos, estado) e um resumo; `schemaVersion` presente.

## 3. Comportamento
1. Para cada ano de corte C, usar só os dados até C e calcular o ano previsto de emergência com a fórmula 15.
2. Com a série completa, determinar o ano real de emergência (fórmula 11, persistente até ao fim).
3. Comparar. Células sem emergência no período completo entram como "não emergiu" e contam à parte.
4. Dividir por blocos contíguos; nunca embaralhar o tempo.

Casos-limite: série com menos de 10 anos até C (excluir); valores em falta (`null`, ignorar).

## 4. Critérios de aceitação
1. Um teste com série sintética de tendência conhecida recupera o ano de emergência esperado.
2. Nenhum cálculo usa dados posteriores ao ano de corte (teste que corrompe os dados futuros e confirma que a saída não muda).
3. O relatório mostra a fracção de acertos e o erro mediano **e** a fracção de "não emergiu".
4. O resultado em dados de demonstração nunca entra no relatório real.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Janela de acerto | ±5 anos (a confirmar) | Tolerância razoável para séries curtas |
| Mínimo de células avaliáveis | A fixar pela equipa antes de correr | Evita conclusões com poucas células |

Se o resultado ficar abaixo do esperado, **reporta-se como está**; não se altera o limiar.

## 6. Testes
- `test_sem_fuga_de_dados_futuros`
- `test_recupera_emergencia_sintetica`
- `test_relatorio_tem_nao_emergiu`
- `test_rotulo_demonstracao_excluido`

## 7. Fora do âmbito
Previsão do clima; previsão para fora do período observado.

## 8. Segurança e honestidade
O relatório diz claramente que mede o método, não o futuro do clima.

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Limiares iguais aos fixados
- [ ] Sem segredos
