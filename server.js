const path = require('path');
const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;
const SHEET_ID = process.env.GOOGLE_SHEETS_ID || process.env.SHEET_ID;
const INVENTORY_TAB = process.env.GOOGLE_SHEETS_TAB || 'inventario';
const INVENTORY_COLUMN = process.env.GOOGLE_SHEETS_COLUMN || 'F';
const INVENTORY_START_ROW = Number(process.env.GOOGLE_SHEETS_START_ROW ?? 5);

const DISPENSA_TAB = process.env.DISPENSA_TAB || INVENTORY_TAB;
const DISPENSA_COLUMN = process.env.DISPENSA_COLUMN || 'K';
const DISPENSA_START_ROW = Number(process.env.DISPENSA_START_ROW ?? 5);

const ACOUGUE_TAB = process.env.ACOUGUE_TAB || INVENTORY_TAB;
const ACOUGUE_COLUMN = process.env.ACOUGUE_COLUMN || 'P';
const ACOUGUE_START_ROW = Number(process.env.ACOUGUE_START_ROW ?? 5);

const LIMPEZA_TAB = process.env.LIMPEZA_TAB || INVENTORY_TAB;
const LIMPEZA_COLUMN = process.env.LIMPEZA_COLUMN || 'U';
const LIMPEZA_START_ROW = Number(process.env.LIMPEZA_START_ROW ?? 5);

const EXPENSES_TAB = process.env.EXPENSES_TAB || INVENTORY_TAB;
const EXPENSES_START_ROW = Number(process.env.EXPENSES_START_ROW ?? 5);
const EXPENSES_END_ROW = Number(process.env.EXPENSES_END_ROW ?? 200);
const EXPENSES_RANGE = process.env.EXPENSES_RANGE || `A${EXPENSES_START_ROW}:C${EXPENSES_END_ROW}`;

const CATEGORY_CONFIG = {
  sacolao: {
    tab: INVENTORY_TAB,
    column: INVENTORY_COLUMN,
    startRow: INVENTORY_START_ROW,
  },
  dispensa: {
    tab: DISPENSA_TAB,
    column: DISPENSA_COLUMN,
    startRow: DISPENSA_START_ROW,
  },
  acougue: {
    tab: ACOUGUE_TAB,
    column: ACOUGUE_COLUMN,
    startRow: ACOUGUE_START_ROW,
  },
  limpeza: {
    tab: LIMPEZA_TAB,
    column: LIMPEZA_COLUMN,
    startRow: LIMPEZA_START_ROW,
  },
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/expenses', async (_req, res) => {
  if (!SHEET_ID) {
    return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });
  }

  try {
    const sheets = await getSheetsClient();
    const range = `${EXPENSES_TAB}!${EXPENSES_RANGE}`;
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range,
    });

    const entries = (data.values || []).map((row) => ({
      date: row[0] || '',
      description: row[1] || '',
      amount: row[2] || '',
    }));

    res.json({ entries });
  } catch (error) {
    console.error('Falha ao carregar gastos', error);
    res.status(500).json({ error: 'Não foi possível recuperar os gastos' });
  }
});

app.post('/api/expenses', async (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisição inválido' });
  }

  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const amount = Number(req.body.amount);
  const date = req.body.date ? String(req.body.date) : new Date().toISOString().slice(0, 10);

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
  }

  if (!SHEET_ID) {
    return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });
  }

  try {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!${EXPENSES_RANGE}`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[date, description, amount]] },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Falha ao salvar gasto no Google Sheets', error);
    res.status(500).json({ error: 'Falha ao salvar o gasto' });
  }
});

app.post('/api/counters', async (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisição inválido' });
  }

  const { index, value, category = 'sacolao' } = req.body;

  if (!Number.isInteger(index) || !Number.isInteger(value) || index < 0 || value < 0) {
    return res.status(400).json({ error: 'index e value devem ser inteiros positivos' });
  }

  if (!SHEET_ID) {
    return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });
  }

  const normalizedCategory = String(category).toLowerCase();
  const targetCategory = CATEGORY_CONFIG[normalizedCategory];

  if (!targetCategory) {
    return res.status(400).json({ error: 'Categoria desconhecida' });
  }

  try {
    const sheets = await getSheetsClient();
    const row = targetCategory.startRow + index;
    const range = `${targetCategory.tab}!${targetCategory.column}${row}`;

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
