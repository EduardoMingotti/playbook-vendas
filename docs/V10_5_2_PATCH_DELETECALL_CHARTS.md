# Playbook de Vendas — V10.5.2

## O que esta versão corrige

- Restaura os gráficos do Cockpit.
- Corrige **Apagar reunião** para chamar `action: deleteCall`.
- Mantém a microcopy da V10.5.
- Mantém a lista compacta mobile da V10.4.
- Mostra badge `V10.5.2`.

## Importante

Este pacote é um patch completo para aplicar sobre a V10.5 já publicada. Ele inclui um `index.html` novo que carrega:

```html
./scripts/playbook-content.js
./scripts/app-v10.5.js
./scripts/patch-v10.5.2.js
```

Portanto, mantenha no GitHub os arquivos atuais da V10.5:

```text
scripts/playbook-content.js
scripts/app-v10.5.js
styles/main.v10.5.css
```

E suba também os novos arquivos:

```text
scripts/patch-v10.5.2.js
styles/patch-v10.5.2.css
```

## Como testar

1. Abrir o app e confirmar badge `V10.5.2`.
2. Confirmar que os gráficos aparecem no Cockpit.
3. Apagar uma reunião teste.
4. No DevTools > Network > Payload, confirmar `action: deleteCall`.
5. Conferir `deletedAt` preenchido na `Calls_v2`.
6. Limpar dados locais/cache e confirmar que a reunião apagada não volta.
