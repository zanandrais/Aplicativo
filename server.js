const path = require('path');
const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || process.env.SHEET_ID;
const INVENTORY_TAB = process.env.GOOGLE_SHEETS_TAB || 'inventario';
const INVENTORY_COLUMN = process.env.GOOGLE_SHEETS_COLUMN || 'F';
const INVENTORY_START_ROW = Number(process.env.GOOGLE_SHEETS_START_ROW ?? 5);

app.use(express.json());

// Serve the static front-end built with Flexbox controls
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/counters', async (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisição inválido' });
  }

  const { index, value } = req.body;

  if (!Number.isInteger(index) || !Number.isInteger(value) || index < 0 || value < 0) {
    return res.status(400).json({ error: 'index e value devem ser inteiros positivos' });
  }

  if (!SHEET_ID) {
    return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });
  }

  try {
    const sheets = await getSheetsClient();
    const row = INVENTORY_START_ROW + index;
    const range = `${INVENTORY_TAB}!${INVENTORY_COLUMN}${row}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Falha ao atualizar célula no Google Sheets', error);
    res.status(500).json({ error: 'Falha ao salvar valor na planilha' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

let cachedSheetsClient;

async function getSheetsClient() {
  if (cachedSheetsClient) return cachedSheetsClient;

  const rawCredentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!rawCredentials) {
    throw new Error('Variável GOOGLE_SHEETS_CREDENTIALS não configurada');
  }

  let credentials;
  try {
    credentials = JSON.parse(rawCredentials);
  } catch {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS não contém JSON válido');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  cachedSheetsClient = google.sheets({ version: 'v4', auth });
  return cachedSheetsClient;
}
