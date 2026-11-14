# 05. Método e fórmulas

As fórmulas estão em três grupos:

- **1 a 12:** já desenhadas e implementadas na versão anterior (`trend.py`, `emergence.py`, `denoise.py`, leitores). Se as regras do hackathon exigirem trabalho novo, voltam a ser implementadas a partir daqui.
- **13 a 17:** **novas e necessárias** (o enunciado pede teste t e regressão; a região e a projecção precisam delas; a 17, tendência por estação do ano, vem do vídeo).
- **F1 a F5:** diferenciais futuros.

Para cada fórmula: **como funciona**, **para que serve** e **teste de referência**. Notação: `t` é o mês, `n` o número de meses, `y` a anomalia, `α = 0,05`.

> **Estado:** as fórmulas 13 a 17 e F1 a F5 **não foram implementadas nem testadas**; a validação é uma tarefa do agente de Ciência. A F4 está escrita de memória e tem de ser confirmada na documentação do produto antes de se implementar.

---

## Em uso (1 a 12)

### 1. Anomalia mensal

$$a(t) = x(t) - \bar{x}_{m(t)}$$

**Como funciona:** de cada valor tira-se a média de todos os meses iguais (todos os Janeiros, todos os Fevereiros...). Sobra quanto esse mês se afastou do normal.
**Para quê:** tirar a estação do ano. Sem isto qualquer série mostraria "tendência" só por ir do verão ao inverno. Entrada de todos os cálculos seguintes (R12).
**Referência:** teste com uma série sintética com ciclo sazonal puro: anomalias com média zero em cada mês.

### 2. Média pesada por área

$$w_i = \cos\varphi_i, \qquad \bar{x}(t) = \frac{\sum_i w_i\, x_i(t)}{\sum_i w_i}$$

**Como funciona:** células perto dos pólos cobrem menos área; cada célula pesa pelo cosseno da latitude φ.
**Para quê:** série global e de cada região sem exagerar os pólos.
**Referência:** com latitude constante, a média pesada é igual à média simples.

### 3. Declive de Theil-Sen

$$\beta = \operatorname{mediana}_{i<j}\; \frac{y_j - y_i}{j - i}$$

**Como funciona:** o declive entre todos os pares de meses; fica a mediana. Um mês extremo quase não a mexe.
**Para quê:** o **quanto** muda (R4). Multiplica-se por 120 para dar "por década".
**Referência:** `scipy.stats.theilslopes`.

A tendência relativa é `100 × (β × 120) / média`, só onde faz sentido (não para °C nem nível do mar).

### 4. Teste de Mann-Kendall

$$S = \sum_{i<j} \operatorname{sgn}(y_j - y_i), \qquad \operatorname{Var}(S) = \frac{n(n-1)(2n+5) - \sum_p t_p(t_p-1)(2t_p+5)}{18}$$

$$Z = \frac{S \mp 1}{\sqrt{\operatorname{Var}(S)}}, \qquad p = 2\,\bigl(1 - \Phi(|Z|)\bigr)$$

**Como funciona:** S conta os pares em que a série sobe menos os pares em que desce. Se S é grande para o que o acaso daria, o valor-p é pequeno. O termo com `t_p` corrige valores repetidos; o ±1 é a correcção de continuidade.
**Para quê:** responder "é significativo?" sem assumir curva normal (R5).
**Referência:** `pymannkendall`.

### 5. Correcção de autocorrelação de Hamed-Rao

$$f = 1 + \frac{2}{n(n-1)(n-2)} \sum_k (n-k)(n-k-1)(n-k-2)\,\rho_k, \qquad \operatorname{Var}^*(S) = f \cdot \operatorname{Var}(S)$$

**Como funciona:** meses vizinhos parecem-se, logo há menos informação independente do que o número de meses sugere. Mede-se a autocorrelação ρ dos ranks (depois de tirar a tendência) só nos desfasamentos k onde é significativa. Nunca deixamos `f` abaixo de 1.
**Para quê:** evitar falsos positivos em séries mensais.
**Referência:** `pymannkendall` (variante de Hamed-Rao).

### 6. Intervalo de confiança do declive de Sen

$$C = z_{1-\alpha/2}\sqrt{\operatorname{Var}^*(S)}, \qquad M_1 = \frac{N-C}{2},\quad M_2 = \frac{N+C}{2}, \quad N = \frac{n(n-1)}{2}$$

