# Deploy

Site na **Vercel** (`web/`), API na **Railway** (`api/` + `pipeline/`). O repositório já está ligado às duas plataformas; isto é o que falta configurar nos painéis.

## 1. API na Railway (primeiro: o site precisa do URL dela)

Ficheiros: [`railway.toml`](../railway.toml) (raiz) e [`api/Dockerfile`](../api/Dockerfile). A Railway lê o `railway.toml` sozinha.

No serviço da Railway:

| Onde | Valor |
| --- | --- |
| Settings > Source > Root Directory | vazio (raiz do repositório). O Dockerfile precisa de ver `api/`, `pipeline/` e `data/cubes/` |
| Settings > Build | Dockerfile `api/Dockerfile` (já vem do `railway.toml`) |
| Settings > Networking | **Generate Domain**. Copie o URL (`https://….up.railway.app`) |
| Settings > Deploy > Healthcheck | `/saude` (já vem do `railway.toml`) |
| Recursos | 2 vCPU e 1 GB chegam (`docs/04`); o arranque gera os dados sintéticos em poucos segundos |

Variables (lista completa em [`api/.env.example`](../api/.env.example)):

| Variável | Valor |
| --- | --- |
| `ALLOWED_ORIGINS` | domínio de produção da Vercel, ex.: `https://<projecto>.vercel.app` (vários separados por vírgula) |
| `ALLOWED_ORIGIN_REGEX` | opcional, para as pré-visualizações: `^https://<projecto>-[a-z0-9-]+\.vercel\.app$` |
| `RATE_LIMIT_PER_MIN` | `60` |

**Porta (causa do erro 502 "A solicitação não respondeu"):** a porta do domínio público tem de ser a porta onde o uvicorn ouve. A forma mais simples:

1. Variables: `PORT` = `8000`.
2. Settings > Networking > no domínio `….up.railway.app`, editar a porta de destino para `8000`.
3. Nos Deploy Logs deve aparecer `Uvicorn running on http://0.0.0.0:8000`.

Uma resposta com o cabeçalho `x-railway-fallback: true` quer dizer que o proxy da Railway não chegou à aplicação: porta errada, ou nenhum deployment activo (ver se o último está "Active" e não "Crashed").

Verificação: `https://<api>.up.railway.app/saude` deve responder `{"estado":"ok",…}` e `/docs` mostra a documentação OpenAPI.

## 2. Site na Vercel

Ficheiro: [`web/vercel.json`](../web/vercel.json) (framework Next.js, `npm ci`, cache dos ficheiros de `/data`, cabeçalhos de segurança, e não reconstrói quando só mudam `api/` ou `pipeline/`).

No projecto da Vercel:

| Onde | Valor |
| --- | --- |
| Settings > General > Root Directory | **`web`** (obrigatório: o `package.json` do site está lá) |
| Settings > General > Node.js Version | 22.x |
| Framework Preset | Next.js (detectado) |

Environment Variables (Production e Preview; ver [`web/.env.example`](../web/.env.example)):

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | o URL completo da Railway, **com `https://`** e sem barra no fim, ex.: `https://trendsatlas-production.up.railway.app` (o site acrescenta `https://` se faltar, mas é melhor gravá-lo completo) |

É lida no build: depois de a mudar, faça **Redeploy**. Sem ela, o atlas funciona e a secção Investigue mostra o aviso de modo degradado.

## 3. Ligar os dois e verificar

1. Railway: `ALLOWED_ORIGINS` com o domínio final da Vercel.
2. Vercel: `NEXT_PUBLIC_API_URL` com o domínio da Railway e Redeploy.
3. Abrir o site, ir a **Investigue**, carregar em **Analisar**: deve aparecer a frase, o selo e o gráfico. Se aparecer o aviso da API, ver a consola do browser (erro de CORS = `ALLOWED_ORIGINS` errado).
4. Teste automático contra produção: `cd tests/visual && node investigar.mjs https://<projecto>.vercel.app`.

## 4. Dados reais

Quando correr `python -m terratempo.ingest` (ver `docs/estado.md`), os cubos ficam em `data/cubes/*.npz`. Faça commit deles: a Railway reconstrói a imagem (o `railway.toml` vigia `data/cubes/**`) e a API passa a responder com o rótulo `real`. Os ficheiros brutos da NASA (`data/raw/`) nunca vão para o git.

## Segredos

Nenhum valor real nos ficheiros do repositório. As credenciais da NASA (`EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD`) só são precisas para a ingestão, na sua máquina; não vão para a Railway nem para a Vercel.
