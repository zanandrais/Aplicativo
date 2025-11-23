const state = {
  entries: [],
  months: [],
};

const tableBody = document.querySelector('[data-expenses-list]');
const reloadButton = document.querySelector('#reload-expenses');
const monthSelect = document.querySelector('#month-filter');
const totalNode = document.querySelector('[data-expenses-total]');

init();

function init() {
  loadExpenses();
  reloadButton?.addEventListener('click', () => loadExpenses());
  monthSelect?.addEventListener('change', () => renderFiltered());
}

async function loadExpenses() {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="4">Carregando dados...</td></tr>`;
  }

  try {
    const response = await fetch('/api/expenses');
    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const data = await response.json();
    state.entries = (data.entries ?? []).map(normalizeEntry).filter(Boolean);
    buildMonthOptions();
    renderFiltered();
  } catch (error) {
    console.error('Erro ao carregar gastos', error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4">Erro ao carregar dados. Tente novamente.</td></tr>`;
    }
  }
}

function normalizeEntry(entry, index) {
  if (!entry) return null;
  const amount = Number(entry.amount);
  if (!entry.date && !entry.description && !Number.isFinite(amount)) {
    return null;
  }
  return {
    rowIndex: entry.rowIndex,
    date: entry.date || '',
    description: entry.description || '',
    amount: Number.isFinite(amount) ? amount : 0,
    monthKey: getMonthKey(entry.date),
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
  const uniqueKeys = new Set();
  state.entries.forEach((entry) => {
    if (entry.monthKey) uniqueKeys.add(entry.monthKey);
  });
  const keys = Array.from(uniqueKeys).sort().reverse();
  const current = getMonthKey(new Date().toISOString().slice(0, 10));
  if (!keys.includes(current)) keys.unshift(current);

  monthSelect.innerHTML = keys
    .map((key) => `<option value="${key}">${formatMonthLabel(key)}</option>`)
    .join('');
  if (keys.length === 0) {
    monthSelect.innerHTML = '<option value="">Todos</option>';
  }
  monthSelect.value = monthSelect.querySelector(`option[value="${current}"]`) ? current : keys[0] || '';
}

function formatMonthLabel(key) {
  if (!key) return 'Todos';
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function renderFiltered() {
  if (!tableBody) return;
  const filter = monthSelect?.value;
  const filtered = state.entries.filter((entry) => {
    if (!filter) return true;
    return entry.monthKey === filter;
  });

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="4">Nenhum lançamento encontrado.</td></tr>`;
    updateTotal(0);
    return;
  }

  const rows = filtered
    .map((entry) => {
      const date = escapeHtml(entry.date || '—');
      const description = escapeHtml(entry.description || '—');
      const value = formatCurrency(entry.amount);
      return `
        <tr>
          <td>${date}</td>
          <td>${description}</td>
          <td>${value}</td>
          <td><button class="ghost-btn" data-delete data-row="${entry.rowIndex}">Excluir</button></td>
        </tr>
      `;
    })
    .join('');

  tableBody.innerHTML = rows;
  tableBody.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => handleDelete(button.dataset.row));
  });

  const total = filtered.reduce((sum, entry) => sum + entry.amount, 0);
  updateTotal(total);
}

function updateTotal(amount) {
  if (!totalNode) return;
  totalNode.textContent = formatCurrency(amount);
}

async function handleDelete(rowIndex) {
  if (!rowIndex) return;
  const confirmed = window.confirm('Deseja realmente excluir este lançamento?');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/expenses/${rowIndex}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }
    await loadExpenses();
  } catch (error) {
    console.error('Erro ao excluir gasto', error);
    alert('Não foi possível excluir o lançamento.');
  }
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
