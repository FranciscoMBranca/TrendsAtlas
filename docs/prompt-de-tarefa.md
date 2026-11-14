# Prompt de tarefa (modelo)

```
Agente: <nome do agente>
Item do backlog: <ID e título>
Spec aprovada: specs/<ficheiro>.md
Ramo: feat/<ID>-<nome-curto> (em worktree próprio)

Objectivo: <uma frase>

Faz:
1. Lê a spec e os ficheiros de docs que ela refere.
2. Escreve primeiro os testes dos critérios de aceitação; confirma que falham.
3. Implementa até passarem.
4. Corre testes, linter, tipos e análise de segredos.
5. Abre um pull request com a lista de verificação preenchida.

Só podes escrever em: <pasta>
Não podes: juntar o PR, mexer em segredos, alterar limiares da spec, reescrever histórico git.

Se a spec estiver ambígua ou contraditória, pára e pergunta; não adivinhes.
No fim, diz: o que fizeste, o que não fizeste, o que não conseguiste verificar.
```
