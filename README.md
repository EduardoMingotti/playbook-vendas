# Playbook de Vendas / Cockpit de Calls Consultivas

## Visão geral

O **Playbook de Vendas** transforma um playbook comercial em uma ferramenta prática de uso diário para condução, registro e análise de calls consultivas.

A aplicação reúne:

- roteiro consultivo de vendas;
- cockpit de reuniões;
- histórico de calls;
- marcação de SAO;
- status final da reunião;
- scorecard de aderência ao processo;
- métricas e gráficos de conversão;
- backup/importação JSON local;
- instalação como extensão Chrome via Side Panel.

## Arquitetura atual

A arquitetura atual permanece leve e de baixo custo:

```text
GitHub Pages
   ↓
Frontend público em HTML/CSS/JS
   ↓
Google Apps Script Web App
   ↓
Google Sheets — aba Calls_v2
```

## Estrutura do repositório público

```text
playbook-vendas/
├── index.html
├── README.md
├── assets/
├── docs/
│   └── MIGRACAO_CALLS_V2_ONLY.md
├── styles/
│   └── main.css
└── scripts/
    ├── playbook-content.js
    └── app.js
```

## O que não deve ir para o GitHub

Não publicar no repositório público:

- Apps Script do Google;
- planilha real;
- backups reais;
- tokens, senhas ou chaves;
- dados reais de clientes em arquivos exportados;
- documentação interna sensível.

## Modelo de dados atual

A versão atual usa a aba:

```text
Calls_v2
```

Com uma linha por call:

```text
id
createdAt
updatedAt
closer
leadName
sdrName
date
isSao
status
motivoPerdido
scoreTotal
scorePercent
scoreEvaluated
scoreMax
cl_json
sc_json
deletedAt
```

A aba antiga `Calls`, que usava `timestamp | closer | json_state`, foi descontinuada para uso ativo. Ela pode ser mantida renomeada como `Calls_backup` apenas para histórico/segurança.

## Mudanças realizadas

### 1. Separação do HTML original

O HTML único foi separado para reduzir consumo de contexto em IAs e facilitar manutenção:

- `index.html`: estrutura da página e carregamento de dependências;
- `styles/main.css`: estilos visuais;
- `scripts/playbook-content.js`: conteúdo do playbook e módulos;
- `scripts/app.js`: lógica do app, dashboard, calls, sync, login e extensão.

### 2. Criação da aba Calls_v2

Foi criada uma estrutura tabular para substituir o snapshot JSON único. Cada call passa a ocupar uma linha própria, permitindo:

- leitura mais direta;
- menor risco de sobrescrita;
- melhor análise futura;
- filtros e dashboards mais confiáveis;
- menor dependência de uma célula gigante com JSON completo.

### 3. Migração para backend Calls_v2 only

O Apps Script atual trabalha exclusivamente com `Calls_v2`.

O frontend agora:

- carrega dados via `action=getCalls`;
- salva dados via `action=saveCalls`;
- exclui dados via `action=deleteCall`;
- não lê mais a aba antiga `Calls`;
- não grava mais `json_state`.

### 4. Sincronização mais rápida

O intervalo de sincronização remota foi ajustado para aproximadamente **15 segundos** quando o backend já está acessível.

## Fluxo atual esperado

```text
Abrir site
   ↓
Tela de acesso
   ↓
Validar chave no Apps Script
   ↓
Carregar calls da aba Calls_v2
   ↓
Usar cockpit/playbook
   ↓
Criar, editar, concluir ou apagar call
   ↓
Frontend salva localmente e sincroniza com Apps Script
   ↓
Apps Script atualiza Calls_v2
```

## Publicação

Para publicar no GitHub Pages:

1. Subir o conteúdo desta pasta pública para o repositório.
2. Garantir que `index.html` esteja na raiz do repositório.
3. Verificar se as pastas `scripts/` e `styles/` estão na raiz.
4. Aguardar o GitHub Pages publicar.
5. Testar em guia anônima.

## Atualização do Apps Script

O Apps Script não deve ir para este repositório.

Para atualizar:

1. Abrir a planilha Google.
2. Ir em `Extensões > Apps Script`.
3. Colar o script privado atualizado.
4. Salvar.
5. Ir em `Implantar > Gerenciar implantações`.
6. Editar a implantação atual.
7. Criar nova versão.
8. Implantar mantendo a mesma URL `/exec`.

## Testes obrigatórios após atualização

Sempre testar:

- abrir em guia anônima;
- validar senha errada;
- validar senha correta;
- confirmar carregamento das calls;
- criar uma call teste;
- editar uma call;
- encerrar uma call;
- apagar uma call teste;
- confirmar atualização na aba `Calls_v2`;
- limpar cache local e confirmar recarregamento da nuvem.

## Riscos atuais

Ainda existem pontos a evoluir:

- autenticação ainda por chave compartilhada;
- closer ainda fixo como `Eduardo` no frontend/backend;
- sem perfis `ADMIN`, `GESTOR` e `CLOSER`;
- Apps Script ainda é uma camada simples, não uma API profissional;
- frontend público continua visível por natureza do GitHub Pages.

## Próximas melhorias recomendadas

### Curto prazo

- separar `app.js` em arquivos menores: `api.js`, `storage.js`, `dashboard.js`, `calls.js`, `scorecard.js`;
- melhorar indicador visual de sincronização;
- botão explícito “Recarregar da nuvem”;
- backup manual/automático da aba `Calls_v2`.

### Médio prazo

- login individual por usuário;
- aba `Users`;
- perfis `ADMIN`, `GESTOR`, `CLOSER`;
- closer dinâmico por login;
- filtros gerenciais por SDR, período, status e closer;
- dashboard de time.

### Longo prazo

Migrar para infraestrutura mais robusta apenas se a escala exigir:

- banco de dados dedicado;
- autenticação profissional;
- API com permissões;
- logs e auditoria completos;
- ambiente multiusuário com governança.

## Princípios de manutenção

- Não colocar tokens no frontend público.
- Não publicar Apps Script no GitHub.
- Fazer backup antes de alterações estruturais.
- Testar sempre em guia anônima.
- Preferir mudanças incrementais.
- Manter compatibilidade e documentação de cada versão.
