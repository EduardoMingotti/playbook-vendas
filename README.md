# Playbook de Vendas — V10.5.3

Versão limpa baseada na V10.5 enviada.

## Corrige

- Apagar reunião agora chama `action: deleteCall`.
- `deletedAt` deve ser preenchido na `Calls_v2`.
- Gráficos do Cockpit restaurados.
- Menu mobile/extensão abre como overlay e não comprime a tela.
- Badge atualizado para `V10.5.3`.

## Mantém

- Login atual.
- Microcopy da V10.5.
- Lista compacta da V10.4/V10.5.
- Três pontinhos.
- Botões de Novo Lead.

## Arquivos

Este pacote pressupõe que os arquivos atuais da V10.5 já existam no repositório:

```text
scripts/app-v10.5.js
scripts/playbook-content.js
styles/main.v10.5.css
```

E adiciona/substitui:

```text
index.html
scripts/patch-v10.5.3.js
styles/patch-v10.5.3.css
README.md
```

## Teste

1. Confirmar badge `V10.5.3`.
2. Confirmar gráficos no Cockpit.
3. Apagar uma reunião teste.
4. Confirmar no Network que o payload tem `action: deleteCall`.
5. Confirmar `deletedAt` preenchido na planilha.
