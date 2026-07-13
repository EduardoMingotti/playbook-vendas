# Playbook de Vendas — V13.0

Web app multiusuário para registro, condução e revisão de reuniões comerciais consultivas.

A V13 mantém o frontend estático no GitHub Pages, utiliza Google Apps Script como backend e Google Sheets como banco operacional. Esta versão substitui a chave única de acesso por usuários individuais, sessões temporárias, isolamento de dados por proprietário e controle de concorrência por versão.

## Principais recursos

- Login individual por e-mail e senha.
- Perfis `ADMIN` e `CLOSER`.
- Convite por e-mail para definição de senha.
- Senhas armazenadas somente como hash com salt e pepper.
- Tokens de sessão armazenados somente como hash no backend.
- Sessões temporárias com expiração e revogação no logout.
- Isolamento de leads e reuniões por `ownerUserId`.
- Admin com visão consolidada e filtro por closer.
- Closer limitado aos próprios dados.
- Operações granulares de salvamento.
- `LockService` em operações de escrita.
- Controle de concorrência otimista por campo `version`.
- Exclusão lógica por `deletedAt`.
- Histórico de status, notas de pré-call, checklist e scorecard.
- Dashboard com métricas e gráficos comerciais.
- Backup JSON limitado aos dados acessíveis pela sessão.

## Arquitetura

```text
GitHub Pages
HTML + CSS + JavaScript
        |
        | HTTPS / fetch
        v
Google Apps Script Web App
Autenticação + autorização + regras de negócio
        |
        v
Google Sheets
Users, Sessions, Leads, Calls_v2, Logs e Config
```

O frontend nunca deve ser considerado fonte de verdade para permissões. Toda leitura e escrita é validada no Apps Script de acordo com a sessão e o perfil do usuário.

## Perfis de acesso

### ADMIN

Pode:

- criar usuários;
- reenviar convites;
- ativar ou desativar usuários;
- revogar sessões;
- visualizar todos os leads e reuniões;
- filtrar o dashboard por closer;
- importar dados administrativos;
- acessar configurações administrativas.

### CLOSER

Pode:

- entrar com e-mail e senha;
- visualizar apenas os próprios leads e reuniões;
- criar e editar reuniões próprias;
- preencher pré-call, checklist e scorecard;
- atualizar status;
- excluir logicamente reuniões próprias;
- baixar backup dos dados acessíveis pela própria sessão.

## Estrutura do repositório

```text
playbook-vendas/
├── index.html
├── README.md
├── styles/
│   └── main.v11.css
└── scripts/
    ├── playbook-content.js
    └── app-v13.js
```

O arquivo `appscript_v13.js` não deve ser publicado no repositório público. Ele deve ser copiado para o projeto do Google Apps Script vinculado à planilha.

## Arquivos da planilha

A V13 utiliza as seguintes abas:

- `Users`
- `Sessions`
- `Leads`
- `Calls_v2`
- `Logs`
- `Config`

Os CSVs entregues contêm os cabeçalhos exatos esperados pelo backend.

### Users

```text
id,createdAt,updatedAt,name,email,emailNormalized,passwordHash,passwordSalt,role,status,inviteTokenHash,inviteExpiresAt,inviteUsedAt,passwordSetAt,lastLoginAt,deletedAt
```

### Sessions

```text
id,userId,tokenHash,createdAt,expiresAt,revokedAt,lastSeenAt,userAgent
```

### Leads

```text
id,createdAt,updatedAt,ownerUserId,ownerEmail,ownerName,leadName,normalizedLeadName,sdrName,firstMeetingDate,lastMeetingDate,currentStatus,totalMeetings,deletedAt
```

### Calls_v2

```text
id,leadId,ownerUserId,ownerEmail,ownerName,version,createdAt,updatedAt,leadName,sdrName,date,meetingType,isSao,status,statusNote,statusHistory_json,preCallNotes_json,finalObservation,motivoPerdido,scoreTotal,scorePercent,scoreEvaluated,scoreMax,cl_json,sc_json,deletedAt
```

### Logs

```text
timestamp,level,action,userId,email,details
```

### Config

```text
key,value
```

