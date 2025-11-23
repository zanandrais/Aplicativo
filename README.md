# Flex Counter Service

Aplicacao Node + Express com front-end Flexbox que exibe as listas do Google Sheets (Sacolao, Dispensa, Acougue e Limpeza) e tambem registra gastos com data, descricao e valor. Preparado para deploy no Render.com.

## Como executar localmente
1. Instale as dependencias:
   ```bash
   npm install
   ```
2. Defina as variaveis (mesma janela do PowerShell):
   ```powershell
   $env:GOOGLE_SHEETS_ID = "<ID-da-planilha>"
   $env:GOOGLE_SHEETS_CREDENTIALS = Get-Content "./service-account.json" -Raw
   ```
3. Inicie o servidor:
   ```bash
   npm start
   ```
4. Acesse:
   - `http://localhost:3000` para registrar gastos
   - `http://localhost:3000/controle.html` para ver os gastos
   - `http://localhost:3000/sacolao.html`, `/dispensa.html`, `/acougue.html`, `/limpeza.html` para ajustar os estoques.

## Deploy no Render
1. Publique este diretorio em um repositario Git.
2. Crie um **Web Service** (ou use o `render.yaml` como blueprint).
3. Configure:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Adicione as variaveis no painel do Render (Environment -> Add Secret):
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_SHEETS_CREDENTIALS` (cole o JSON inteiro)
   - Opcionais abaixo para cada categoria
5. Deploy e abra a URL gerada.

## Variaveis suportadas
| Variavel | Descricao |
| --- | --- |
| `GOOGLE_SHEETS_ID` | ID da planilha (ex.: `1K80WnIJAtTTQpbGKQF5QJk5FNfaAl5ks5nmCI7y9o2s`). |
| `GOOGLE_SHEETS_TAB` (opcional) | Aba usada na categoria **Sacolao** (padrao `inventario`). |
| `GOOGLE_SHEETS_COLUMN` (opcional) | Coluna da categoria **Sacolao** (padrao `F`). |
| `GOOGLE_SHEETS_START_ROW` (opcional) | Primeira linha do Sacolao (padrao `5`). |
| `DISPENSA_TAB`, `DISPENSA_COLUMN`, `DISPENSA_START_ROW` | Parametros equivalentes para **Dispensa** (padroes: mesma aba, coluna `K`, linha `5`). |
| `ACOUGUE_TAB`, `ACOUGUE_COLUMN`, `ACOUGUE_START_ROW` | Parametros equivalentes para **Acougue** (padroes: mesma aba, coluna `P`, linha `5`). |
| `LIMPEZA_TAB`, `LIMPEZA_COLUMN`, `LIMPEZA_START_ROW` | Parametros equivalentes para **Limpeza** (padroes: mesma aba, coluna `U`, linha `5`). |
| `EXPENSES_TAB` (opcional) | Aba usada para o Controle de Gastos (padrao igual a `GOOGLE_SHEETS_TAB`). |
| `EXPENSES_RANGE` (opcional) | Intervalo completo dos gastos (`A5:C200` por padrao). |
| `EXPENSES_START_ROW`, `EXPENSES_END_ROW` | Linhas inicial e final usadas para os gastos (padroes `5` e `200`). |
| `GOOGLE_SHEETS_CREDENTIALS` | JSON da Service Account com acesso de edicao. |

Quando configurado, cada pagina de inventario usa seu intervalo (`E5:F17`, `J5:K50`, `O5:P50`, `T5:U50`) e grava nas colunas `F`, `K`, `P` e `U`. A pagina inicial (formulario) salva novos gastos em `A5:C200` (data, descricao, valor) e `controle.html` lista todos eles.

### Script manual (opcional)
```bash
npm run push:counters -- "1,0,3,0,5,2,0,1,0,0,0,4,2"
```

### Script para enviar ao GitHub
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
│   ├── index.html (formulario de gastos)
│   ├── controle.html
│   ├── sacolao.html
│   ├── dispensa.html
│   ├── acougue.html
│   ├── limpeza.html
│   ├── app.js
│   ├── home.js
│   ├── controle.js
│   └── styles.css
├── scripts/
│   ├── pushCounters.js
│   └── pushToGitHub.ps1
└── README.md
```
