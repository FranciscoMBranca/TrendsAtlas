# R0 (W41): proposta de limiar do teste visual

**Proposta (não fixada):** por secção e por largura, o teste passa se

1. as **dimensões** da captura forem iguais às da referência (largura e altura em píxeis), e
2. a fracção de píxeis diferentes for **≤ 0,5 %**, medida com `pixelmatch` (`threshold: 0.1`, `includeAA: false`),

com animações desligadas, `deviceScaleFactor: 1`, `reducedMotion: "reduce"`, tipos de letra carregados (`document.fonts.ready`) e o cabeçalho fixo tornado estático durante a captura.

O plano propunha 1,5 %. A medição abaixo mostra que **1,5 % deixa passar uma troca de tipo de letra** (secção Onde a 1280 px: 1,4987 %) e 13 dos 24 desvios de 1 px no texto.

## Medição

Scripts: `tests/visual/capture.mjs` (captura) e `tests/visual/measure.mjs` (comparação). Máquina: Windows 10, Chromium do Playwright 1.65 em modo headless, rede normal. Alvo: https://terra-tempo.vercel.app a 2026-11-14.

Três comparações contra `tests/visual/referencia/`:

- **Ruído:** uma segunda captura igual, logo a seguir. Mede a instabilidade do próprio teste.
- **Sem fontes:** a mesma página com o Google Fonts bloqueado (os tipos de letra caem para Georgia e as fontes do sistema). Representa "tipo de letra errado": deve falhar.
- **Desvio de 1 px:** `section h1, h2, h3, p, span { position: relative; left: 1px }`. Representa um erro mínimo de alinhamento do texto.

| Captura | Ruído | Sem fontes | Desvio de 1 px |
| --- | --- | --- | --- |
| abertura-1280 | 0 % | 4,7153 % | 0,9032 % |
| abertura-375 | 0 % | altura: 809 vs 833 | 2,1232 % |
| abertura-768 | 0 % | 6,4557 % | 1,4652 % |
| cabecalho-1280 | 0,0017 % | 3,4667 % | 0 % (o desvio só toca `section`) |
| cabecalho-375 | 0 % | 5,3931 % | 0 % |
| cabecalho-768 | 0 % | 4,8093 % | 0 % |
| metodo-1280 | 0,0044 % | 4,5149 % | 1,8968 % |
| metodo-375 | 0 % | altura: 1793 vs 1794 | 3,1901 % |
| metodo-768 | 0 % | altura: 1345 vs 1346 | 2,0592 % |
| o-que-1280 | 0 % | 2,8932 % | 1,3342 % |
| o-que-375 | 0 % | altura: 764 vs 765 | 2,4479 % |
| o-que-768 | 0 % | altura: 728 vs 727 | 1,3434 % |
| onde-1280 | 0 % | **1,4987 %** | 0,7407 % |
| onde-375 | 0 % | altura: 1103 vs 1102 | 2,3458 % |
| onde-768 | 0 % | 3,363 % | 1,3526 % |
| panorama-1280 | 0 % | altura: 812 vs 833 | 1,1217 % |
| panorama-375 | 0 % | 6,3138 % | 1,7934 % |
| panorama-768 | 0 % | altura: 919 vs 862 | 1,6545 % |
| quando-1280 | 0 % | altura: 1527 vs 1535 | 0,8351 % |
| quando-375 | 0,0113 % | altura: 1777 vs 1760 | 2,4694 % |
| quando-768 | 0 % | altura: 1554 vs 1540 | 1,3562 % |
| regioes-1280 | 0,0008 % | altura: 1390 vs 1392 | 1,2616 % |
| regioes-375 | 0 % | altura: 2473 vs 2477 | 2,4745 % |
| regioes-768 | 0 % | altura: 2168 vs 2216 | 1,3385 % |
| significativo-1280 | 0,0054 % | 2,893 % | 1,0853 % |
| significativo-375 | 0 % | altura: 1494 vs 1514 | 2,2327 % |
| significativo-768 | 0 % | 3,3533 % | 1,1865 % |

Resumo:

- Ruído máximo: **0,0113 %** (quando-375). Com 0,5 % a margem sobre o ruído é de cerca de 44 vezes.
- Troca de tipo de letra: 1,50 % a 6,46 %, ou altura diferente. O limiar de 0,5 % apanha todos os casos; 1,5 % deixa passar um.
- Desvio de 1 px no texto: 0,74 % a 3,19 %. O limiar de 0,5 % apanha todos; 1,5 % deixa passar 13 das 24 capturas de secção.

Dados em bruto: `tests/visual/extraido/medicao*.json`.

## Limitações da medição (por isso é proposta)

1. **Mesma máquina e mesmo sistema.** Não foi medido o ruído entre Windows (onde se fizeram as referências) e o Linux do CI. A rasterização das letras muda entre sistemas: as referências devem ser geradas **no mesmo ambiente** onde o teste corre (por exemplo, a imagem Docker do Playwright no CI), e o ruído medido de novo aí.
2. **Tipos de letra locais (P7 em `divergencias.md`).** Se a nova versão servir os mesmos ficheiros woff2 localmente, a diferença deve ser perto de zero; medir na R1 antes de fixar.
3. **Dados.** O mapa, os gráficos e os números dependem dos dados. A referência é a do protótipo com dados sintéticos; quando os dados reais entrarem, estas secções mudam e precisam de nova referência ou de comparar só a estrutura.
4. **Divergências permitidas.** Selector de idioma, rótulos e texto mínimo de 12 px (se aprovados) mudam a página. Essas zonas precisam de máscara ou de referência nova.
5. **Dimensões iguais** é exigente: um desvio de 1 px na altura de uma secção falha. Alternativa a decidir: tolerância de ±2 px na altura, com a comparação de píxeis feita na parte comum.