## Instalação da planilha

### Opção recomendada

1. Faça uma cópia de segurança da planilha atual.
2. Não apague as abas existentes antes de validar a migração.
3. Abra a planilha usada pelo projeto.
4. Importe cada CSV como uma nova aba.
5. Garanta que os nomes sejam exatamente:
   - `Users`
   - `Sessions`
   - `Leads`
   - `Calls_v2`
   - `Logs`
   - `Config`
6. Não altere a ordem ou o nome dos cabeçalhos.

O `appscript_v13.js` também consegue criar as abas vazias automaticamente ao executar `setupV13()`.

## Instalação do Apps Script

1. Abra a planilha no Google Sheets.
2. Acesse **Extensões > Apps Script**.
3. Faça backup do código atual.
4. Substitua o código pelo conteúdo de `appscript_v13.js`.
5. Salve o projeto.
6. Abra **Configurações do projeto > Propriedades do script**.
7. Crie as propriedades descritas abaixo.

## Propriedades obrigatórias do script

Crie estas propriedades antes da inicialização:

```text
ADMIN_EMAIL=seu-email@empresa.com
ADMIN_NAME=Seu Nome
ADMIN_INITIAL_PASSWORD=uma-senha-inicial-forte
FRONTEND_URL=https://seu-usuario.github.io/seu-repositorio
```

Regras:

- `ADMIN_INITIAL_PASSWORD` deve ter pelo menos 10 caracteres, contendo letras e números.
- Não coloque aspas nos valores.
- Não adicione barra final em `FRONTEND_URL`.
- O script cria automaticamente `PASSWORD_PEPPER` e `SESSION_PEPPER`.
- Depois de criar o Admin, `ADMIN_INITIAL_PASSWORD` é removida automaticamente das propriedades.
- Nunca publique peppers, hashes, tokens ou senhas no GitHub.

## Inicialização do backend

No editor do Apps Script:

1. Selecione a função `setupV13`.
2. Clique em **Executar**.
3. Autorize as permissões solicitadas.
4. Selecione a função `bootstrapAdminV13`.
5. Clique em **Executar**.
6. Confira se a aba `Users` recebeu o usuário ADMIN.

O retorno esperado de `bootstrapAdminV13()` informa o e-mail e o ID do Admin criado.

## Publicação do Apps Script

1. Clique em **Implantar > Nova implantação**.
2. Escolha **App da Web**.
3. Configure:

```text
Executar como: você
Quem pode acessar: qualquer pessoa
```

4. Clique em **Implantar**.
5. Autorize o acesso.
6. Copie a URL terminada em `/exec`.

Exemplo:

```text
https://script.google.com/macros/s/SEU_ID/exec
```

## Configuração do frontend

Abra `scripts/app-v13.js` e atualize:

```javascript
const API_URL = 'URL_DO_APPS_SCRIPT_TERMINADA_EM_EXEC';
const PLAYBOOK_PUBLIC_URL = 'URL_PUBLICA_DO_GITHUB_PAGES';
```

O `index.html` já referencia:

```html
<link rel="stylesheet" href="./styles/main.v11.css">
<script src="./scripts/playbook-content.js" defer></script>
<script src="./scripts/app-v13.js" defer></script>
```

## Publicação no GitHub Pages

1. Crie ou abra o repositório do projeto.
2. Mantenha `index.html` na raiz.
3. Suba os arquivos e pastas do frontend.
4. Acesse **Settings > Pages**.
5. Em **Build and deployment**, selecione publicação a partir de uma branch.
6. Selecione a branch `main` e a pasta `/root`.
7. Salve.
8. Aguarde a URL pública ser gerada.
9. Atualize `FRONTEND_URL` nas propriedades do Apps Script se a URL final for diferente.

## Fluxo de criação de usuários

1. O Admin entra no web app.
2. Abre **Administração**.
3. Clica em **Novo usuário**.
4. Informa nome, e-mail e perfil.
5. O backend cria o usuário com status `pending`.
6. O backend gera um token de convite.
7. Apenas o hash do token é armazenado na planilha.
8. O usuário recebe um link para `set-password.html?token=...`.
9. Após definir a senha, o status passa para `active`.

