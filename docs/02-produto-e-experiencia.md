# 02. Produto e experiência

Este ficheiro descreve o que o utilizador vê e faz. Cada funcionalidade tem um ID do backlog (`08-backlog.md`) e, quando é complexa, uma spec (`../specs/`).

## 1. O percurso principal: Detetive de Dados (Camada A)

Três perguntas, um resultado. O utilizador nunca vê mais do que uma pergunta de cada vez (W20).

### Pergunta 1: o que quer investigar?

- Escolha por temas: temperatura, chuva, humidade, vegetação, ar e poluição, água (só aparecem as variáveis que têm dados reais ou, com rótulo, de demonstração).
- Ou uma frase livre ("quero ver a chuva em Benguela"). Um mapeador **determinístico** (palavras-chave e sinónimos) propõe a variável; com IA, só se D9 o permitir (B16).
- Cada variável mostra uma **definição simples** (W27) e de onde vêm os dados.

### Pergunta 2: onde?

- Clicar numa célula do mapa, desenhar um rectângulo ou um polígono, ou escolher uma **região-exemplo** (deserto, floresta tropical, estuário, cidade; P30).
- **Mundo inteiro**: botão visível ao lado das outras formas; usa a série global, com média pesada por cos(latitude) (W38).
- **País ou estado/província por nome**: a escolha vira um polígono (W39). A fonte e a licença dos limites estão por confirmar (P37).
- Se a região for mais pequena do que a resolução disponível, avisar e dizer qual é a resolução usada.

### Pergunta 3: em que período?

- Por defeito, todo o período disponível. O mínimo é de 10 anos, porque o método precisa de série longa (R3).
- **Meses ou estação (opcional, W37):** por defeito, todos os meses. O utilizador pode escolher os meses (atalhos: Dez a Fev, Mar a Mai, Jun a Ago, Set a Nov, e "escolher meses"). Os atalhos usam **meses e não "verão"**, porque a estação depende do hemisfério (em Angola não coincide com a europeia). Com meses escolhidos, a série passa a ter um valor por ano (fórmula 17, SPEC-102) e o mínimo de 10 anos conta anos com a estação completa. O ecrã avisa que há poucos pontos.

### O resultado, num só ecrã (R6)

| Bloco | Conteúdo |
| --- | --- |
| Frase | Em linguagem do modo escolhido: "A temperatura subiu, em média, X por década nesta região" |
| Gráfico | Série mensal (anomalias), linha de tendência e banda de incerteza |
| Tabela | Declive por década (Theil-Sen e regressão), intervalo de confiança, valor-p de Mann-Kendall, valor-p do teste t, R², n de meses |
| Selo | **Significativa**, **Ainda não significativa**, **Sem tendência clara** ou **Dados insuficientes** |
| Regra do valor-p | Texto fixo junto ao selo: "Valor-p abaixo de 0,05: a tendência é estatisticamente significativa. Acima de 0,05: não quer dizer que não haja tendência; pode faltar tempo." (W40) |
| Quanto falta | Se não é significativa: "faltam cerca de N anos se a tendência continuar" (R11) |
| Projecção | Opcional: "se a tendência continuar, em 20XX..." com banda e aviso (W25) |
| Exportar | CSV da série e imagem do gráfico, para trabalhos escolares |

**Regras de texto do resultado:**

- Se Mann-Kendall e o teste t **discordam**, o selo é "Resultado dividido" e explicamos em uma linha.
- Nunca dizer "causa", "devido a" nem "por culpa de".
- Nunca escrever um número que não venha da análise.
- Com meses escolhidos, a frase diz quais ("nos meses de Jun a Ago") e que há um valor por ano.
- "Mais depressa do que a média global" só aparece se esse número foi calculado nos mesmos dados.

## 2. "O que está a mudar aqui?" (P31, B14)

Depois de escolher uma região, um botão corre **todas as variáveis com dados reais** nessa região e mostra uma tabela ordenada: variável, tendência por década, significância e um tamanho de efeito (fórmula 16) para poder comparar variáveis com unidades diferentes. É a frase "escolha qualquer lugar do planeta e descubra o que muda" posta em prática.

## 3. Modos de público (W21)

Um selector no topo muda a linguagem e o que se mostra. Os **números são sempre os mesmos**; muda a forma de os dizer.

| Modo | Para quem | Linguagem | O que mostra | O que esconde |
| --- | --- | --- | --- | --- |
| **Criança** | Crianças (faixa etária a fixar, D10) | Frases curtas, comparações do dia a dia, ilustrações | Seta para cima ou para baixo, "mais" ou "menos", o mapa a mudar | Valores-p, fórmulas, intervalos |
| **Explorador** | Público geral, ensino secundário e universitário | Termos científicos com explicação ao lado | Gráfico completo, tabela, selo, glossário | Detalhes de método avançados |
| **Cientista** | Quem quer verificar | Termos exactos | Tudo, incluindo fragilidade, validação e ligação à página "Como funciona" | Nada |
| **Professor** (opcional, W29) | Quem ensina | Como o Explorador, com notas de aula | Percursos guiados prontos e ficha de actividade exportável | Nada |

**Regras para o modo Criança:**

- Os textos vêm de **modelos fixos**, escritos por pessoas e revistos por alguém que ensina. A IA livre não escreve para crianças.
- Tom curioso e esperançoso, mas **honesto**: não esconder que algo mudou, nem exagerar. Sem linguagem alarmista.
- Sem causas e sem previsões do futuro; só "se continuar assim".
- Ilustrações simples e personagens próprios; nada copiado de marcas ou desenhos conhecidos.

## 4. Modo apresentação (W22)

