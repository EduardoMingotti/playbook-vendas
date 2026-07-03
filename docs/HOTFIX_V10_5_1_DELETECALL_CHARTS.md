# Hotfix V10.5.1 — Exclusão + gráficos

## Objetivo

Este hotfix corrige dois pontos em cima da V10.5:

1. **Apagar reunião** passa a chamar o backend com `action: deleteCall`, preenchendo `deletedAt` na `Calls_v2`.
2. Os **gráficos do Cockpit** são reinseridos antes do Histórico de Reuniões.

## Como aplicar

Suba os arquivos:

```text
scripts/hotfix-v10.5.1-deletecall-charts.js
styles/hotfix-v10.5.1.css
```

No `index.html`, depois de `app-v10.5.js`, adicione:

```html
<link rel="stylesheet" href="./styles/hotfix-v10.5.1.css">
<script src="./scripts/hotfix-v10.5.1-deletecall-charts.js"></script>
```

## Como testar

1. Abrir o app e confirmar badge `V10.5.1`.
2. Conferir se os gráficos aparecem no Cockpit.
3. Apagar uma reunião teste.
4. No DevTools > Network > Payload, confirmar `action: deleteCall`.
5. Na `Calls_v2`, confirmar que `deletedAt` foi preenchido.
6. Limpar dados locais/cache pelo app e confirmar que a reunião apagada não volta.