> Observação: o fluxo de convite do backend aponta para `set-password.html`. Esse arquivo deve existir no frontend antes de convidar usuários. Caso a etapa ainda não tenha sido publicada, crie previamente o Admin com `bootstrapAdminV13()` e aguarde o pacote final para convidar closers.

## Sessões

- O token real fica apenas no navegador.
- A aba `Sessions` armazena somente `tokenHash`.
- A duração padrão é de 168 horas, equivalente a 7 dias.
- Logout preenche `revokedAt`.
- Usuário desativado perde acesso.
- Alteração de senha revoga as outras sessões do usuário.
- O backend limita a quantidade de sessões ativas por usuário.

## Salvamento granular

A V13 não usa `saveCalls` para sincronizar todas as reuniões periodicamente.

Cada alteração chama uma operação específica:

```text
createCall
updateCall
updatePreCall
updateChecklist
updateScorecard
updateStatus
updateFinalObservation
deleteCall
addMeetingToLead
```

Isso reduz o volume enviado, diminui o número de atualizações desnecessárias e evita que uma alteração local substitua registros que o usuário não editou.

## Controle de concorrência

Cada reunião possui um campo `version`.

Fluxo de atualização:

```text
Frontend carrega a reunião com version = 4
Frontend envia expectedVersion = 4
Backend confere a versão atual
Backend salva a alteração
Backend incrementa version para 5
```

Se o registro já estiver na versão 5, uma tentativa com `expectedVersion = 4` retorna:

```text
conflict
```

O frontend recarrega os dados mais recentes e informa que a reunião foi atualizada em outro lugar.

Todas as escritas também passam por `LockService.getScriptLock()`.

## Segurança

### Senhas

- Senhas nunca são gravadas em texto puro.
- Cada usuário possui salt individual.
- O backend aplica hash SHA-256 iterativo com pepper armazenado nas propriedades do script.
- A comparação de hash utiliza comparação de tempo constante.

### Sessões

- Tokens são aleatórios.
- O navegador guarda o token real.
- O backend guarda somente o hash do token.
- Sessões possuem expiração, revogação e registro de última atividade.

### Autorização

- O backend determina o usuário pela sessão.
- O frontend não define o proprietário de uma nova reunião.
- Reuniões e leads criados por um closer recebem automaticamente o `ownerUserId` da sessão.
- O closer não consegue ler ou alterar registros de outros usuários, mesmo manipulando o frontend.
- O Admin pode visualizar todos os registros e aplicar filtro por proprietário.

## Migração dos dados atuais

Antes da migração:

1. Faça backup da planilha.
2. Faça backup JSON pelo app atual.
3. Preserve as abas antigas.
4. Não execute a migração diretamente na única cópia de produção.

O backend V13 renomeia automaticamente abas incompatíveis para nomes com sufixo semelhante a:

```text
Calls_v2_legacy_20260713_180000
Leads_legacy_20260713_180000
```

Depois cria novas abas com os cabeçalhos V13.

A função `migrateExistingDataToV13()` procura especificamente:

```text
Calls_v2_legacy
Leads_legacy
```

Se as abas tiverem sufixo de data e hora, renomeie as cópias que serão migradas temporariamente para:

```text
Calls_v2_legacy
Leads_legacy
```

Depois:

1. Confirme que o Admin já foi criado.
2. Execute `migrateExistingDataToV13()`.
3. Confira os campos `ownerUserId`, `ownerEmail`, `ownerName` e `version`.
4. Compare a quantidade de registros ativos e excluídos.
5. Valide amostras de notas, scorecards e históricos.
6. Só então publique a nova implantação.

Os registros migrados são atribuídos ao Admin configurado em `ADMIN_EMAIL`.

## Endpoints principais

### Públicos

```text
health
login
validateInvite
setPassword
```

### Autenticados

```text
getCurrentUser
getCalls
getLeads
getDashboardData
logout
changePassword
createLead
updateLead
createCall
updateCall
updatePreCall
updateChecklist
updateScorecard
updateStatus
updateFinalObservation
deleteCall
addMeetingToLead
```

### Apenas ADMIN