**Como funciona:** com os N declives dos pares ordenados, a incerteza do teste diz que posições tomar como limites inferior e superior.
**Para quê:** mostrar a incerteza do declive e não só o seu valor.
**Referência:** `scipy.stats.theilslopes` (intervalo, sem correcção de autocorrelação).

### 7. Benjamini-Hochberg (controlo de falsas descobertas)

$$p_{(k)} \le \frac{k}{m}\, q, \qquad q = 0{,}10$$

**Como funciona:** ordenam-se os m valores-p; procura-se o maior k que cumpre a desigualdade; marcam-se as k células com menor p.
**Para quê:** o mapa testa milhares de células; com p < 0,05 em cada uma, cerca de 5% apareciam "significativas" só por acaso.
**Referência:** `scipy.stats.false_discovery_control`.
**Nota (regra do valor-p):** numa região única a regra é p < 0,05, a que o vídeo ensina. O q = 0,10 aplica-se só ao mapa, onde se testam milhares de células. O site explica a diferença (W40).

### 8. Tempo de Emergência

$$s(Y) = \mathbb{1}\{\text{significativa na janela } [\text{início}, Y]\}, \qquad E = \min\{\,Y : s(Y') = 1\ \ \forall\, Y' \ge Y\,\}$$

**Como funciona:** o teste (3 a 7, com FDR em cada janela) repete-se em janelas que crescem ano a ano, a partir de 10 anos. `E` é o primeiro ano a partir do qual a célula fica significativa em todas as janelas até ao fim.
**Para quê:** "desde quando se distingue do ruído". Resultado central do atlas. **O ano é descritivo**, calculado depois de conhecido o fim da série.
**Invariante testado:** "emergiu se e só se for significativa no período completo".

### 9. Quanto falta

$$\mathrm{SE}(n) = \sigma\sqrt{\frac{12\, f\, r}{n(n^2-1)}}, \qquad |\beta| \ge z_{1-\alpha/2}\,\mathrm{SE}(n) \;\Rightarrow\; n \approx \left(\frac{z\,\sigma\sqrt{12\, f\, r}}{|\beta|}\right)^{2/3}$$

**Como funciona:** σ é o desvio dos resíduos à volta da recta de Sen; `f` é o factor da fórmula 5; `r = 1/0,955` ajusta o declive de Sen à variância dos mínimos quadrados. A tendência fica detectável quando o declive iguala `z` vezes o erro-padrão, que encolhe com `n` elevado a −3/2. Resolve-se em `n` e subtraem-se os meses que já temos (arredondando para cima, mínimo 1 ano).
**Para quê:** R11, "às vezes só falta tempo". **Projecção condicional**, nunca previsão.

### 10. Ajuste ao ENSO (modelo treinado)

$$y(t) = a + b\,t + \sum_{l=0}^{L} c_l\, E(t-l) + \varepsilon(t), \qquad \hat{c} = (X^\top X + \lambda P)^{-1} X^\top y, \qquad y_{\text{ajust}}(t) = y(t) - \sum_{l} \hat{c}_l\, E(t-l)$$

**Como funciona:** `E` é um índice externo do El Niño (Niño 3.4). Em cada célula ajusta-se a anomalia a uma recta mais o índice com até `L` meses de atraso; a penalização ridge (λ, com P só nos coeficientes do índice) trava coeficientes exagerados. Dos dados tira-se **apenas** a parte do índice, nunca a recta: a tendência fica para o teste medir.
**Para quê:** tirar o ruído partilhado do El Niño antes do teste. É o **modelo treinado** do projecto (a parte de IA do desafio). Pequeno de propósito: com poucas centenas de meses por célula, um modelo maior decorava o ruído.
**Lição:** modos aprendidos dos próprios dados fizeram os falsos positivos subir de 35% para 79%, porque um modo lento carrega a sua própria tendência. Por isso o índice é sempre **externo**.

### 11. Validação cruzada e diagnóstico do modelo

$$\mathrm{skill} = \max\!\left(0,\; 1 - \frac{\mathrm{Erro}_{\text{modelo}}}{\mathrm{Erro}_{\text{recta}}}\right), \qquad R^2_{\text{expl}} = 1 - \frac{\operatorname{Var}(y_{\text{ajust}})}{\operatorname{Var}(y)}$$

**Como funciona:** os meses dividem-se em 6 blocos seguidos de anos; cada bloco fica de fora, o modelo treina nos outros e mede-se o erro no bloco ignorado. Testam-se atrasos de 0 a 6 meses e quatro valores de λ, mais "não fazer nada". Fica o modelo mais simples cujo erro não fique mais de 0,2% do da recta acima do melhor.
**Para quê:** o modelo só se liga se ajudar fora da amostra. O `skill` e a variância explicada aparecem no painel do site.

### 12. Conversões dos leitores

$$P_{\text{mm/dia}} = P_{\text{mm/h}} \times 24, \qquad T_{\text{°C}} = T_{\text{K}} - 273{,}15$$

**Para quê:** ter as unidades que o site mostra. Faz-se no leitor, antes das anomalias.

---

## Novas e necessárias (13 a 17)

### 13. Regressão linear e R²

$$\hat\beta_{\text{OLS}} = \frac{\sum_t (t - \bar t)(y_t - \bar y)}{\sum_t (t - \bar t)^2}, \qquad R^2 = 1 - \frac{\sum_t (y_t - \hat y_t)^2}{\sum_t (y_t - \bar y)^2}$$

**Como funciona:** a recta de mínimos quadrados que melhor se ajusta à série; R² diz que fracção da variação a recta explica.
**Para quê:** a "regressão linear" e o "R²" que o enunciado e um colega pedem (R4, R5). Mostra-se **ao lado** do Theil-Sen.
**Referência:** `scipy.stats.linregress`.

### 14. Teste t e intervalo de confiança do declive, com correcção de autocorrelação

$$t = \frac{\hat\beta}{\mathrm{SE}(\hat\beta)}, \qquad \mathrm{SE}(\hat\beta) = \sqrt{\frac{s^2}{\sum_t (t-\bar t)^2}}, \qquad \hat\beta \pm t_{n_{\text{ef}}-2,\,1-\alpha/2}\;\mathrm{SE}(\hat\beta)$$

$$n_{\text{ef}} = n\,\frac{1-\rho_1}{1+\rho_1}$$

**Como funciona:** o teste t pergunta se o declive é distinguível de zero comparando-o com o seu erro-padrão; `s²` é a variância dos resíduos. Como meses vizinhos se parecem, usa-se um número efectivo de meses `n_ef`, menor que `n`, calculado com a autocorrelação de lag 1 dos resíduos `ρ₁`.
**Para quê:** o teste t e o intervalo de confiança que o enunciado cita (R5). O resultado é comparado com o de Mann-Kendall (regra de "resultado dividido").
**Referência:** `scipy.stats.linregress` dá o valor-p **sem** correcção; o teste compara com ele no caso sem autocorrelação e verifica que a correcção só alarga o intervalo. **A correcção `n_ef` é uma aproximação comum e tem de ser validada pelo agente de Ciência.**

### 15. Projecção condicional

$$\hat y(t_0 + h) = \bar y + \hat\beta\,(t_0 + h - \bar t), \qquad \pm\; t_{n_{\text{ef}}-2,\,1-\alpha/2}\; s \sqrt{\frac{1}{n_{\text{ef}}} + \frac{(t_0+h-\bar t)^2}{\sum_t (t-\bar t)^2}}$$

**Como funciona:** prolonga a recta ajustada `h` meses para a frente; a banda cresce com `h`. Para **valores** (e não para a média da recta) acrescentar `+1` dentro da raiz; a spec decide qual das duas bandas se mostra e escreve-a explicitamente.
**Para quê:** "se a tendência continuar" (R11, W25). **Nunca é uma previsão do clima**; o rótulo é fixo, o horizonte é limitado na spec e a projecção esconde-se quando não há tendência significativa.
**Referência:** `statsmodels` ou cálculo manual comparado com `scipy`.

### 16. Tamanho de efeito para comparar variáveis (proposta)

$$d = \frac{\hat\beta \cdot T}{\sigma_y}$$

**Como funciona:** `T` é a duração do período em meses e `σ_y` o desvio-padrão das anomalias. `d` é a mudança total no período em unidades da variabilidade natural da série (sem unidades).
**Para quê:** ordenar variáveis de unidades diferentes em "O que está a mudar aqui?" (P31). **Proposta a validar**: pode haver uma medida melhor; a spec decide e justifica.

### 17. Tendência de uma estação do ano (meses escolhidos)

$$A_Y = \frac{1}{|M|}\sum_{m \in M} a(Y, m)$$

**Como funciona:** `M` é o conjunto de meses escolhidos (por exemplo Jun, Jul, Ago). Para cada ano `Y`, `A_Y` é a média das anomalias (fórmula 1) desses meses. Fica uma série de **um valor por ano** (cerca de 24 pontos de 2002 a 2025). Sobre ela aplicam-se, sem mudanças, Theil-Sen (3), Mann-Kendall com Hamed-Rao (4, 5), regressão e teste t (13, 14). O declive por década é o declive anual × 10 (e não × 120).
**Estações que atravessam o ano** (Dez a Fev): o "ano da estação" é o ano em que ela termina (Dez 2019 com Jan e Fev 2020 pertencem a 2020). Estações incompletas no início ou no fim da série ficam de fora; a regra para meses em falta fixa-se na SPEC-102.
**Para quê:** o vídeo diz que se podem identificar tendências numa estação (o exemplo é o AOD a subir nos verões do Wisconsin). Tirar a sazonalidade e analisar todos os meses juntos pode esconder uma tendência que só existe numa estação (R13).
**Cuidados:** com 10 a 25 pontos o teste tem pouco poder, e o ecrã diz isso. A fórmula 9 está escrita em meses; para a estação, `n` conta anos e a spec adapta-a. A correcção de Hamed-Rao com `n` pequeno é menos fiável e tem de ser validada. Cada conjunto de meses testado é uma comparação nova: contador de conjuntos testados na sessão, como no mapa (SPEC-130, ponto 9 do comportamento).
**Referência:** série sintética com tendência só em Jun a Ago: detecta-se com `M` = Jun a Ago e não com os 12 meses; com os 12 meses o resultado é igual ao da série anual normal. Medição de referência de custo em `04` (cerca de 0,02 s para 2 592 células com 24 pontos; não medida no hospedeiro real).

---

## Futuras (F1 a F5)

### F1. Vários índices naturais

$$y(t) = a + b\,t + \sum_{k}\sum_{l=0}^{L_k} c_{k,l}\, I_k(t-l) + \varepsilon(t)$$

É a fórmula 10 com mais colunas: cada índice `I_k` (NAO, IOD, PDO, além do Niño 3.4) com os seus atrasos. Só fica se melhorar a validação cruzada. Os índices têm de ser externos e sem tendência forçada. (P12 e extensão)

### F2. Ganho do ajuste e teste nulo

$$\Delta E = E_{\text{sem ajuste}} - E_{\text{com ajuste}}, \qquad \mathrm{FP} = \frac{\#\{\text{células marcadas}\}}{\#\{\text{células}\}}\ \text{em dados sem tendência}$$

`ΔE` mede quantos anos mais cedo emerge com o ajuste; `FP` mede falsos positivos num teste em dados onde sabemos que não há tendência. Queremos `ΔE` positivo sem `FP` a subir. Até medirmos em dados reais, o ganho é uma hipótese. (P13)

### F3. Média de uma região desenhada

$$\bar{x}_R(t) = \frac{\sum_{i \in R} w_i\, x_i(t)}{\sum_{i \in R} w_i}$$

É a fórmula 2 restrita às células da região `R`; sobre a série aplica-se a cadeia 1, 3 a 6, 13 a 15. (B08)

### F4. Projecção polar estereográfica (a confirmar)

$$\rho = 2R\tan\!\left(\frac{\pi}{4} - \frac{\varphi}{2}\right), \qquad x = \rho\sin(\lambda - \lambda_0), \qquad y = -\rho\cos(\lambda - \lambda_0)$$

Forma simplificada para o pólo norte. Os dados do NSIDC-0051 vêm em projecção polar; a fórmula exacta (incluindo o hemisfério e a grelha do produto) **tem de ser confirmada na documentação** antes de implementar. (P19)

### F5. Média mensal de grelhas de 5 dias

$$\bar{x}_{\text{mensal}} = \frac{1}{N_m} \sum_{d \in m} x_d$$

Média das `N_m` grelhas de 5 dias que caem no mês `m`. Necessária para o nível do mar. (P21)

---

## Limitações a dizer em voz alta

- O ano de emergência é **descritivo**: o ajuste ao ENSO usa o período completo, e a janela é escolhida olhando para o fim.
- "Quanto falta" é uma projecção condicional, não uma previsão.
- Theil-Sen e a regressão assumem tendência **monótona e linear**; séries que sobem e descem (aerossóis, por exemplo) são o contra-exemplo. O enunciado diz que tendências lineares são um bom começo.
- Mesmo com a correcção, o teste de Mann-Kendall tem uma taxa de falsos positivos perto de 10% neste tipo de ruído (medida nos dados sintéticos; a medir em dados reais).
- O MERRA-2 é uma reanálise, não uma medição directa.
- O mapa global a 5° é grosseiro para regiões pequenas.
- A tendência por estação usa um ponto por ano: pode faltar poder estatístico, e "não significativa" não quer dizer "sem tendência".
