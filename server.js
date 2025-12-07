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
const EXPENSES_RANGE = process.env.EXPENSES_RANGE || `A${EXPENSES_START_ROW}:D${EXPENSES_END_ROW}`;
const META_ESSENCIAL_CELL = process.env.META_ESSENCIAL_CELL || 'A3';
const META_NAO_ESSENCIAL_CELL = process.env.META_NAO_ESSENCIAL_CELL || 'B3';
const META_CONTAS_CELL = process.env.META_CONTAS_CELL || 'C3';

const CATEGORY_CONFIG = {
  sacolao: { tab: INVENTORY_TAB, column: INVENTORY_COLUMN, startRow: INVENTORY_START_ROW },
  dispensa: { tab: DISPENSA_TAB, column: DISPENSA_COLUMN, startRow: DISPENSA_START_ROW },
  acougue: { tab: ACOUGUE_TAB, column: ACOUGUE_COLUMN, startRow: ACOUGUE_START_ROW },
  limpeza: { tab: LIMPEZA_TAB, column: LIMPEZA_COLUMN, startRow: LIMPEZA_START_ROW },
};

const INVENTORY_APPEND = {
  sacolao: { tab: INVENTORY_TAB, startCol: 'E', endCol: 'F', startRow: 5, endRow: 200 },
  dispensa: { tab: DISPENSA_TAB, startCol: 'J', endCol: 'K', startRow: 5, endRow: 200 },
  acougue: { tab: ACOUGUE_TAB, startCol: 'O', endCol: 'P', startRow: 5, endRow: 200 },
  limpeza: { tab: LIMPEZA_TAB, startCol: 'T', endCol: 'U', startRow: 5, endRow: 200 },
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/expenses', async (_req, res) => {
  if (!SHEET_ID) return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });
  try {
    const entries = await fetchExpenseEntries();
    const totals = groupTotalsByMonthAndCategory(entries);
    const metaGoals = await readMetaGoals();
    res.json({ entries, categoryTotals: totals, meta: metaGoals });
  } catch (error) {
    console.error('Falha ao carregar gastos', error);
    res.status(500).json({ error: 'Não foi possível recuperar os gastos' });
  }
});

app.post('/api/expenses', async (req, res) => {
  if (typeof req.body !== 'object') return res.status(400).json({ error: 'Corpo inválido' });

  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const amount = Number(req.body.amount);
  const date = req.body.date ? String(req.body.date) : new Date().toISOString().slice(0, 10);
  const type = typeof req.body.type === 'string' ? req.body.type.trim().toLowerCase() : 'essencial';
  const normalizedType =
    type === 'nao_essencial' ? 'nao_essencial' : type === 'contas' ? 'contas' : 'essencial';

  if (!description || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
  }
  if (!SHEET_ID) return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });

  try {
    await upsertExpenseRow([date, description, amount, normalizedType]);
    res.json({ success: true });
  } catch (error) {
    console.error('Falha ao salvar gasto', error);
    res.status(500).json({ error: 'Falha ao salvar o gasto' });
  }
});

app.delete('/api/expenses/:rowIndex', async (req, res) => {
  const rowIndex = Number(req.params.rowIndex);
  if (!Number.isInteger(rowIndex) || rowIndex < EXPENSES_START_ROW || rowIndex > EXPENSES_END_ROW) {
    return res.status(400).json({ error: 'Linha inválida' });
  }
  if (!SHEET_ID) return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });

  try {
    await clearExpenseRow(rowIndex);
    res.json({ success: true });
  } catch (error) {
    console.error('Falha ao excluir gasto', error);
    res.status(500).json({ error: 'Não foi possível excluir o lançamento' });
  }
});

app.post('/api/counters', async (req, res) => {
  if (typeof req.body !== 'object') return res.status(400).json({ error: 'Corpo inválido' });

  const { index, value, category = 'sacolao' } = req.body;
  if (!Number.isInteger(index) || !Number.isInteger(value) || index < 0 || value < 0) {
    return res.status(400).json({ error: 'index e value devem ser inteiros positivos' });
  }
  if (!SHEET_ID) return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });

  const normalizedCategory = String(category).toLowerCase();
  const targetCategory = CATEGORY_CONFIG[normalizedCategory];
  if (!targetCategory) return res.status(400).json({ error: 'Categoria desconhecida' });

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