```text
listUsers
createUser
resendInvite
disableUser
enableUser
revokeUserSessions
getConfig
importCalls
```

## Testes obrigatórios

### Autenticação

- Admin consegue entrar.
- Senha incorreta retorna mensagem genérica.
- Token de sessão não aparece na planilha em texto puro.
- Logout preenche `revokedAt`.
- Sessão expirada exige novo login.
- Usuário desativado não consegue entrar.

### Usuários

- Admin cria um closer.
- Usuário novo fica com status `pending`.
- Convite é enviado ao e-mail correto.
- Convite expirado é recusado.
- Convite usado não pode ser reutilizado.
- Senha definida altera o status para `active`.

### Isolamento

- Closer A vê apenas registros do Closer A.
- Closer B vê apenas registros do Closer B.
- Alterar `ownerUserId` no navegador não concede acesso.
- Admin vê os dois usuários.
- Filtro do Admin retorna apenas o closer selecionado.

### Concorrência

1. Abra a mesma reunião em duas abas.
2. Altere e salve na primeira.
3. Tente salvar a versão antiga na segunda.
4. Confirme o retorno de conflito.
5. Confirme que os dados mais recentes são recarregados.

### Operações

- Novo lead cria lead e reunião com proprietário correto.
- Pré-call salva sem enviar todas as reuniões.
- Checklist salva separadamente.
- Scorecard salva separadamente e recalcula os indicadores.
- Atualização de status preserva o histórico.
- No-show não fica marcado como SAO.
- Exclusão preenche `deletedAt`.
- Backup do closer contém apenas dados permitidos.

## Implantação segura

Recomenda-se esta sequência:

1. Criar uma cópia da planilha de produção.
2. Instalar o backend V13 na cópia.
3. Configurar propriedades do script.
4. Criar o Admin.
5. Migrar os dados.
6. Publicar uma implantação de teste.
7. Atualizar `API_URL` em uma branch de teste do frontend.
8. Executar todo o checklist.
9. Testar com um Admin e dois closers.
10. Somente depois substituir a implantação de produção.

## Solução de problemas

### `server_error` ao criar usuário

Verifique:

- se `FRONTEND_URL` foi criada;
- se o Apps Script possui autorização para enviar e-mail;
- se os cabeçalhos da aba `Users` estão corretos.

### Login retorna `invalid_credentials`

Verifique:

- se o usuário está com status `active`;
- se `passwordHash` e `passwordSalt` estão preenchidos;
- se os peppers não foram apagados ou substituídos;
- se o e-mail foi digitado corretamente.

### Login retorna `session_expired`

Remova a sessão local ou use o botão de logout e entre novamente.

### Operação retorna `conflict`

A reunião foi alterada depois de ser carregada. Recarregue os dados antes de editar novamente.

### Operação retorna `forbidden`

O usuário não é proprietário do registro e não possui perfil ADMIN.

### O Admin não vê o menu de administração

Verifique se o usuário possui exatamente:

```text
role = ADMIN
status = active
```

### O app não conecta ao backend

Verifique:

- se `API_URL` termina em `/exec`;
- se a implantação está ativa;
- se o acesso está configurado para qualquer pessoa;
- se foi criada uma nova versão da implantação depois das alterações;
- se o navegador consegue acessar a URL do Apps Script.

## Manutenção

- Não altere manualmente IDs.
- Não reutilize `ownerUserId` entre usuários.
- Não apague peppers das propriedades do script.
- Não apague linhas de sessões para simular logout; use revogação.
- Prefira exclusão lógica a remoção física de reuniões.
- Faça backups periódicos da planilha.
- Antes de alterar cabeçalhos, atualize backend, CSVs e documentação em conjunto.

## Versão

```text
Frontend: V13.0
Backend: V13.0
Modelo de dados: V13
```

## Aviso de segurança

Google Sheets e Google Apps Script são adequados para esta operação pequena e controlada, mas não substituem uma infraestrutura corporativa de identidade, banco transacional ou auditoria avançada. Para aumento relevante de volume, múltiplas empresas, requisitos regulatórios ou dados altamente sensíveis, reavalie a arquitetura antes de expandir o uso.
