# Playbook de Vendas / Cockpit de Calls Consultivas — V10.2

## Ajustes desta versão

- `Ver checklist` agora é visualização/revisão e **não retoma** a sessão ativa.
- `Retomar` aparece separadamente para reuniões com status **Em andamento**.
- Modal de conclusão não inicia mais selecionado como Venda/Fechado; exige seleção ou usa status final já existente quando aplicável.
- Botão **Novo Lead** aparece no topo do Cockpit e junto à busca do Histórico.
- Sticky contextual fica fixa no topo em mobile/extensão quando há reunião ativa.
- Botão **Continuar para Scorecard** aparece somente quando existe reunião ativa.
- Modal de detalhes rola internamente e mantém o botão Fechar acessível.

## Sem alterações de banco

Esta versão não altera planilha nem Apps Script. Use o backend V08 já instalado.

## V11 — usuários e permissões planejados

A próxima versão maior pode introduzir a lógica de usuários:

- Aba `Users`.
- Primeiro ADMIN atribuído ao Eduardo.
- Todos os leads/calls atuais migrados inicialmente para propriedade do ADMIN atual.
- Campos futuros de propriedade: `ownerUserId`, `ownerName`, `ownerEmail`.
- Login por e-mail e senha.
- Criação de usuários somente pelo ADMIN.
- Primeiro acesso com convite/código temporário gerado pelo ADMIN.
- Expiração de convite caso a senha não seja criada.
- Expiração de sessão para forçar novo login periodicamente.
- Perfis iniciais sugeridos: `ADMIN` e `CLOSER`; perfil `GESTOR` pode ser criado depois.

## Como publicar

Suba o conteúdo da pasta pública para o GitHub Pages, mantendo `index.html` na raiz.
