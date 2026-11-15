# 00. Visão, decisões em aberto e pressupostos

## Visão em duas frases

**Terra Tempo** ajuda qualquer pessoa a perguntar "o que está a mudar aqui, quanto, e isso é mais do que ruído?" e responde com dados da NASA, com os números à vista e com a incerteza dita.

O produto tem **duas camadas**. A primeira é o que o desafio pede e tem de estar perfeita; a segunda é o que nos distingue.

| Camada | O que é | Se falhar |
| --- | --- | --- |
| **A. Detetive de Dados** | O utilizador escolhe **o quê, onde e quando** (incluindo meses ou estação do ano); recebe a série, a tendência, os testes, a frase e o "quanto falta" | O projecto não cumpre o desafio. **Não se corta nunca** |
| **B. Atlas e diferenciais** | Mapa global, Tempo de Emergência, fragilidade, pontos quentes, modos de público, modo apresentação, assistente, lente de Angola | O projecto continua válido, só menos distinto. Corta-se pela ordem do roteiro |

## O que mudou face ao plano anterior

| Antes | Agora | Porquê |
| --- | --- | --- |
| Atlas global para explorar | Percurso guiado em 3 perguntas, com o atlas como mapa de apoio | O enunciado pede um "detetive de dados" |
| Mann-Kendall e intervalo de Sen | Mann-Kendall **e** regressão linear com R², teste t e intervalo | O enunciado cita o teste t |
| Grelha global de 5° | Mapa global leve a 5° **e** série regional a resolução maior no backend | Regiões pequenas têm poucas células a 5° |
| Seis variáveis, quase todas sem leitor | Duas ou três reais primeiro; resto por camadas | Um leitor real vale mais do que cinco de demonstração |
| Só linguagem de cientista | Modos Criança, Explorador, Cientista (e Professor, opcional) | Público escolar e geral |
| Sem modo de apresentação | Time-lapse do mapa, também usado como demonstração | O enunciado quer exemplos "para assistir" |
| "Quantos anos faltam" | Mantém-se e ganha a projecção condicional na interface | R11 do enunciado |
| Versão em inglês como corte cedo | Inglês passa a obrigatório no pitch e na documentação | Júri internacional (confirmar) |
| Mapa só de tendências, fixo | Mapa interactivo em dois níveis: filtros pré-calculados (Must) e período livre recalculado (Should) | Acessibilidade e exploração são diferenciais; a medição mostra que recalcular cabe no servidor |
| Português e inglês | Cinco idiomas: pt, en, es, fr e mandarim | Alcance para todos |

## Decisões em aberto

Cada decisão tem uma proposta. Decide quem vai manter o código; os agentes só implementam depois.