Um modo de ecrã inteiro que **reproduz a mudança no mapa ao longo dos anos**, como um vídeo curto, com legendas.

- Controlos: reproduzir e pausar, velocidade, arrastar o ano.
- O mapa mostra quanto cada ano se afastou do normal (anomalia anual); a legenda explica as cores.
- Duas utilizações: ensino (o "exemplo demonstrativo" do enunciado) e a nossa demonstração no pitch, que funciona sem internet porque lê dados já descarregados.
- Há **exemplos guiados** prontos (W24): três percursos de 30 segundos, por exemplo "o que aconteceu à chuva neste deserto?". Só usam dados reais.

Spec: `../specs/SPEC-110-modo-apresentacao.md`.

## 5. Tocar numa área (W23)

Ao tocar ou clicar numa célula ou região aparece um cartão com: valor médio, tendência por década, selo de significância, mini-gráfico e a frase no modo escolhido. Um botão abre o resultado completo do Detetive para essa área.

## 6. Projecção condicional (P32, W25)

- Mostra o que aconteceria **se** a tendência linear observada continuasse, com banda de incerteza que **cresce** com o horizonte.
- Rótulo fixo: "Isto não é uma previsão do clima".
- O horizonte máximo e a regra para esconder a projecção (tendência não significativa, série curta) ficam na spec.

Spec: `../specs/SPEC-120-projeccao-condicional.md`.

## 7. Funcionalidades do atlas (Camada B)

| Funcionalidade | O que mostra | Item |
| --- | --- | --- |
| Mapa global interactivo de tendências | Cores por célula; responde aos filtros (ver abaixo); células significativas marcadas | W03, W30, W31 |
| Tempo de Emergência | "Desde quando a tendência se distingue do ruído", e quantos anos faltam | W05, P09, P10 |
| Fragilidade | Células esbatidas quando o resultado muda ao mudar o início, o método ou o ajuste ao ENSO | W10, P15 |
| Pontos quentes compostos | Onde várias variáveis emergem ao mesmo tempo | W11, P16 |
| "A previsão acertou?" | Ano previsto contra ano real, no teste retrospectivo | W09, P14 |
| Concordância entre produtos | Onde dois conjuntos de dados de temperatura concordam ou não | W12, P17 |
| Lente de Angola | Duas ou três histórias locais, só com dados reais | W15 |
| Pergunta ao atlas | Conversa que só cita números das ferramentas | B11, W14 |

## 8. Mapa interactivo, alcance e acessibilidade

### Filtros do mapa (SPEC-130)

| Filtro | Nível | Como funciona | Prioridade |
| --- | --- | --- | --- |
| Variável | 1 | Troca a camada | Must |
| Período predefinido (completo, últimos 20 anos, últimos 10 anos; a fixar) | 1 | Ficheiros pré-calculados; funciona **sem API** | Must |
| Só significativas | 1 | Esbate as células sem tendência clara, no navegador; não muda nenhum número | Must |
| Ajuste ao ENSO (ligado ou desligado) | 1 | Dois ficheiros pré-calculados por variável (depende de P12) | Should |
| Período livre (início e fim, mínimo 10 anos) | 2 | Recalculado na API, com FDR a cada pedido, cache e aviso de comparações múltiplas | Should |

A **escala de cores é fixa** entre filtros, para dois períodos se poderem comparar à vista. No mapa, "significativa" usa o controlo de falsas descobertas (q = 0,10), porque se testam milhares de células; no resultado de uma região usa-se p < 0,05. O site explica a diferença num texto curto (W40). Se a API estiver indisponível ou ocupada, o nível 2 desactiva-se e o site oferece os períodos predefinidos.

### Alcance: idade, nível académico e lugar

| Quem | O que faz o produto |
| --- | --- |
| Crianças, pessoas mais velhas | Modos de público (Criança, Explorador, Cientista), texto grande, setas e palavras simples, linguagem sem jargão por defeito |
| Pouca escolaridade ou sem formação científica | Glossário (W27), exemplos guiados, "o que isto quer dizer" em cada resultado, números sempre com a unidade |
| Especialistas | Modo Cientista com valores-p, intervalos e método |
| Ligação lenta ou dados móveis caros | **Modo leve (W26, passa a Should)**: sem animações pesadas, ficheiros pequenos, PWA que continua a abrir sem rede |
| Telemóvel pequeno | Desenho para ecrã estreito primeiro; toque, não só rato |
| Visão, motricidade, leitura | Contraste, paletas para daltonismo, tamanho de texto ajustável, movimento reduzido, uso só com teclado, leitor de ecrã, **descrição em texto de cada mapa** (W17, W36) |
| Outra língua | Cinco idiomas (SPEC-140) |

- **Modo leve** (W26): carrega só o necessário e funciona com ligações lentas e dados móveis caros. Os ficheiros de dados do mapa global são pequenos e vêm em cache.
- Preferências de leitura guardadas no navegador (W36): tamanho de texto, contraste, paleta, movimento reduzido. Sem dados pessoais.
- Idiomas: pt, en, es, fr e mandarim (W16, W32 a W35, SPEC-140).

## 9. Ecrãs

1. Início (a pergunta e o botão "Começar").
2. Pergunta 1: o quê.
3. Pergunta 2: onde (mapa).
4. Pergunta 3: quando.
5. Resultado (com "O que está a mudar aqui?" e a projecção).
6. Atlas (mapa global, Tempo de Emergência, camadas de diferenciais).
7. Modo apresentação.
8. Como funciona (método, fórmulas simples, limitações, fontes e citações).
9. Glossário.
10. Assistente (se existir).
