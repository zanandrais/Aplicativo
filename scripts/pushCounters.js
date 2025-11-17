const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEETS_ID || process.env.SHEET_ID;
const INVENTORY_TAB = process.env.GOOGLE_SHEETS_TAB || 'inventario';
const INVENTORY_COLUMN = process.env.GOOGLE_SHEETS_COLUMN || 'F';
const INVENTORY_START_ROW = Number(process.env.GOOGLE_SHEETS_START_ROW ?? 5);

async function main() {
  if (!SHEET_ID) {
    throw new Error('Defina a variável GOOGLE_SHEETS_ID com o ID da planilha.');
  }

  const valuesArg = process.argv[2];
  if (!valuesArg) {
    throw new Error('Informe os valores separados por vírgula. Ex.: "node scripts/pushCounters.js 1,0,3"');
  }

  const values = valuesArg
    .split(',')
    .map((token) => Number(token.trim()))
    .filter((value) => !Number.isNaN(value));

  if (!values.length) {
    throw new Error('Não foi possível interpretar nenhum número do argumento.');
  }

  const sheets = await getSheetsClient();
  const endRow = INVENTORY_START_ROW + values.length - 1;
  const range = `${INVENTORY_TAB}!${INVENTORY_COLUMN}${INVENTORY_START_ROW}:${INVENTORY_COLUMN}${endRow}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: values.map((value) => [value]) },
  });

  console.log(`Atualizado ${values.length} células em ${range}`);
}

async function getSheetsClient() {
  const rawCredentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!rawCredentials) {
    throw new Error('Defina GOOGLE_SHEETS_CREDENTIALS com o JSON completo da Service Account.');
  }

  let credentials;
  try {
    credentials = JSON.parse(rawCredentials);
  } catch (error) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS não contém JSON válido.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
