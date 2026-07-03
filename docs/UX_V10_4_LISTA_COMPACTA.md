# Playbook de Vendas / Cockpit de Calls Consultivas — V10.4

## Ajuste principal

A lista do Histórico de Reuniões em mobile/extensão deixou de virar cards gigantes. Agora a visualização compacta usa o formato:

```text
Lead | SDR | Data | Status | ⋮
```

A coluna SAO é ocultada em telas pequenas para economizar espaço. A informação completa continua disponível em **⋮ > Ver detalhes**.

## Mantido da V10.3

- Arquivos versionados para evitar cache:
  - `styles/main.v10.4.css`
  - `scripts/app-v10.4.js`
- `Ver checklist` não retoma sessão.
- `Retomar` aparece para reuniões em andamento.
- Conclusão exige seleção de status final.
- Sticky contextual em call ativa.
- Modal de detalhes com rolagem interna.
- Badge V10.4 no canto inferior direito.

## V11 planejada

- Usuários e permissões.
- Primeiro ADMIN atribuído ao Eduardo.
- Leads/calls atuais migrados para propriedade inicial do ADMIN.
- Campos futuros: `ownerUserId`, `ownerName`, `ownerEmail`.
- Login, convite temporário, expiração de convite e expiração de sessão.