app.post('/api/inventory', async (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Corpo da requisição inválido' });
  }

  const category = String(req.body.category || 'sacolao').toLowerCase();
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const quantity = Number(req.body.quantity ?? 0);

  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!Number.isFinite(quantity) || quantity < 0) {
    return res.status(400).json({ error: 'Quantidade inválida' });
  }
  if (!SHEET_ID) {
    return res.status(500).json({ error: 'Variável GOOGLE_SHEETS_ID não configurada' });
  }

  const targetCategory = CATEGORY_CONFIG[category];
  if (!targetCategory) return res.status(400).json({ error: 'Categoria desconhecida' });

  const appendConfig = INVENTORY_APPEND[category];
  const startCol = appendConfig?.startCol ?? getPreviousColumn(targetCategory.column);
  const endCol = appendConfig?.endCol ?? targetCategory.column;
  const startRow = appendConfig?.startRow ?? targetCategory.startRow;
  const endRow = appendConfig?.endRow ?? 200;
  const tab = appendConfig?.tab || targetCategory.tab;
  const readRange = `${tab}!${startCol}${startRow}:${endCol}${endRow}`;

  let targetRow = startRow;
  try {
    const sheets = await getSheetsClient();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: readRange,
      majorDimension: 'ROWS',
    });
    const rows = existing.data.values || [];
    const relativeIndex = rows.findIndex((row) => row.every((cell) => !String(cell ?? '').trim()));
    const targetIndex = relativeIndex === -1 ? rows.length : relativeIndex;
    targetRow = startRow + targetIndex;
    if (targetRow > endRow) {
      return res.status(400).json({ error: 'Intervalo de itens está cheio' });
    }
  } catch (err) {
    console.error('Falha ao ler intervalo de itens', err);
    return res.status(500).json({ error: 'Falha ao ler intervalo de itens' });
  }

  try {
    const sheets = await getSheetsClient();
    const range = `${tab}!${startCol}${targetRow}:${endCol}${targetRow}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[name, quantity]] },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Falha ao inserir item no inventário', error);
    res.status(500).json({ error: 'Falha ao salvar item na planilha' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

let cachedSheetsClient;

async function getSheetsClient() {
  if (cachedSheetsClient) return cachedSheetsClient;

  const rawCredentials = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!rawCredentials) throw new Error('Variável GOOGLE_SHEETS_CREDENTIALS não configurada');

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

async function fetchExpenseEntries() {
  const sheets = await getSheetsClient();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!${EXPENSES_RANGE}`,
  });

  return (data.values || [])
    .map((row = [], index) => {
      const date = row[0] || '';
      const description = row[1] || '';
      const amount = parseNumber(row[2]);
      const typeRaw = (row[3] || '').toString().toLowerCase();
      const type =
        typeRaw === 'nao_essencial' ? 'nao_essencial' : typeRaw === 'contas' ? 'contas' : 'essencial';
      if (!date && !description && amount === 0) return null;
      return {
        rowIndex: EXPENSES_START_ROW + index,
        date,
        description,
        amount,
        type,
        monthKey: getCustomMonthKey(date),
      };
    })
    .filter(Boolean);
}

async function readMetaGoals() {
  const sheets = await getSheetsClient();
  const [essencialResp, naoEssencialResp, contasResp] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!${META_ESSENCIAL_CELL}:${META_ESSENCIAL_CELL}`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!${META_NAO_ESSENCIAL_CELL}:${META_NAO_ESSENCIAL_CELL}`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${EXPENSES_TAB}!${META_CONTAS_CELL}:${META_CONTAS_CELL}`,
    }),
  ]);
  return {
    essencial: parseNumber(essencialResp.data.values?.[0]?.[0]),
    nao_essencial: parseNumber(naoEssencialResp.data.values?.[0]?.[0]),
    contas: parseNumber(contasResp.data.values?.[0]?.[0]),
  };
}

function groupTotalsByMonthAndCategory(entries) {
  return entries.reduce((acc, entry) => {
    if (!entry.monthKey) return acc;
    const bucket = acc[entry.monthKey] || { essencial: 0, nao_essencial: 0, contas: 0 };
    bucket[entry.type] = (bucket[entry.type] || 0) + entry.amount;
    acc[entry.monthKey] = bucket;
    return acc;
  }, {});
}

function getCustomMonthKey(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  let year = date.getFullYear();
  let month = date.getMonth(); // 0-based
  const day = date.getDate();
  if (day >= 24) {
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function upsertExpenseRow(rowValues) {
  const sheets = await getSheetsClient();
  const fullRange = `${EXPENSES_TAB}!A${EXPENSES_START_ROW}:D${EXPENSES_END_ROW}`;
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: fullRange,
    majorDimension: 'ROWS',
  });

  const rows = data.values || [];
  const relativeIndex = rows.findIndex((row) => isRowEmpty(row));
  const targetIndex = relativeIndex === -1 ? rows.length : relativeIndex;
  const nextRow = EXPENSES_START_ROW + targetIndex;

  if (nextRow > EXPENSES_END_ROW) throw new Error('Intervalo de despesas está cheio.');

  const writeRange = `${EXPENSES_TAB}!A${nextRow}:D${nextRow}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: writeRange,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowValues] },
  });
}

async function clearExpenseRow(rowIndex) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${EXPENSES_TAB}!A${rowIndex}:D${rowIndex}`,
  });
}

function isRowEmpty(row = []) {
  if (!row || !row.length) return true;
  return row.every((cell) => !String(cell ?? '').trim());
}

function getPreviousColumn(columnLetter) {
  const upper = String(columnLetter || '').trim().toUpperCase();
  if (!/^[A-Z]$/.test(upper) || upper === 'A') throw new Error('Coluna inválida');
  return String.fromCharCode(upper.charCodeAt(0) - 1);
}
