const tableBody = document.querySelector('[data-expenses-list]');
const reloadButton = document.querySelector('#reload-expenses');

init();

function init() {
  loadExpenses();
  reloadButton?.addEventListener('click', () => loadExpenses());
}

async function loadExpenses() {
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="3">Carregando dados...</td></tr>`;
  }

  try {
    const response = await fetch('/api/expenses');
    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const data = await response.json();
    renderExpenses(data.entries ?? []);
  } catch (error) {
    console.error('Erro ao carregar gastos', error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="3">Erro ao carregar dados. Tente novamente.</td></tr>`;
    }
  }
}

function renderExpenses(entries) {
  if (!tableBody) return;

  if (!entries.length) {
    tableBody.innerHTML = `<tr><td colspan="3">Nenhum lançamento encontrado.</td></tr>`;
    return;
  }

  const rows = entries
    .map((entry) => {
      const date = escapeHtml(entry.date || '—');
      const description = escapeHtml(entry.description || '—');
      const value = formatCurrency(entry.amount);
      return `<tr><td>${date}</td><td>${description}</td><td>${value}</td></tr>`;
    })
    .join('');

  tableBody.innerHTML = rows;
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
