# Flex Counter Service

Aplicação Node + Express com front-end Flexbox que exibe nomes vindos do Google Sheets e permite ajustar quantidades com botões +/-. Preparado para deploy no Render.com.

## Pré-requisitos
- Node.js 18+

## Como executar localmente
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Defina as variáveis (mesma janela do PowerShell):
   ```powershell
   $env:GOOGLE_SHEETS_ID = "<ID-da-planilha>"
   $env:GOOGLE_SHEETS_CREDENTIALS = Get-Content "./service-account.json" -Raw
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse http://localhost:3000

## Deploy no Render
1. Faça o upload deste diretório para um repositório Git.
2. Crie um **Web Service** (ou use o `render.yaml` como Blueprint).
3. Configure:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Adicione as variáveis no painel do Render (Environment → Add Secret):
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SHEETS_CREDENTIALS` (cole o JSON inteiro)
   - Opcionais: `GOOGLE_SHEETS_TAB`, `GOOGLE_SHEETS_COLUMN`, `GOOGLE_SHEETS_START_ROW`
5. Deploy e abra a URL gerada.

## Sincronização com Google Sheets (F5:F17)
| Variável | Descrição |
| --- | --- |
| `GOOGLE_SHEETS_ID` | ID da planilha (ex.: `1K80WnIJAtTTQpbGKQF5QJk5FNfaAl5ks5nmCI7y9o2s`). |
| `GOOGLE_SHEETS_TAB` (opcional) | Aba usada para leitura/escrita. Padrão: `inventario`. |
| `GOOGLE_SHEETS_COLUMN` (opcional) | Coluna onde os valores são gravados. Padrão: `F`. |
| `GOOGLE_SHEETS_START_ROW` (opcional) | Primeira linha do intervalo. Padrão: `5`. |
| `GOOGLE_SHEETS_CREDENTIALS` | JSON da Service Account com acesso de edição. |

**Gerando o JSON**
1. Google Cloud Console → APIs e serviços → habilite **Google Sheets API**.
2. Crie uma **Service Account** e gere uma chave **JSON**.
3. Compartilhe a planilha com o e-mail da Service Account (permissão de editor).
4. Use `Get-Content <arquivo>.json -Raw` para preencher `GOOGLE_SHEETS_CREDENTIALS`.

Quando configurado, cada clique nos botões envia o valor para `inventario!F5:F17`.

### Script manual (atualiza valores em lote)
```bash
npm run push:counters -- "1,0,3,0,5,2,0,1,0,0,0,4,2"
```

### Script para publicar no GitHub
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pushToGitHub.ps1 `
  -RemoteUrl "https://github.com/SEU_USUARIO/flex-counter-service.git" `
  -Branch "main" `
  -CommitMessage "Publica projeto no GitHub"
```

## Estrutura
```
flex-counter-service/
├── package.json
├── package-lock.json
├── render.yaml
├── server.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   ├── pushCounters.js
│   └── pushToGitHub.ps1
└── README.md
```
