# Playbook de Vendas — V11.0

Versão consolidada e limpa baseada na V10.5 real enviada.

## O que esta versão mantém

- Login atual por chave de acesso.
- Lista compacta de reuniões no mobile/extensão.
- Menu de três pontinhos no histórico.
- Botões de Novo Lead.
- Microcopy da V10.5: ações mais claras como **Concluir reunião**, **Concluir e salvar**, **Revisar checklist**, **Adicionar nova reunião** e **Apagar reunião**.
- `Venda` continua sendo valor interno, mas aparece na interface como **Fechado** quando aplicável.
- Estrutura atual com `Calls_v2`, `getCalls`, `saveCalls` e `deleteCall`.

## Correções incorporadas

- **Apagar reunião** agora chama `action: deleteCall` no Apps Script.
- A reunião só é removida da tela depois de retorno positivo do backend.
- `deletedAt` deve ser preenchido na aba `Calls_v2`.
- Gráficos do Cockpit foram restaurados.
- Menu mobile/extensão abre como overlay e não comprime a tela de trás.
- Aviso indevido de “sair do site” foi reduzido: o alerta só aparece durante sincronização ativa.

## Arquivos principais

```text
index.html
README.md
styles/main.v11.css
scripts/playbook-content.js
scripts/app-v11.js
assets/
```

## Como publicar

Suba o conteúdo desta pasta diretamente na raiz do GitHub Pages, mantendo `index.html` na raiz.

## Como testar

1. Abrir o app e confirmar badge `V11.0`.
2. Entrar com a chave de acesso.
3. Confirmar que os gráficos aparecem no Cockpit.
4. Abrir o menu mobile/extensão e confirmar que ele sobrepõe a tela sem comprimir o conteúdo.
5. Apagar uma call teste.
6. No DevTools > Network > Payload, confirmar `action: deleteCall`.
7. Conferir se `deletedAt` foi preenchido na aba `Calls_v2`.
8. Limpar dados locais/cache e confirmar que a call apagada não volta.

## Roadmap pendente — futura versão de usuários e credenciais

A ideia originalmente planejada para V11 fica registrada como pendência para uma versão futura, não implementada nesta entrega.

### Itens pendentes

- Aba `Users`.
- Primeiro usuário `ADMIN` atribuído ao Eduardo.
- Migração inicial dos leads/calls atuais para propriedade do ADMIN.
- Campos de propriedade: `ownerUserId`, `ownerName`, `ownerEmail`.
- Login individual por e-mail e senha.
- Criação de usuários somente pelo ADMIN.
- Primeiro acesso com convite/código temporário gerado pelo ADMIN.
- Expiração de convite caso a senha não seja criada.
- Expiração de sessão para forçar novo login periodicamente.
- Perfis sugeridos: `ADMIN`, `CLOSER` e, futuramente, `GESTOR`.

## Observação

Esta V11.0 não altera a planilha nem o Apps Script. Ela consolida frontend/UX e corrige fluxo de exclusão e dashboard.
