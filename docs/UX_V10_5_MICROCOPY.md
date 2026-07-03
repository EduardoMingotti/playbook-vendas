# Playbook de Vendas / Cockpit de Calls Consultivas — V10.5

## Foco desta versão

A V10.5 é uma revisão de UX/microcopy: ajustes simples em textos, botões, status e mensagens para reduzir ambiguidade para usuários novos.

## Principais ajustes

- `Concluir execução` virou **Concluir reunião**.
- `Arquivar Histórico` virou **Concluir e salvar**.
- `Ver checklist` virou **Revisar checklist** / **Checklist preenchido**.
- `Retomar` virou **Retomar reunião**.
- `Adicionar reunião` virou **Adicionar nova reunião**.
- `Apagar` virou **Apagar reunião**.
- `Venda` é apresentado na interface como **Fechado**, sem alterar o valor interno para compatibilidade.
- `Filtrar` virou **Aplicar filtros**.
- Textos de erro/login ficaram menos acusatórios: também consideram conexão indisponível.
- A lista compacta mobile da V10.4 foi mantida.

## Sem alterações de banco

Esta versão não altera planilha nem Apps Script. Use o backend V08 já instalado.

## V11 planejada

- Usuários e permissões.
- Primeiro ADMIN atribuído ao Eduardo.
- Leads/calls atuais migrados para propriedade inicial do ADMIN.
- Campos futuros: `ownerUserId`, `ownerName`, `ownerEmail`.
- Login, convite temporário, expiração de convite e expiração de sessão.
