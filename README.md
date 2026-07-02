# Playbook de Vendas / Cockpit de Calls Consultivas — V10 UX Completa

## Visão geral

Esta versão mantém a estrutura atual da planilha e entrega as melhorias visuais e operacionais de UX solicitadas para o uso diário do cockpit.

## O que mudou na V10

- Sticky contextual quando existe reunião ativa.
- Atalhos rápidos para Pré-call, Notas, Scorecard e Concluir execução.
- Notas de Pré-call no módulo Pré-call com template editável.
- Botão **Continuar para Scorecard** ao final do Pré-call.
- Botão **Concluir execução** ao final do Scorecard.
- Histórico reorganizado com busca e botão **Novo Lead** próximos da lista.
- Ações do histórico agrupadas em menu de três pontinhos.
- Opção **Adicionar reunião** para lead existente.
- Modal **Ver detalhes** com notas, scorecard e histórico de status.
- Modal **Atualizar status** com nota por alteração.
- Datas exibidas em formato curto `dd/mm/aaaa`.
- Melhor responsividade do histórico em telas menores.

## Estrutura técnica

```text
index.html
README.md
assets/
docs/
styles/main.css
scripts/playbook-content.js
scripts/app.js
```

## Backend

Esta entrega não altera a estrutura da planilha. Use o Apps Script V08 já instalado para Leads + Calls_v2 expandida.

## Testes recomendados

1. Abrir em guia anônima.
2. Criar um Novo Lead.
3. Ver sticky contextual na reunião ativa.
4. Preencher Notas de Pré-call.
5. Clicar em Continuar para Scorecard.
6. Preencher Scorecard.
7. Concluir execução.
8. Pesquisar no Histórico.
9. Usar três pontinhos > Ver detalhes.
10. Usar três pontinhos > Adicionar reunião.
11. Confirmar datas curtas no histórico.
