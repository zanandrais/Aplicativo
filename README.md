# Flex Counter Service

Aplicação Node + Express com front-end Flexbox que exibe listas do Google Sheets e permite ajustar quantidades com botões +/-. Preparado para deploy no Render.com.

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
4. Acesse http://localhost:3000 (Sacolão), http://localhost:3000/dispensa.html, http://localhost:3000/acougue.html ou http://localhost:3000/limpeza.html.

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
   - Opcionais para cada categoria conforme tabela abaixo
5. Deploy e abra a URL gerada.

## Sincronização com Google Sheets (Sacolão, Dispensa, Açougue e Limpeza)
| Variável | Descrição |
| --- | --- |
| `GOOGLE_SHEETS_ID` | ID da planilha (ex.: `1K80WnIJAtTTQpbGKQF5QJk5FNfaAl5ks5nmCI7y9o2s`). |
| `GOOGLE_SHEETS_TAB` (opcional) | Aba usada para leitura/escrita da categoria **Sacolão** (padrão `inventario`). |
| `GOOGLE_SHEETS_COLUMN` (opcional) | Coluna onde os valores da categoria **Sacolão** são gravados (padrão `F`). |
| `GOOGLE_SHEETS_START_ROW` (opcional) | Primeira linha da categoria **Sacolão** (padrão `5`). |
| `DISPENSA_TAB` (opcional) | Aba usada na categoria **Dispensa** (padrão igual ao valor de `GOOGLE_SHEETS_TAB`). |
| `DISPENSA_COLUMN` (opcional) | Coluna usada na categoria **Dispensa** (padrão `K`). |
| `DISPENSA_START_ROW` (opcional) | Primeira linha da categoria **Dispensa** (padrão `5`). |
| `ACOUGUE_TAB` (opcional) | Aba utilizada pela categoria **Açougue** (padrão igual a `GOOGLE_SHEETS_TAB`). |
| `ACOUGUE_COLUMN` (opcional) | Coluna onde o Açougue grava os valores (padrão `P`). |
| `ACOUGUE_START_ROW` (opcional) | Primeira linha utilizada no Açougue (padrão `5`). |
| `LIMPEZA_TAB` (opcional) | Aba utilizada pela categoria **Limpeza** (padrão igual a `GOOGLE_SHEETS_TAB`). |
| `LIMPEZA_COLUMN` (opcional) | Coluna onde Limpeza grava valores (padrão `U`). |
| `LIMPEZA_START_ROW` (opcional) | Primeira linha utilizada em Limpeza (padrão `5`). |
| `GOOGLE_SHEETS_CREDENTIALS` | JSON da Service Account com acesso de edição. |

**Gerando o JSON**
1. Google Cloud Console → APIs e serviços → habilite **Google Sheets API**.
2. Crie uma **Service Account** e gere uma chave **JSON**.
3. Compartilhe a planilha com o e-mail da Service Account (permissão de editor).
4. Use `Get-Content <arquivo>.json -Raw` para preencher `GOOGLE_SHEETS_CREDENTIALS`.

Quando configurado, a página principal (`/` ou `index.html`) lê automaticamente os nomes/quantidades em `E5:F17` (Sacolão) e envia os novos valores para `inventario!F5:F17`. As páginas `dispensa.html`, `acougue.html` e `limpeza.html` fazem o mesmo para `J5:K50`, `O5:P50` e `T5:U50`, escrevendo respectivamente em `K`, `P` e `U`. Links no topo de todas as páginas permitem alternar entre as quatro categorias.

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
│   ├── dispensa.html
│   ├── styles.css
│   └── app.js
├── scripts/
│   ├── pushCounters.js
│   └── pushToGitHub.ps1
└── README.md
```
