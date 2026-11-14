# SPEC-110: Modo apresentação (time-lapse do mapa)

- **Item do backlog:** W22 (e W24)
- **Dono:** Front-end
- **Aprovador humano:** responsável de Front-end e Produto
- **Estado:** exemplo (rascunho)
- **Dependências:** W03, P11

## 1. Objectivo
Mostrar, em ecrã inteiro, como a variável escolhida se afastou do normal ano a ano, como um vídeo curto, útil para ensinar e para a nossa demonstração.

## 2. Entradas e saídas
- Entrada: ficheiro estático do mapa a 5° com anomalia anual por célula (gerado pelo pipeline, com `schemaVersion` e rótulo real/demonstração).
- Saída: animação com controlos e legenda.

## 3. Comportamento
1. Reproduzir/pausar, velocidade (3 níveis), arrastar o ano.
2. Legenda de cores explicada em linguagem simples; paleta segura para daltonismo.
3. Funciona **sem rede** depois do primeiro carregamento (dados em cache ou incluídos).
4. Exemplos guiados (W24): três percursos de cerca de 30 s com legenda; só dados reais.
5. Pausa quando o separador deixa de estar visível; respeita a preferência de movimento reduzido (sem animação automática, mostra o último ano e a barra de anos).

## 4. Critérios de aceitação
1. Com a rede desligada, o modo funciona depois de carregado uma vez.
2. O ano mostrado e o valor da legenda correspondem ao ficheiro de dados (teste).
3. Com movimento reduzido, nada se anima sozinho.
4. Um ficheiro marcado "demonstração" mostra o rótulo em todos os fotogramas.
5. Nenhum exemplo guiado usa dados de demonstração.

## 5. Limiares fixados antes dos resultados
| Métrica | Limiar | Justificação |
| --- | --- | --- |
| Tamanho dos dados do modo | a fixar pela equipa (o mapa a 5° de 288 meses tem cerca de 3 MB por variável) | Ligações lentas |
| Fotogramas por segundo | a medir num telemóvel médio | Fluidez |

## 6. Testes
Vitest para a lógica de anos e legenda; Playwright com a rede desligada e com movimento reduzido.

## 7. Fora do âmbito
Projecção para anos futuros; vídeo exportado.

## 8. Segurança e honestidade
A legenda diz que as cores mostram desvios do normal, não causas.

## 9. Lista de verificação final
- [ ] Critérios todos cobertos por testes
- [ ] Sem segredos
- [ ] Rótulos intactos
