const state = {
  entries: [],
  categoryTotals: {},
  meta: { essencial: 0, nao_essencial: 0, contas: 0 },
};

const tableBody = document.querySelector('[data-expenses-list]');
const reloadButton = document.querySelector('#reload-expenses');
const monthSelect = document.querySelector('#month-filter');
const categorySelect = document.querySelector('#category-filter');
const totalNode = document.querySelector('[data-expenses-total]');
const metaNode = document.querySelector('[data-expenses-meta]');
const balanceNode = document.querySelector('[data-expenses-balance]');

init();

function init() {
  loadExpenses();
  reloadButton?.addEventListener('click', () => loadExpenses());
  monthSelect?.addEventListener('change', () => renderFiltered());
  categorySelect?.addEventListener('change', () => renderFiltered());
}

async function loadExpenses() {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="5">Carregando dados...</td></tr>`;
  }

  try {
    const response = await fetch('/api/expenses');
    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const data = await response.json();
    state.entries = (data.entries ?? []).map(normalizeEntry).filter(Boolean);
    state.categoryTotals = data.categoryTotals || {};
    state.meta = data.meta || state.meta;

    buildMonthOptions();
    renderFiltered();
  } catch (error) {
    console.error('Erro ao carregar gastos', error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados. Tente novamente.</td></tr>`;
    }
  }
}

function normalizeEntry(entry) {
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
    type: entry.type || 'essencial',
    monthKey: getMonthKey(entry.date),
  };
}

function buildMonthOptions() {
  if (!monthSelect) return;
  const keys = Array.from(new Set(state.entries.map((entry) => entry.monthKey).filter(Boolean)))
    .sort()
    .reverse();
  const current = getMonthKey(new Date().toISOString().slice(0, 10));
  if (current && !keys.includes(current)) {
    keys.unshift(current);
  }

  if (!keys.length) {
    monthSelect.innerHTML = '<option value="">Todos</option>';
    monthSelect.value = '';
    return;
  }

  monthSelect.innerHTML = keys
    .map((key) => `<option value="${key}">${formatMonthLabel(key)}</option>`)
    .join('');
  monthSelect.value = monthSelect.querySelector(`option[value="${current}"]`) ? current : keys[0];
}

function renderFiltered() {
  if (!tableBody) return;
  const monthFilter = monthSelect?.value || '';
  const categoryFilter = categorySelect?.value || '';

  const filtered = state.entries.filter((entry) => {
    if (monthFilter && entry.monthKey !== monthFilter) return false;
    if (categoryFilter && entry.type !== categoryFilter) return false;
    return true;
  });

  if (!filtered.length) {
    tableBody.innerHTML = `<tr><td colspan="5">Nenhum lançamento encontrado.</td></tr>`;
    updateSummaries(0);
    return;
  }

  const rows = filtered
    .map((entry) => {
      const date = escapeHtml(entry.date || '-');
      const description = escapeHtml(entry.description || '-');
      const value = formatCurrency(entry.amount);
      const category =
        entry.type === 'nao_essencial'
          ? 'Não essencial'
          : entry.type === 'contas'
          ? 'Contas'
          : 'Essencial';
      return `
        <tr>
          <td>${date}</td>
          <td>${description}</td>
          <td class="value-cell">${value}</td>
          <td>${category}</td>
          <td class="actions-cell"><button class="ghost-btn" data-delete data-row="${entry.rowIndex}">Excluir</button></td>
        </tr>
      `;
    })
    .join('');

  tableBody.innerHTML = rows;
  tableBody.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => handleDelete(button.dataset.row));
  });

  const total = filtered.reduce((sum, entry) => sum + entry.amount, 0);
  updateSummaries(total);
}

function updateSummaries(amount) {
  if (totalNode) {
    totalNode.textContent = formatCurrency(amount);
  }

  const categoryFilter = categorySelect?.value;
  if (!categoryFilter || !metaNode || !balanceNode) {
    if (metaNode) metaNode.textContent = 'R$ 0,00';
    if (balanceNode) balanceNode.textContent = 'R$ 0,00';
    return;
  }

  const metaValue =
    categoryFilter === 'nao_essencial'
      ? state.meta.nao_essencial || 0
      : categoryFilter === 'contas'
      ? state.meta.contas || 0
      : state.meta.essencial || 0;
  metaNode.textContent = formatCurrency(metaValue);
  balanceNode.textContent = formatCurrency(metaValue - amount);
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

function getMonthKey(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(key) {
  if (!key) return 'Todos';
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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
