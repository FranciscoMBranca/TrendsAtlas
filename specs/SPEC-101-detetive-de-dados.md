# SPEC-101: Percurso do Detetive de Dados

- **Item do backlog:** W20 (usa B08, W06, W07, W08; v7: W37, W38, W39, W40)
- **Dono:** Front-end
- **Aprovador humano:** responsável de Front-end e Produto
- **Estado:** exemplo (rascunho)
- **Dependências:** B02, B08, W02, W27

## 1. Objectivo
Permitir que qualquer pessoa responda a três perguntas (o quê, onde, quando) e receba um resultado honesto num só ecrã.

## 2. Entradas e saídas
- Entradas do utilizador: variável (ou frase livre mapeada por B16), região (célula, rectângulo, polígono, região-exemplo, mundo inteiro, país ou estado), período, meses (opcional).
- Saída: resposta de `POST /regiao/analise` apresentada em: frase, gráfico, tabela, selo, "quanto falta", projecção opcional, exportação.

## 3. Comportamento
1. Uma pergunta de cada vez, com botão de recuar.
2. Só aparecem variáveis do manifesto; as de demonstração têm rótulo.
3. Região mais pequena do que a resolução: aviso e indicação da resolução usada.
4. Período por defeito: todo o disponível; mínimo de 10 anos (erro claro abaixo disso).
5. Selo: Significativa / Ainda não significativa / Sem tendência clara / Dados insuficientes / Resultado dividido (quando Mann-Kendall e teste t discordam).
6. Se a API falhar: mensagem clara e modo degradado (B07).
7. Pergunta 2 oferece "Mundo inteiro" (botão visível ao lado de clicar e desenhar) e a escolha por país ou estado (W38, W39).
8. Pergunta 3 oferece meses opcionais (W37; ver SPEC-102).
9. O selo vem acompanhado da regra do valor-p em texto fixo (W40).

## 4. Critérios de aceitação
1. Percurso completo com teclado apenas.
2. O resultado mostra todos os blocos descritos em `docs/02-produto-e-experiencia.md`.
3. Nenhuma frase contém "causa", "devido a" ou "por culpa de" (teste automático sobre os modelos de texto).
4. Cada número da frase é igual ao número da resposta da API (teste).
5. Rótulo DEMONSTRAÇÃO visível quando a variável o tiver.
6. Com um polígono abaixo de 10 anos de período, aparece o erro e nenhum resultado.
7. "Mundo inteiro" devolve a série global com média pesada por cos(latitude), igual à rota da série global (teste).
8. Com os meses Jun a Ago, o resultado usa um valor por ano (SPEC-102) e a frase nomeia os meses.
9. A regra "abaixo de 0,05" aparece junto ao selo em todos os idiomas.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Tempo até ao primeiro resultado, ligação normal | a medir e fixar pela equipa | Experiência de demonstração |
| Contraste de texto | WCAG AA | Acessibilidade |

## 6. Testes
Playwright: percurso feliz, região pequena, período curto, API em baixo, modo teclado, mundo inteiro, escolha de meses. Vitest: textos e formatação de números.

## 7. Fora do âmbito
Modos de público (SPEC separada, W21); assistente de conversa.

## 8. Segurança e honestidade
Nenhuma chave no navegador (só `NEXT_PUBLIC_API_URL`, que não é segredo). Texto sem causas.

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Sem segredos
- [ ] Rótulos intactos
