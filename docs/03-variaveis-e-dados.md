# 03. Variáveis e dados

> **Aviso:** os nomes de produtos, versões e campos abaixo vêm do que já sabemos e do enunciado. Só `M2TMNXSLV` (temperatura) e `GPM_3IMERGM` (precipitação) foram usados em código nas versões anteriores, e mesmo esses **só testados com ficheiros falsos**. Tudo o resto está marcado "a confirmar" e passa por uma tarefa de descoberta (P00) antes de se escrever um leitor.

## 1. Regra de selecção

Uma variável entra no produto se cumprir **todas**:

1. Tem série **mensal** de pelo menos 10 anos com cobertura sobre a região pedida.
2. Tem um produto da NASA (ou de parceiro) com DOI e licença claros.
3. Tem um leitor testado com um ficheiro **real**.
4. Tem definição simples e unidades.

Sem leitor real, a variável pode existir como **demonstração rotulada**, nunca como resultado.

## 2. Catálogo por camadas

| Camada | Variável | Produto candidato | Leitor | Notas |
| --- | --- | --- | --- | --- |
| **1 (MVP)** | Temperatura do ar | MERRA-2 `M2TMNXSLV` (T2M, kelvin para °C) | **Real, 2000–2025** | Reanálise: modelo ajustado a observações, não medição directa |
| **1 (MVP)** | Precipitação | GPM IMERG `GPM_3IMERGM` v07 (mm/hora para mm/dia) | **Real, 2000–2025-09** (a NASA ainda não publicou os meses seguintes) | Medida por satélite |
| **1** | Humidade do ar | MERRA-2 `M2TMNXSLV`, humidade específica a 2 m (`QV2M`) | **Real, 2000–2025** (cubo no pipeline; ainda não aparece no site) | O mesmo ficheiro da temperatura |
| 2 (prioridade alta, D13; **escolhido: MERRA-2 `M2TMNXAER`, `TOTEXTTAU`; leitor pronto, falta correr o workflow**) | Aerossóis (AOD) | MERRA-2, colecção de aerossóis (a confirmar), **ou** MODIS no satélite **Aqua**, que é o do exemplo do vídeo (desde 2002; produto mensal provavelmente `MYD08_M3`; o plano listava `MOD08_M3`, do Terra; **confirmar em P00**) | MERRA-2: reutiliza o leitor; MODIS: HDF4, por fazer | Reproduz o exemplo do vídeo (AOD, Wisconsin, verão). Começar pelo MERRA-2 pelo custo; MODIS só se o HDF4 não atrasar. Se não for o MODIS, dizê-lo no ecrã e na verificação com o Giovanni |
| 2 | Humidade do solo e evapotranspiração | GLDAS (modelo citado no enunciado; produto a confirmar) | Por fazer | O enunciado nomeia o GLDAS |
| 2 | Vegetação (NDVI) | MODIS `MOD13C2` v061 (`CMG 0.05 Deg Monthly NDVI`) | Leitor HDF4 pronto; falta correr o workflow | |
| 3 | Perfis de temperatura e humidade da atmosfera | AIRS (instrumento citado no pacote anterior; produto a confirmar) | Por fazer | Só se sobrar tempo |
| 3 | Ozono | OMI (instrumento citado no enunciado; produto a confirmar) | Por fazer | Variável da atmosfera |
| 2 | Gelo marinho | MERRA-2 `M2TMNXOCN` (`FRSEAICE`, fracção para %) | Leitor pronto; falta correr o workflow | Escolhido em vez do NSIDC-0051 para evitar a reprojecção polar |
| 3 | Nível do mar | NASA-SSH simple grid v1.1 (grelhas semanais, 0,5°; substitui o MEaSUREs JPL2205, retirado do catálogo) | Leitor pronto | Média mensal das grelhas semanais (F5) |
| Fora do MVP | Caudal de rios | Séries hidrológicas (recurso do enunciado; produto a confirmar) | Por fazer | Dados por estação ou bacia, não em grelha |
| 3 (P38) | Nuvens, radiação solar, vento, pressão, vapor de água | Possivelmente colecções do MERRA-2 (nomes dos campos por confirmar) | Reutiliza o leitor do MERRA-2 | Citadas no vídeo; só entram depois de P00 |
| Fora do MVP (P38) | Neve (profundidade, água armazenada), temperatura da superfície do mar, cor do oceano, água subterrânea | Produtos a confirmar | Por fazer | Citadas no vídeo; a aplicação pode trabalhar só com um tipo de dados |

A **camada 1** é o que tem de ser real no MVP. As camadas 2 e 3 entram só se sobrar tempo, pela ordem do roteiro; as que ficarem de fora são mostradas como demonstração rotulada ou não aparecem.

## 3. Resolução em camadas

O plano anterior agregava tudo a 5°. Para o **mapa global** isso é bom (leve). Para uma **região**, é grosseiro: a caixa aproximada de Angola tem cerca de 9 células a 5°.

| Resolução | Células (globo) | Tamanho de um cubo mensal de 288 meses, em float32 | Uso |
| --- | --- | --- | --- |
| 5° | 2 592 | cerca de 3 MB | Mapa global pré-calculado, descarregado pelo site |
| 2° | 16 200 | cerca de 19 MB | Série regional, se o hospedeiro for pequeno |
| 1° | 64 800 | cerca de 75 MB | Série regional preferida |

*(Tamanhos calculados: células × 288 meses × 4 bytes. Para 300 meses (até 2025) somar cerca de 4%.)*

**Proposta (D5):**

