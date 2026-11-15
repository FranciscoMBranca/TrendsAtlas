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
| `GROQ_API_KEY` | chave do Groq para o chat (segredo; há plano gratuito em console.groq.com). Sem esta nem a do OpenRouter, o chat fica escondido |
| `OPENROUTER_API_KEY` | alternativa: chave do OpenRouter (segredo; tem modelos gratuitos em openrouter.ai) |
| `AI_PROVIDER` | opcional: `groq` ou `openrouter`; vazio = o primeiro com chave (Groq primeiro) |
| `AI_MODEL` | opcional; por defeito `openai/gpt-oss-120b` no Groq e `openrouter/free` no OpenRouter |
| `ASSISTANT_LIMIT_PER_MIN` | opcional, perguntas por minuto por visitante, por defeito `8` |

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

## 4. Dados reais (workflow "Dados NASA")

Uma vez:

1. Settings > Secrets and variables > Actions: segredos `EARTHDATA_USERNAME` e `EARTHDATA_PASSWORD`.
2. Settings > Actions > General > Workflow permissions: marcar **"Allow GitHub Actions to create and approve pull requests"**.
3. Em urs.earthdata.nasa.gov > Applications > Authorized Apps: aprovar **"NASA GESDISC DATA ARCHIVE"**.

Depois: Actions > **Dados NASA** > Run workflow (período e produtos). O workflow:

- descarrega o IMERG e o MERRA-2 em paralelo, **um ano de cada vez**, agrega a 5° e apaga os ficheiros brutos;
- gera os cubos `data/cubes/{precipitacao,temperatura,humidade}.npz` (rótulo `real`);
- regenera os ficheiros do site: mapas da secção Investigue (`terratempo.export`) e do atlas, temperatura e precipitação (`terratempo.atlas`, esquema v3);
- abre um pull request `dados/nasa-<n>` para rever.

Ao juntar o PR, a Railway reconstrói a API (vigia `data/cubes/**`) e a Vercel reconstrói o site. Vegetação, gelo marinho, aerossóis e nível do mar continuam com dados de demonstração (sem leitor real ainda) e mantêm o rótulo.

Alternativa local, com as credenciais no terminal: `cd pipeline`, `python -m terratempo.ingest --variable precipitacao` e `--variable temperatura humidade`, depois `python -m terratempo.export --out ../web/public/data` e `python -m terratempo.atlas --out ../web/public/data`.

Os ficheiros brutos da NASA (`data/raw/`) nunca vão para o git.

## Segredos

Nenhum valor real nos ficheiros do repositório. As credenciais da NASA (`EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD`) só são precisas para a ingestão, na sua máquina; não vão para a Railway nem para a Vercel.
