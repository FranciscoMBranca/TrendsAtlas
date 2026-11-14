# SPEC-102: Tendência de uma estação do ano (meses escolhidos)

- **Item do backlog:** P36, W37 (usa B08, fórmula 17)
- **Dono:** Pipeline (cálculo), Backend (parâmetro), Front-end (selector)
- **Aprovador humano:** responsável de Ciência e dados
- **Estado:** exemplo (rascunho; a fórmula 17 e as regras de meses em falta precisam de validação)
- **Dependências:** P05, P07, P29, B08, W20

## 1. Objectivo
Permitir analisar a tendência só nos meses que o utilizador escolher (por exemplo Jun a Ago), como no exemplo do vídeo (AOD nos verões). O resultado usa os mesmos testes e os mesmos blocos do resultado normal.

## 2. Entradas e saídas
- Entrada: `meses` (lista de 1 a 12 inteiros, sem repetidos; omitida = todos os meses, comportamento actual) além dos parâmetros de `POST /regiao/analise`.
- Saída: a de `/regiao/analise`, mais `meses`, `n_anos` (pontos usados), `anos_excluidos` (com o motivo) e `aviso_poucos_pontos` (booleano). Sem frases: só chaves e parâmetros.

## 3. Comportamento
1. Calcula as anomalias mensais (fórmula 1) sobre **todos** os meses; só depois escolhe os meses.
2. Para cada ano da estação, `A_Y` é a média das anomalias dos meses escolhidos (fórmula 17).
3. Estação que atravessa o ano: o ano da estação é o ano em que termina (Dez 2019, Jan e Fev 2020 contam para 2020).
4. Anos com meses em falta: **proposta, a fixar:** só entram anos com todos os meses escolhidos; os restantes vão em `anos_excluidos`.
5. Aplica Theil-Sen, Mann-Kendall com Hamed-Rao, regressão e teste t. Declive por década = declive anual × 10.
6. Mínimo de 10 anos com estação completa; abaixo disso, erro claro e nenhum resultado.
7. "Quanto falta" (fórmula 9) conta anos, não meses; a spec de P10 adapta-a.
8. Com menos de 15 anos (a fixar), `aviso_poucos_pontos` é verdadeiro e o site avisa que o teste tem pouco poder.
9. O site mostra um contador de conjuntos de meses testados na sessão (comparações múltiplas), como na SPEC-130.
10. `meses` com os 12 meses é tratado como "todos os meses" e dá o resultado normal.

## 4. Critérios de aceitação
1. Série sintética com tendência só em Jun a Ago: detectada com esses meses e **não** detectada com os 12 meses.
2. Com os 12 meses, o resultado é igual ao do percurso normal (teste de igualdade).
3. Dez a Fev: o ano da estação segue a regra do ponto 3 (teste com datas de fronteira).
4. Menos de 10 anos completos: erro e nenhum resultado.
5. O resultado não depende da ordem dos meses na lista.
6. Os números da frase são iguais aos da resposta; a frase nomeia os meses.
7. Sem dados sintéticos sem rótulo: o rótulo `demonstração` mantém-se.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Mínimo de anos | 10 | Coerente com o resto do produto |
| Aviso de poucos pontos | abaixo de 15 anos (proposta) | Honestidade sobre o poder do teste |
| Meses em falta por ano | nenhum (proposta) | Evitar médias enviesadas |
| Tempo de resposta | abaixo do de `/regiao/analise` normal | O cálculo extra é uma média por ano |

## 6. Testes
`test_sazonal_detecta_so_no_verao`, `test_doze_meses_igual_ao_normal`, `test_estacao_atravessa_ano`, `test_menos_de_10_anos_erro`, `test_ordem_dos_meses`, `test_numeros_da_frase`; Playwright: escolher Jun a Ago, escolher meses à mão, estação com poucos anos.

## 7. Fora do âmbito
Filtro de estação no mapa global (SPEC-130); duração e época das estações (quando começam, quanto duram); contagem de eventos (tempestades).

## 8. Segurança e honestidade
Validação de `meses` (inteiros de 1 a 12). O ecrã diz que há poucos pontos. "Não significativa" nunca é apresentada como "sem tendência". Nenhuma frase fala em causas.

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Fórmula 17 validada pelo agente de Ciência
- [ ] Sem segredos
- [ ] Rótulos intactos
