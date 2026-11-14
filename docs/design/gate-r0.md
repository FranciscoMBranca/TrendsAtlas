# Gate R0 (W41): inventário e referência do protótipo

Ramo `feat/W41-inventario-prototipo`. Feito a 2026-11-14. **Nenhum componente novo foi escrito; a Fase 0 não foi alterada.**

## Checklist

- [x] Pilha do protótipo e da Fase 0 registada, com as colisões listadas → [pilha-e-colisoes.md](pilha-e-colisoes.md)
- [x] Capturas das 8 âncoras em 375, 768 e 1280 px em `tests/visual/referencia/` (24 capturas + 3 do cabeçalho; nenhuma âncora em falta)
- [x] `tokens.md` com valores exactos e origem → [tokens.md](tokens.md)
- [x] `inventario-componentes.md` → [inventario-componentes.md](inventario-componentes.md) (hover e erro de cada ficheiro marcados como não verificados)
- [x] `inventario-dados.md` com a origem e o rótulo de cada número → [inventario-dados.md](inventario-dados.md) (uma origem "desconhecida": média de 12 meses e recta do gráfico de #o-que; fonte e licença de `land.json` desconhecidas)
- [x] `textos-pt.md` com os [REVER] marcados → [textos-pt.md](textos-pt.md) (24 marcas: 10 nos textos por variável e modelos, 14 nos textos capturados)
- [x] `divergencias.md` → [divergencias.md](divergencias.md) (13 divergências propostas, 12 problemas de honestidade, 6 de acessibilidade)
- [x] Limiar visual proposto, com medição → [limiar-visual.md](limiar-visual.md) (proposta: dimensões iguais e ≤ 0,5 %)
- [ ] **Testes, linter, tipos e análise de segredos a passar.** Localmente sim: pipeline 34 testes, API 8, site 4, `tsc` sem erros; nenhum padrão de segredo nos ficheiros novos. **No CI não:** o job `python` do `main` já falha antes deste ramo (`api/requirements.txt` tem `-e ../pipeline`, relativo à pasta errada). Corrigir isso é alterar a Fase 0, que esta tarefa proíbe. Não há linter na Fase 0.
- [x] Lista de decisões para um humano → abaixo

## Decisões que precisam de um humano

1. **Pilha (D2).** O protótipo é TanStack Start + Tailwind 4 + d3-geo (Equal Earth) + Recharts + bun; a Fase 0 é Next.js + Leaflet + CSS simples + npm. Opções e consequências em `pilha-e-colisoes.md`, secção 4. Sem esta decisão não se começa a R1.
2. **Repositório.** O protótipo vive em `FranciscoMBranca/terra-tempo` e a Fase 0 em `FranciscoMBranca/TrendsAtlas`. Decidir qual fica como repositório do projecto e o que acontece ao outro.
3. **Pacote Python.** Dois pacotes `terratempo` diferentes (o do protótipo tem leitor IMERG e emergência; o da Fase 0 tem as fórmulas 13, 14, 17 e a API). Decidir como se fundem.
4. **Limiar visual.** Proposta: dimensões iguais e ≤ 0,5 % de píxeis diferentes por secção e largura. Alternativas: 1,5 % (o plano; deixa passar uma troca de tipo de letra) ou tolerância de ±2 px na altura. E onde se geram as referências (Windows local ou CI Linux).
5. **Divergências a aceitar.** Cada linha P1 a P13 de `divergencias.md`, em especial P2 (rótulo DEMONSTRAÇÃO em cada secção), P8 (texto mínimo de 12 px) e P12 (escala fixa do mapa).
6. **Textos [REVER].** Cada uma das 24 marcas em `textos-pt.md`: mudar, retirar ou manter. As mais graves: o título da abertura (E1), o rodapé IMERG (E4) e os nomes de lugares reais com tendências inventadas (E5).
7. **Onde fica o resultado do Detetive** (fim de "Quando" ou vista própria). O protótipo não tem esta vista.
8. **"Metade"** com dois significados (Panorama 2020 e Quando 2018): escolher um conceito ou dois nomes.
9. **Grafia** do catálogo pt: anterior ou posterior ao Acordo Ortográfico de 1990 (o protótipo e o plano usam a anterior).
10. **CI da Fase 0 a falhar:** autorizar uma correcção à parte (uma linha em `.github/workflows/ci.yml` ou em `api/requirements.txt`).

## O que não foi verificado

- Hover, erro de rede por ficheiro e ordem de tabulação completa.
- Leitor de ecrã real e axe.
- Ruído do teste visual entre sistemas operativos (só medido em Windows).
- Os textos e números das outras 5 variáveis na página (só os de `meta.json` e `variables.json`; as capturas usam a temperatura).
- A média de 12 meses e a recta do gráfico de #o-que: se vêm do ficheiro ou do browser.