- O **site** descarrega só o mapa a 5° (e o modo apresentação usa também 5°).
- O **backend** guarda os cubos a 1° (ou 2°) só das variáveis da camada 1 e calcula a série de qualquer região desenhada, fazendo a média pesada por cos(latitude) das células dentro dela.
- Os ficheiros brutos da NASA ficam fora do servidor; só os cubos agregados vão para lá.
- Uma região mais pequena do que uma célula recebe um aviso e usa a célula que a contém.

## 4. Período

- O início de cada produto é diferente; **o período comum** fixa-se na spec depois de P00. (Um colega propôs 2000 a 2026; o IMERG mensal pode começar a meio de 2000 e 2026 está incompleto. A confirmar.)
- Fim: o último ano **completo** disponível. Dados mais recentes têm latência diferente por produto; confirmar.
- O número de meses `n` é variável; o código nunca assume 288.
- Mínimo para análise: 10 anos.
- Com meses escolhidos (fórmula 17), o mínimo é de 10 estações completas (10 valores anuais); a SPEC-102 fixa o que conta como estação completa.

## 5. Regiões-exemplo (P30)

O enunciado sugere pensar em "um deserto, uma floresta tropical, um estuário ou a atmosfera acima de uma grande cidade". Candidatas:

| Tipo | Angola | Resto do mundo |
| --- | --- | --- |
| Deserto | Deserto do Namibe | Sahara |
| Floresta tropical | Floresta do Maiombe | Amazónia |
| Estuário | Estuário do Cuanza | A escolher |
| Cidade | Luanda e arredores | A escolher |
| Região semiárida | Sul de Angola (a definir) | Sahel |
| Oceano | Atlântico, ao largo de Angola | Atlântico Norte |

O pacote anterior sugeria Angola, Amazónia, Sahel e oceano Atlântico como demonstração; incluídos acima. Nota: sobre o oceano, MERRA-2 e IMERG dão temperatura do ar e precipitação, mas a temperatura da superfície do mar precisa de outro produto (por confirmar em P00).

As caixas de coordenadas **não** estão definidas aqui: o agente de Ciência propõe-nas e uma pessoa aprova, para não escrevermos coordenadas de memória.

O vídeo usa um estado (Wisconsin) como exemplo e diz que a região pode ser o mundo inteiro. Por isso a pergunta 2 também oferece **Mundo inteiro** e a escolha por país ou estado (P37, W38, W39). A fonte dos limites administrativos e a sua licença estão por confirmar.

## 6. Ficha de produto (resultado de P00)

Para cada produto candidato, o agente de Dados preenche uma ficha em `docs/produtos/<id>.md`, a partir do catálogo oficial (nunca de memória):

- Nome curto (`short_name`), versão, DOI, instrumento ou modelo.
- Variável(eis) e **nome exacto do campo**, unidades, factor de conversão.
- Resolução espacial e temporal, cobertura temporal, latência.
- Formato (NetCDF, HDF5, HDF4), tamanho típico de um mês, como autenticar.
- Texto de citação exigido.
- Um ficheiro **real** pequeno guardado fora do git para os testes.

Sem ficha completa, não há spec do leitor.

## 7. Dados sintéticos

- Servem só para desenvolver e testar quando os reais ainda não existem.
- Têm rótulo "DEMONSTRAÇÃO" em todos os ecrãs, em todas as exportações e no manifesto da API.
- Nunca são exportados como reais; um teste automático falha se um ficheiro sintético não tiver o rótulo.
- Nunca entram em nenhuma validação ou número do pitch.


## Fontes confirmadas no catálogo da NASA (CMR, 2026-11-15)

Nomes curtos, versões e DOI verificados no catálogo público da NASA (CMR). O site mostra-os na secção
"Fontes" a partir de `web/public/data/sources.json`, gerado por `terratempo.atlas`.

| Variável no site | Produto (nome curto) | Versão | Campo | DOI |
| --- | --- | --- | --- | --- |
| Temperatura do ar | `M2TMNXSLV` (MERRA-2 tavgM_2d_slv_Nx) | 5.12.4 | `T2M` | 10.5067/AP1B0BA5PD2K |
| Precipitação | `GPM_3IMERGM` (IMERG Final, mensal, 0,1°) | 07 | `precipitation` | 10.5067/GPM/IMERG/3B-MONTH/07 |
| Vegetação | `MOD13C2` (MODIS Terra, CMG 0,05°) | 061 | `CMG 0.05 Deg Monthly NDVI` | 10.5067/MODIS/MOD13C2.061 |
| Gelo marinho | `M2TMNXOCN` (MERRA-2 tavgM_2d_ocn_Nx) | 5.12.4 | `FRSEAICE` | 10.5067/4IASLIDL8EEC |
| Aerossóis | `M2TMNXAER` (MERRA-2 tavgM_2d_aer_Nx) | 5.12.4 | `TOTEXTTAU` | 10.5067/FH9A0MLJPC7N |
| Nível do mar | `NASA_SSH_REF_SIMPLE_GRID_V11` (NASA-SSH, semanal, 0,5°) | 1.1 | `ssha` | 10.5067/NSREF-SG0V11 |

O produto do nível do mar previsto antes (MEaSUREs `SEA_SURFACE_HEIGHT_ALT_GRIDS_L4_2SATS_5DAY_6THDEG_V_JPL2205`,
DOI 10.5067/SLREF-CDRV3) já não aparece no catálogo; o NASA-SSH v1.1 é o produto actual da PO.DAAC.
Os nomes dos campos do NASA-SSH vêm do guia do utilizador (tabela 2); confirmam-se na primeira execução real.