| ID | Decisão | Opções | Inclinação (a rever) |
| --- | --- | --- | --- |
| D1 | Nome | "Terra Tempo" com o modo "Detetive de Dados", ou "EarthTrend Detective" | O primeiro: o nome já existe e o "detetive" fica como modo |
| D2 | Stack do site | Next.js + Leaflet (proposta de um colega); TanStack Start + d3-geo (usada nas versões anteriores); MapLibre | A stack que a equipa **domina**. Pela interacção (clicar e desenhar regiões), Next.js na Vercel + Leaflet, com as células em canvas |
| D3 | Framework do backend | FastAPI ou Django Ninja | Ambos servem e geram OpenAPI. Decide quem vai mantê-lo; FastAPI é mais leve para uma API só de leitura e cálculo |
| D4 | Hospedeiro do backend | **2 vCPU e 1 GB de RAM por instância, várias instâncias possíveis** (dado pela equipa) | Medir o tempo do recálculo do mapa no hospedeiro real antes de fixar o limiar da SPEC-130; ver `04` |
| D5 | Resolução | 5° global + 1° ou 2° regional (ver `03`) | 5° para o mapa, 2° se o hospedeiro for pequeno, 1° se couber |
| D6 | Período | Do primeiro mês comum até ao último ano completo | Fixar na spec depois de confirmar os dados; mínimo de 10 anos |
| D7 | Variáveis reais do MVP | Temperatura, precipitação; humidade do ar (mesmo ficheiro do MERRA-2, a confirmar) | Estas três |
| D8 | Idiomas | pt, en, es, fr e mandarim (chinês simplificado, a confirmar) | Todos no produto, por catálogo de chaves (SPEC-140). pt e en completos e revistos primeiro; os outros com estado de revisão visível. Inglês **obrigatório** no pitch e README. Confirmar o idioma da submissão |
| D9 | Papel da IA | 1) modelo ao ENSO, 2) mapear a pergunta em variáveis, 3) explicar o resultado, 4) conversa livre | 1, 2 e 3 no MVP; 4 só se sobrar tempo |
| D10 | Modo Criança e Professor | Faixa etária, quem revê os textos e se o modo Professor entra | Fixar com quem ensina; o texto é por modelos fixos, sem IA livre |
| D11 | Código anterior | Reconstruir do zero, ou usar como referência | Depende das regras (ver abaixo) |
| D12 | Interactividade do mapa | Só pré-calculado; pré-calculado com filtros; mais período livre recalculado | Os dois níveis da SPEC-130; o período livre é um dos primeiros cortes se o tempo apertar (ordem em `07`) |
| D13 | Variável do exemplo do vídeo (AOD, aerossóis) | MERRA-2 (colecção de aerossóis, a confirmar) ou MODIS no Aqua (HDF4) | MERRA-2 primeiro; MODIS só se o leitor não atrasar. Decidir depois de P00 e dizê-lo no ecrã |

## Pressupostos

- O desenvolvimento só começa quando o hackathon começar. Antes disso, só preparação: contas, ambiente e leitura das regras.
- O código das versões anteriores (v1 a v5) foi escrito **antes** do evento. Se as regras exigirem trabalho novo, este plano reconstrói a partir das specs e usa o código antigo, no máximo, como referência de testes e só se for permitido. **Não foi verificado.**
- Assumimos um hackathon de **cerca de 48 horas** (um colega referiu "MVP para 48 horas"). Se for diferente, as fases e os gates mantêm-se e só muda a duração (ver `07`).
- A equipa tem subscrição Claude. **A subscrição não cobre chamadas pela API**; qualquer função que chame o modelo a partir do site precisa de uma chave de API com facturação à parte e um tecto de custo.
- O site fica na Vercel; o backend fica noutro hospedeiro, por escolher.

## Antes do arranque (preparação, sem escrever código do projecto)

- [ ] Ler as regras sobre trabalho prévio e uso de IA; copiar a resposta para este ficheiro.
- [ ] Confirmar hora de arranque, duração, hora de entrega, idioma e itens obrigatórios da submissão.
- [ ] Criar conta Earthdata e testar o início de sessão. Credenciais só como segredos, nunca no código.
- [ ] Repositório GitHub novo e vazio, com o ramo principal protegido.
- [ ] Projecto Vercel ligado ao repositório.
- [ ] Escolher o hospedeiro do backend e confirmar os limites do plano gratuito.
- [ ] Criar uma chave do Groq ou do OpenRouter (planos gratuitos) para o assistente, guardada como segredo na Railway.
- [ ] Atribuir um responsável humano a cada papel (`06-agentes-e-processo.md`).
- [ ] Acordar o tecto de custo dos agentes por fase.

## Princípios de honestidade (valem para todo o produto)

1. Dados de demonstração têm rótulo visível em cada ecrã; nenhum resultado aparece como real sem prova.
2. Mostramos o que **não** sabemos: variáveis sem leitor, limitações do método, resultados fracos.
3. Nunca explicamos causas. Dizemos onde, quanto e se é significativo.
4. A "projecção" é condicional ("se a tendência continuar"), nunca uma previsão do clima.
5. Cada número que aparece numa frase vem de um cálculo; nada é escrito à mão.
