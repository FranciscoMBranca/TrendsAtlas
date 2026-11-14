# Terra Tempo: plano de desenvolvimento (v7 = v6 + estação do ano, mundo inteiro, AOD e regra do valor-p)

Plano em ficheiros `.md` para construir o Terra Tempo durante o hackathon, com agentes de IA. Alinhado com o enunciado "Earth system trends" e com as ideias dos colegas (Detetive de Dados, modos de público, modo apresentação).

## Ordem de leitura
1. `docs/00-visao-e-decisoes.md`: visão, decisões D1 a D11, pressupostos, preparação.
2. `docs/01-alinhamento-com-o-desafio.md`: requisitos R1 a R12, recursos da NASA, o que adoptámos das sugestões.
3. `docs/02-produto-e-experiencia.md`: o que o utilizador vê.
4. `docs/03-variaveis-e-dados.md`: variáveis, resoluções, período.
5. `docs/04-arquitectura.md`: pipeline, API, site, segurança.
6. `docs/05-metodo-e-formulas.md`: fórmulas usadas, novas e futuras.
7. `docs/06-agentes-e-processo.md`: 10 agentes e o ciclo spec-to-code.
8. `docs/07-roteiro-e-gates.md`: fases, gates, ordem de corte.
9. `docs/08-backlog.md`: todos os itens com prioridade.
10. `docs/09-qualidade-riscos-e-pitch.md`: testes, riscos, pitch.
11. `docs/10-mescla-com-o-pacote-anterior.md`: onde está cada ficheiro do pacote anterior e onde divergimos.
12. `docs/11-publicos-premios-e-impacto.md`: personas, prémios (a confirmar) e honestidade no pitch.

## Pastas
- `specs/`: modelo de spec e sete exemplos (SPEC-014, 101, 102, 110, 120, 130, 140).
- `templates/`: `CLAUDE.md`, prompt de tarefa, lista de verificação e `agentes/` (10 ficheiros para `.claude/agents/`).

## O que mudou na v7 (a partir do vídeo de descrição do desafio)
- **Tendência por estação do ano** (R13, fórmula 17, SPEC-102, P36, W37): meses escolhidos, um valor por ano.
- **"Mundo inteiro" e país ou estado por nome** na pergunta 2 (R14, W38, W39, P37).
- **Aerossóis (AOD)** sobem a Should (R15, P18, D13) para reproduzir o exemplo do vídeo e verificá-lo no Giovanni (P28).
- **Regra do valor-p** visível junto ao selo e diferença para o FDR do mapa explicada (R16, W40).
- **Variáveis extra** citadas no vídeo, em Could (R17, P38).
- `terra-tempo-acompanhamento.xlsx` **não foi alterado**: acrescentar à mão as linhas P36 a P38 e W37 a W40, e mudar P18 para S (ver lista na resposta de entrega).

## O que mudou na v6
- **Mapa interactivo em dois níveis** (SPEC-130): filtros pré-calculados que funcionam sem API (variável, período predefinido, ENSO, só significativas) e período livre recalculado na API, com cache e recurso aos predefinidos.
- **Cinco idiomas** (SPEC-140): pt, en, es, fr e mandarim (chinês simplificado, a confirmar). A API devolve chaves, não frases.
- **Acessibilidade para todos** (idade, nível académico, lugar): preferências de leitura, modo leve promovido a Should, testes com pessoas.
- **Servidor:** 2 vCPU e 1 GB de RAM por instância, com várias instâncias possíveis (`04`).
- Planilha de acompanhamento e de distribuição de tarefas: `terra-tempo-acompanhamento.xlsx`.

## Como começar no arranque
1. Preencher a lista de preparação de `docs/00` e decidir D1 a D11.
2. Copiar `templates/CLAUDE.md` para a raiz e `templates/agentes/*` para `.claude/agents/`.
3. Fase 0: `docs/07` (contratos, P00, CI).

## O que NÃO está verificado
- Nomes de produtos, versões e campos de dados (só dois foram usados em código, com ficheiros falsos).
- Regras do hackathon (duração, trabalho prévio, uso de IA, idioma). Assumidas 48 h.
- Limites dos hospedeiros gratuitos do backend.
- As ligações dos recursos da NASA não foram abertas; usar o enunciado como fonte.
- Fórmulas 14 a 16 e F4 precisam de validação.
- A subscrição Claude não cobre chamadas pela API.
