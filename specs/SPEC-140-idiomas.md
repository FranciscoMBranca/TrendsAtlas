# SPEC-140: Idiomas (pt, en, es, fr, mandarim)

- **Item do backlog:** W16, W32, W33, W34, W35, N03 a N07
- **Dono:** Front-end (infraestrutura), Humano (textos e revisão)
- **Aprovador humano:** uma pessoa que fale cada idioma
- **Estado:** exemplo (rascunho; variante do mandarim e do português por confirmar)
- **Dependências:** W01

## 1. Objectivo
Todo o texto do produto existe em cinco idiomas, escolhido pelo utilizador e trocado sem recarregar, sem que os **números** mudem de uma língua para outra.

## 2. Entradas e saídas
- Entrada: idioma escolhido (ou o do navegador, com troca visível), catálogo de chaves por idioma, `chave` e `parametros` vindos da API.
- Saída: ecrãs, frases dos modos de público, glossário e descrição em texto dos mapas no idioma escolhido, com números e datas formatados para esse idioma.
- Pressupostos a confirmar: mandarim em **chinês simplificado**; português na norma de Portugal e Angola.

## 3. Comportamento
1. Nenhuma frase fica fixa no código: tudo sai do catálogo por chave.
2. A API devolve chaves e parâmetros, nunca frases (ver `04`).
3. Plurais e formatos de número e data seguem o idioma (o mandarim não tem plural).
4. Tipo de letra para chinês vem do sistema, para não pesar nas ligações lentas.
5. Glossário estatístico (N07): **fonte única**, traduzida uma vez e reutilizada em todos os ecrãs.
6. Cada idioma tem um **estado**: `revisto por humano` ou `tradução automática`. Os não revistos mostram um aviso visível.
7. Falta de uma chave num idioma cai para inglês e regista o aviso; nunca mostra a chave crua.
8. Textos dos modos de público são modelos fixos (sem IA livre); o assistente, se existir, responde no idioma escolhido e só cita números das ferramentas.

## 4. Critérios de aceitação
1. Todas as chaves existem nos cinco idiomas (teste automático).
2. Trocar de idioma não recarrega a página nem pede cálculo à API.
3. Os mesmos números aparecem em todos os idiomas (teste com a mesma resposta da API).
4. O chinês desenha-se sem caixas vazias; fr e es não partem o ecrã.
5. Um idioma sem revisão humana mostra o aviso.
6. O pitch e o README em inglês existem e têm revisão humana.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Peso extra por idioma | a fixar (cada catálogo só carrega quando escolhido) | Ligações lentas |
| Chaves em falta | zero no Gate 3 | Qualidade |

## 6. Testes
`test_chaves_completas`, `test_sem_frases_fixas`, `test_troca_sem_recarregar`, `test_numeros_iguais_entre_idiomas`, `test_aviso_sem_revisao`; Playwright: percurso completo em cada idioma.

## 7. Fora do âmbito
Idiomas que se escrevem da direita para a esquerda; variantes regionais além das indicadas; tradução automática ao vivo.

## 8. Segurança e honestidade
Texto vindo de utilizadores é dado, nunca instrução. Traduções automáticas ficam **sempre rotuladas** até alguém as rever; o glossário estatístico não se publica sem revisão.

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Estado de revisão correcto em cada idioma
- [ ] Sem segredos
- [ ] Rótulos intactos
