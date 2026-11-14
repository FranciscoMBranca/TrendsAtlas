# Lista de verificação de pull request e de gate

## Pull request
- [ ] Liga a uma SPEC aprovada e ao ID do backlog
- [ ] Testes escritos primeiro; todos passam
- [ ] Linter e tipos limpos
- [ ] Análise de segredos limpa
- [ ] Só tocou na pasta do dono
- [ ] Limiares da spec iguais aos fixados
- [ ] Rótulos real/demonstração intactos
- [ ] Textos sem causas, sem alarmismo, sem números escritos à mão
- [ ] Documentação actualizada
- [ ] Revisão do Revisor feita; aprovação humana dada por alguém que não pediu o PR

## Gate 1 (dados reais ponta a ponta)
- [ ] Ficheiro real lido com testes
- [ ] Tendência e teste calculados numa região real
- [ ] API devolve o número com rótulo `real`
- [ ] Site mostra-o
- [ ] CI verde

## Gate 2 (demonstração no ar)
- [ ] Percurso das 3 perguntas completo com dados reais
- [ ] Gráfico, tabela, selo e "quanto falta" visíveis
- [ ] Modo degradado testado
- [ ] Teste de rótulos de demonstração passa
- [ ] Uma pessoa de fora percorreu o fluxo

## Gate 3 (congelamento e entrega)
- [ ] Números do pitch rastreados
- [ ] Limitações visíveis
- [ ] Citações presentes
- [ ] README em inglês
- [ ] Vídeo de reserva
