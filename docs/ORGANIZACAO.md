# Organização do frontend

Esta separação foi feita para reduzir o tamanho dos arquivos lidos por IA e facilitar manutenção incremental.

- `index.html`: estrutura HTML e carregamento das dependências.
- `styles/main.css`: estilos visuais.
- `scripts/playbook-content.js`: conteúdo do playbook e módulos.
- `scripts/app.js`: lógica do aplicativo, dashboard, calls, sync, configurações e extensão.

## Fluxo de publicação

1. Edite os arquivos localmente ou no Drive.
2. Suba somente esta pasta pública para o GitHub.
3. Não inclua a pasta privada do Apps Script.
4. Teste em guia anônima após publicar.
