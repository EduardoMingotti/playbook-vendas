# Playbook de Vendas / Cockpit de Calls Consultivas — V10.3

## Por que V10.3 existe

A V10.3 usa nomes de arquivos versionados para eliminar confusão de cache e garantir que o GitHub Pages carregue os arquivos corretos:

```text
styles/main.v10.3.css
scripts/app-v10.3.js
```

## Ajustes desta versão

- `Ver checklist` agora abre uma visualização/revisão e **não retoma** a sessão ativa.
- `Retomar` aparece separadamente para reuniões com status **Em andamento**, usando comparação normalizada do status.
- Modal de conclusão não inicia mais selecionado como Venda/Fechado; exige seleção quando a reunião está em andamento.
- Botão **Novo Lead** aparece no topo do Cockpit e junto à busca do Histórico.
- Sticky contextual fica fixa no topo em mobile/extensão quando existe reunião ativa.
- Botão **Continuar para Scorecard** aparece somente quando existe reunião ativa.
- Modal de detalhes rola internamente e mantém o botão Fechar acessível.
- Badge discreto `V10.3` aparece no canto inferior direito para confirmar que a versão correta carregou.

## Sem alterações de banco

Esta versão não altera planilha nem Apps Script. Use o backend V08 já instalado.

## V11 — usuários e permissões planejados

A próxima versão maior pode introduzir:

- Aba `Users`.
- Primeiro ADMIN atribuído ao Eduardo.
- Migração dos leads/calls atuais para propriedade inicial do ADMIN atual.
- Campos futuros: `ownerUserId`, `ownerName`, `ownerEmail`.
- Login por e-mail e senha.
- Criação de usuários somente pelo ADMIN.
- Primeiro acesso com convite/código temporário gerado pelo ADMIN.
- Expiração de convite e expiração de sessão.
- Perfis iniciais: `ADMIN` e `CLOSER`; depois `GESTOR`.

## Como publicar

Suba o conteúdo da pasta pública para o GitHub Pages, mantendo `index.html` na raiz.
