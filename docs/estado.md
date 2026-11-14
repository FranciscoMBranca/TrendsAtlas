# Estado do desenvolvimento

Actualizado: 2026-11-14.

## Decisões tomadas para arrancar (seguem as "inclinações" de `00`; a equipa pode revê-las)

| ID | Escolha | Nota |
| --- | --- | --- |
| D1 | Terra Tempo, com o modo Detetive de Dados | Repositório chama-se TrendsAtlas |
| D2 | Next.js 15 + Leaflet (células em canvas) | Gráficos em SVG próprio, sem biblioteca |
| D3 | FastAPI | OpenAPI automático em `/docs` |
| D5 | 5° para mapa e regiões, por agora | Os cubos a 1° ou 2° chegam com os leitores reais |
| D8 | pt e en primeiro | es, fr e zh por fazer (W33 a W35) |

## Propostas no código que precisam de aprovação humana

- `MAX_YEARS_REMAINING = 50` (`pipeline/terratempo/analysis.py`): acima disto o selo é "Sem tendência clara" em vez de "Ainda não significativa". O plano não define a fronteira.
- `FEW_POINTS_YEARS = 15` (SPEC-102, ponto 8, já marcado como proposta).
- Estação só entra com todos os meses presentes (SPEC-102, ponto 4).
- Teste t: correcção de autocorrelação com `n_ef` aplicada à variância dos resíduos e aos graus de liberdade (Santer et al. 2000). Só alarga o intervalo; sem autocorrelação é igual a `scipy.stats.linregress`. Validar (agente de Ciência).
- Escala de cores fixa por variável (`web/lib/colour.ts`).

## Feito (IDs do backlog)

P05, P06 (5°), P07, P08, P10, P11, P22, P29, P34, P36; B01, B03, B04, B05, B08, B10 (parcial); W01 a W04, W06 a W08, W20, W30, W32, W37, W38, W40, W16 e W17 (parciais); D01, D02, D04.

## Ainda não verificado

- Nenhum dado real da NASA: **tudo é DEMONSTRAÇÃO**.
- Modo degradado só testado no código (a API em baixo desliga a análise); falta teste Playwright.
- Deploy (Vercel e hospedeiro da API) por fazer.

## Próximos passos (Fase 1, Gate 1)

1. P00: fichas de produto de `M2TMNXSLV` e `GPM_3IMERGM` a partir do catálogo oficial; descarregar um ficheiro real de cada (conta Earthdata).
2. P02 e P03: leitores reais com testes; substituir `make_dataset` por variável em `terratempo/export.py`.
3. Deploy: Vercel (raiz `web/`) e hospedeiro da API (D4), com `ALLOWED_ORIGINS` e `NEXT_PUBLIC_API_URL`.
4. Protecção do ramo `main` (D03) e licença de código aberto (D08): decisões da equipa.
