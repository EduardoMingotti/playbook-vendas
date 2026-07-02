# Playbook de Vendas / Cockpit de Calls Consultivas — V09

## Visão geral

O **Playbook de Vendas** é um cockpit comercial para conduzir, registrar e revisar calls consultivas. A versão V09 evolui a base criada em `Calls_v2` para preparar o sistema para diferenciação entre **Lead** e **Reunião**, melhorar a UX do histórico e abrir caminho para Notas de Pré-call e histórico de status.

## Arquitetura

```text
GitHub Pages
   ↓
Frontend público em HTML/CSS/JS
   ↓
Google Apps Script Web App
   ↓
Google Sheets
      ├── Leads
      └── Calls_v2
```

## Estrutura pública

```text
index.html
README.md
assets/
docs/
styles/main.css
scripts/playbook-content.js
scripts/app.js
```

## Estrutura de dados

### Leads

A aba `Leads` representa o cliente/lead principal. Um lead pode ter uma ou mais reuniões.

Campos principais:

```text
id, createdAt, updatedAt, ownerCloser, leadName, normalizedLeadName, sdrName,
firstMeetingDate, lastMeetingDate, currentStatus, totalMeetings, deletedAt
```

### Calls_v2

A aba `Calls_v2` continua sendo a aba ativa de reuniões/calls, agora com vínculo ao lead por `leadId`.

Campos principais:

```text
id, leadId, createdAt, updatedAt, closer, leadName, sdrName, date, meetingType,
isSao, status, statusNote, statusHistory_json, preCallNotes_json, finalObservation,
motivoPerdido, scoreTotal, scorePercent, scoreEvaluated, scoreMax, cl_json, sc_json, deletedAt
```

## Mudanças desta versão

- Preparação da aba `Leads`.
- Ampliação da estrutura `Calls_v2`.
- Campo `preCallNotes_json` para Notas de Pré-call por reunião.
- Campo `statusHistory_json` para histórico de mudanças de status.
- Campo `statusNote`, reaproveitando a lógica prática do antigo motivo/observação.
- Melhor nomenclatura: **Novo Lead** em vez de Nova Call.
- Sincronização continua em até aproximadamente 15 segundos.
- Apps Script passa a suportar ações de leads e reuniões.

## Observação sobre Notas de Pré-call

As Notas de Pré-call aparecem como um texto sugerido/editável. O usuário pode preencher, apagar, reescrever ou ignorar o template. Essa abordagem evita campos obrigatórios rígidos durante a call.

## O que não subir no GitHub

- Apps Script;
- planilhas reais;
- backups reais;
- tokens/chaves;
- dados reais exportados.

## Próximos passos

1. Melhorar visual do Histórico e responsividade.
2. Implementar menu de três pontinhos completo.
3. Implementar Adicionar reunião para lead existente.
4. Adicionar tela/detalhe de reunião com notas, scorecard e histórico de status.
5. Criar sticky contextual da sessão ativa.
6. Futuramente implementar login individual e perfis.

## Testes obrigatórios

- Importar `Leads.csv` como aba `Leads`.
- Importar `Calls_v3.csv` como aba temporária.
- Validar os dados visualmente.
- Renomear `Calls_v2` atual para backup.
- Renomear `Calls_v3` para `Calls_v2`.
- Atualizar Apps Script e implantar nova versão.
- Subir frontend público V09.
- Testar em guia anônima.
- Criar lead teste.
- Confirmar gravação em `Leads` e `Calls_v2`.
