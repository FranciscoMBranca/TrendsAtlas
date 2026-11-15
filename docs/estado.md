# Estado do desenvolvimento

Actualizado: 2026-11-14 (segunda actualização). Prioridade: concluir o desafio depressa; os gates passam a ser registados aqui em vez de bloquearem o trabalho.

## Decisões tomadas (podem ser revistas)

| ID | Escolha | Nota |
| --- | --- | --- |
| D1 | Terra Tempo, com o modo Detetive de Dados; título do site "Atlas de Tendências" (do protótipo) | Repositório TrendsAtlas |
| D2 | **Next.js 15 da Fase 0 com o código do protótipo portado** (d3-geo Equal Earth, Recharts, Tailwind 4, TanStack Query). Leaflet saiu. | Mantém CI, npm, API e testes; o visual fica igual ao protótipo. Medição contra as referências da R0: 0,13–1,0 % na maioria das secções, até 2,6 % (Método) por desvio de meio píxel nas letras; ver abaixo |
| D3 | FastAPI | OpenAPI automático em `/docs` |
| D5 | 5° para mapa e regiões | |
| D8 | pt e en na secção Investigue; resto do atlas só em pt por agora | Extrair os textos do atlas para o catálogo (W44) é o passo seguinte de idiomas |
| R4 | O resultado do Detetive fica numa secção própria, **Investigue** (`#investigar`), a seguir a "Quando" | Ligada à API; meses, mundo inteiro, regiões do atlas e rectângulo |
| — | Tipos de letra servidos pelo próprio site (`next/font`), sem Google Fonts em tempo de execução | Divergência P7 da R0 |

## Feito nesta ronda

- **CI corrigido**: o `pip install` falhava porque `api/requirements.txt` tinha `-e ../pipeline`. Agora o pipeline instala-se à parte. CI verde no commit `fad98b5`.
- **R0 junta ao main** (`docs/design/`, `tests/visual/`).
- **Front-end do protótipo portado para `web/`** (componentes, estilos, dados de `public/data/<variável>/`, 139 testes do protótipo a passar em Vitest).
- **Secção Investigue** (SPEC-101/102) no estilo do protótipo, com troca pt/en sem recarregar, rótulo DEMONSTRAÇÃO, regra do valor-p, "quanto falta", tabela, gráfico e CSV. Teste de ponta a ponta: `tests/visual/investigar.mjs`.
- **Textos corrigidos da R0**: E4 (rodapé deixou de citar o IMERG para todas as variáveis) e E6 (região não significativa: "ainda não se distingue do acaso… pode faltar tempo").
- **Leitores reais** (P02, P03): `pipeline/terratempo/readers.py` (IMERG HDF5 e MERRA-2 NetCDF4, agregação a 5° com peso cos(latitude)) e `pipeline/terratempo/ingest.py` (descarga com `earthaccess` + cubo `data/cubes/<variável>.npz` com rótulo `real` e citação). A API e a exportação usam o cubo real quando existe. Testados **só com ficheiros falsos** que imitam o formato.

## O que falta para concluir (por ordem)

1. **Dados reais (Gate 1)**: correr a ingestão com a sua conta Earthdata (as credenciais nunca vão para o código):
   ```bash
   .venv/Scripts/python -m pip install -e "./pipeline[nasa]"
   cd pipeline
   ../.venv/Scripts/python -m terratempo.ingest --variable precipitacao --start 2000-01 --end 2025-12
   ../.venv/Scripts/python -m terratempo.ingest --variable temperatura --start 2000-01 --end 2025-12
   ../.venv/Scripts/python -m terratempo.ingest --variable humidade --skip-download
   ../.venv/Scripts/python -m terratempo.export --out ../web/public/data
   ```
   Depois: confirmar nomes de campos e unidades no primeiro ficheiro real (P00) e gerar os ficheiros do atlas (`public/data/<variável>/`) a partir dos cubos reais (hoje vêm do pipeline do protótipo, sintéticos).
2. **Coerência dos dados de demonstração**: o atlas (dados do protótipo) e a secção Investigue (API, sintético da Fase 0) usam conjuntos sintéticos diferentes. Com dados reais passam a ser os mesmos.
3. **Deploy**: Vercel com raiz `web/` e `NEXT_PUBLIC_API_URL`; API num hospedeiro (D4) com `ALLOWED_ORIGINS`. Precisa das suas contas.
4. **Textos [REVER]** restantes (`docs/design/textos-pt.md`), em especial E1 (título da abertura com dados sintéticos) e E5 (nomes de lugares reais com tendências inventadas).
5. Idiomas do atlas (W44), README em inglês actualizado, guião do pitch e vídeo (N01).

## Propostas no código que precisam de aprovação humana

- `MAX_YEARS_REMAINING = 50` (`pipeline/terratempo/analysis.py`): acima disto o selo é "Sem tendência clara" em vez de "Ainda não significativa".
- `FEW_POINTS_YEARS = 15` (SPEC-102, ponto 8).
- Estação só entra com todos os meses presentes (SPEC-102, ponto 4).
- Teste t com `n_ef` (Santer et al. 2000). Validar.

## Comparação visual com o protótipo (site local em modo de desenvolvimento)

Abertura 0,13 %, Panorama 0,18 %, O quê 0,17 %, Onde 0,13 %, Quando 0,17 % (1280 px). Diferenças maiores: cabeçalho (link novo "Investigue", divergência esperada), Método 2,6 % e Regiões (1 px de altura). Medido com `tests/visual/capture.mjs --url http://localhost:3000` e `measure.mjs`; o indicador de desenvolvimento do Next.js entra na captura e não existe em produção.
