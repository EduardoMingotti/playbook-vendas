# Migração para Leads + Calls_v2 expandida

## Objetivo

Separar o conceito de Lead do conceito de Reunião sem migrar para outro banco.

## Sequência segura

1. Importe `Leads.csv` como aba `Leads`.
2. Importe `Calls_v3.csv` como aba `Calls_v3`.
3. Valide se os dados aparecem corretamente.
4. Renomeie a aba atual `Calls_v2` para `Calls_v2_backup`.
5. Renomeie `Calls_v3` para `Calls_v2`.
6. Atualize o Apps Script V08 e implante uma nova versão.
7. Suba o frontend V09 no GitHub.
8. Teste em guia anônima.

## Observação

O sistema continua usando o nome final `Calls_v2` para evitar trocar a lógica de frontend/backend a cada migração.
