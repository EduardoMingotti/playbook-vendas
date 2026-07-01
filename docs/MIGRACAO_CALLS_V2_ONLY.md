# Migração Calls_v2 Only

Esta versão remove a dependência ativa da aba antiga `Calls` e do campo `json_state`.

## Fluxo novo

```text
Frontend → Apps Script → Calls_v2
```

## Ações usadas

- `GET action=getCalls`: carrega todas as calls ativas do closer.
- `POST action=saveCalls`: salva o conjunto atual de calls em linhas próprias.
- `POST action=deleteCall`: marca uma call como excluída usando `deletedAt`.

## Observação

A aba antiga pode ser renomeada para `Calls_backup`. O app não depende dela nesta versão.
