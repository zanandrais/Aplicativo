const state = {
  entries: [],
  expenseTotals: {},
  reserveReal: 0,
  reserveBase: 0,
};

const form = document.querySelector('#income-form');
const dateInput = document.querySelector('#income-date');
const todayButton = document.querySelector('#income-today');
const descriptionInput = document.querySelector('#income-description');
const amountInput = document.querySelector('#income-amount');
const feedback = document.querySelector('[data-feedback]');
const reserveInput = document.querySelector('#reserve-real');
const reserveButton = document.querySelector('#reserve-save');
const reserveTheoreticalNode = document.querySelector('[data-reserve-theoretical]');
const monthSelect = document.querySelector('#income-month');
const tableBody = document.querySelector('[data-income-list]');
const totalNode = document.querySelector('[data-income-total]');
const reloadButton = document.querySelector('#reload-income');

init();

function init() {
  setToday();
  loadIncomes();
  todayButton?.addEventListener('click', (event) => {
    event.preventDefault();
    setToday();
  });
  reloadButton?.addEventListener('click', () => loadIncomes());
  monthSelect?.addEventListener('change', () => {
    renderTable();
    renderReserve();
  });
  form?.addEventListener('submit', handleSubmitIncome);
  reserveButton?.addEventListener('click', handleSaveReserve);
}

async function loadIncomes() {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="3">Carregando dados...</td></tr>`;
  }

  try {
    const response = await fetch('/api/incomes');
    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const data = await response.json();
    state.entries = (data.entries ?? []).map(normalizeIncome).filter(Boolean);
    state.expenseTotals = data.expenseTotals || {};
    state.reserveReal = Number(data.reserveReal) || 0;
    state.reserveBase = Number(data.reserveBase) || 0;

    buildMonthOptions();
    renderTable();
    renderReserve();
    if (reserveInput) {
      reserveInput.value = state.reserveReal ? state.reserveReal : '';
    }
  } catch (error) {
    console.error('Erro ao carregar entradas', error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="3">Erro ao carregar dados.</td></tr>`;
    }
  }
}

function normalizeIncome(entry = {}) {
  if (!entry.date && !entry.description && !entry.amount) return null;
  const date = entry.date || '';
  const amount = Number(entry.amount) || 0;
  return {
    date,
    description: entry.description || '',
    amount,
    monthKey: getMonthKey(date),
  };
}

function getMonthKey(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthOptions() {
  if (!monthSelect) return;
  const keys = Array.from(
    new Set(state.entries.map((entry) => entry.monthKey).filter(Boolean))
  )
    .concat(Object.keys(state.expenseTotals || {}))
    .filter(Boolean);
  const unique = Array.from(new Set(keys)).sort().reverse();
  const current = getMonthKey(new Date().toISOString().slice(0, 10));
  if (!unique.includes(current)) unique.unshift(current);

  if (!unique.length) {
    monthSelect.innerHTML = '<option value="">Todos</option>';
    monthSelect.value = '';
    return;
  }

  monthSelect.innerHTML = unique
    .map((key) => `<option value="${key}">${formatMonthLabel(key)}</option>`)
    .join('');
  monthSelect.value = monthSelect.querySelector(`option[value="${current}"]`) ? current : unique[0];
}

function formatMonthLabel(key) {
  if (!key) return 'Todos';
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function renderTable() {
  if (!tableBody) return;
  const filter = monthSelect?.value;
  const filtered = state.entries.filter((entry) => {
    if (!filter) return true;
    return entry.monthKey === filter;
  });

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="3">Nenhuma entrada para o período.</td></tr>`;
    updateIncomeTotal(0);
    return;
  }

  const rows = filtered
    .map((entry) => {
      const date = escapeHtml(entry.date || '—');
      const description = escapeHtml(entry.description || '—');
      const value = formatCurrency(entry.amount);
      return `<tr><td>${date}</td><td>${description}</td><td>${value}</td></tr>`;
    })
    .join('');

  tableBody.innerHTML = rows;
  updateIncomeTotal(filtered.reduce((sum, entry) => sum + entry.amount, 0));
}

function renderReserve() {
  if (!reserveTheoreticalNode) return;
  const filter = monthSelect?.value;
  const monthlyExpenses = state.expenseTotals?.[filter] || 0;
  const theoretical = state.reserveBase - monthlyExpenses;
  reserveTheoreticalNode.textContent = formatCurrency(theoretical);
}

function updateIncomeTotal(amount) {
  if (!totalNode) return;
  totalNode.textContent = formatCurrency(amount);
}

function setToday() {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  if (dateInput) {
    dateInput.value = iso;
  }
}

async function handleSubmitIncome(event) {
  event.preventDefault();
  clearFeedback();

  const description = descriptionInput?.value.trim();
  const amountValue = amountInput?.value.trim();
  const dateValue = dateInput?.value;

  if (!description || !amountValue || !dateValue) {
    setFeedback('Preencha todos os campos.', 'error');
    return;
  }

  const amount = Number(amountValue.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    setFeedback('Informe um valor válido.', 'error');
    return;
  }

  setFeedback('Salvando entrada...', 'pending');

  try {
    const response = await fetch('/api/incomes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount, date: dateValue }),
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    form?.reset();
    setToday();
    setFeedback('Entrada salva com sucesso!', 'success');
    await loadIncomes();
  } catch (error) {
    console.error('Falha ao salvar entrada', error);
    setFeedback('Não foi possível salvar a entrada.', 'error');
  }
}

async function handleSaveReserve() {
  if (!reserveInput) return;
  const value = Number(reserveInput.value.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0) {
    alert('Informe um valor válido para a reserva.');
    return;
  }

  try {
    const response = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }
    state.reserveReal = value;
    alert('Reserva atualizada com sucesso!');
  } catch (error) {
    console.error('Falha ao salvar reserva', error);
    alert('Não foi possível salvar a reserva.');
  }
}

function setFeedback(message, status) {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.status = status;
}

function clearFeedback() {
  if (!feedback) return;
  feedback.textContent = '';
  delete feedback.dataset.status;
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
  const number = Number(amount);
  if (!Number.isFinite(number)) {
    return 'R$ 0,00';
  }
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
