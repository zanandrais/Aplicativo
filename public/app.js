const MIN_VALUE = 0;
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSknwMWFA6Akwkw3sihnQNjwJG9qAe_3dcAqevkqmf5LFKYtodqVOdJeDz7lDg0Klyi0dH24H2LH1-5/pub?gid=1183098319&single=true&output=csv&range=E5:F17';

const state = {
  entries: [],
  counters: new Map(),
};

const listElement = document.querySelector('.counter-list');
const statusElement = document.querySelector('[data-status]');

init();

async function init() {
  setStatus('Carregando nomes...');

  try {
    const entries = await fetchInventory();

    if (!entries.length) {
      listElement.innerHTML = '';
      setStatus('Nenhum nome encontrado no inventário.');
      return;
    }

    renderList(entries);
    setStatus('');
  } catch (error) {
    console.error('Erro ao carregar nomes do inventário', error);
    setStatus('Erro ao carregar nomes. Tente novamente mais tarde.');
  }
}

async function fetchInventory() {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Falha ao buscar CSV (${response.status})`);
  }

  const text = await response.text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseInventoryRow)
    .filter((entry) => entry.name);
}

function parseInventoryRow(row) {
  const [rawName = '', rawValue = ''] = row.split(',');
  return {
    name: rawName.trim(),
    value: parseCounterValue(rawValue),
  };
}

function parseCounterValue(cell) {
  if (!cell) return 0;
  const normalized = cell.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function renderList(entries) {
  state.entries = entries;
  state.counters.clear();

  const markup = entries.map((entry, index) => createCounterMarkup(entry, index)).join('');
  listElement.innerHTML = markup;

  entries.forEach((entry, index) => {
    state.counters.set(index, entry.value ?? 0);
    syncDisplay(index);
  });
}

function createCounterMarkup(entry, index) {
  const safeName = escapeHtml(entry.name);
  const startValue = Number.isFinite(entry.value) ? entry.value : 0;
  return `
    <li class="counter-item">
      <span class="counter-item__name">${safeName}</span>
      <div class="counter-item__controls" data-id="${index}">
        <button class="counter-btn" data-direction="down" aria-label="Diminuir valor para ${safeName}">-</button>
        <output class="counter-value" aria-label="Pontuação de ${safeName}">${startValue}</output>
        <button class="counter-btn" data-direction="up" aria-label="Aumentar valor para ${safeName}">+</button>
      </div>
    </li>
  `;
}

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syncDisplay(index) {
  const wrapper = listElement.querySelector(`.counter-item__controls[data-id="${index}"]`);
  if (!wrapper) return;

  const valueNode = wrapper.querySelector('.counter-value');
  const decrement = wrapper.querySelector(".counter-btn[data-direction='down']");
  const value = state.counters.get(index) ?? 0;

  if (valueNode) {
    valueNode.textContent = value;
  }

  if (decrement) {
    decrement.disabled = value <= MIN_VALUE;
  }
}

function updateCounter(index, direction) {
  const current = state.counters.get(index) ?? 0;
  const delta = direction === 'up' ? 1 : -1;
  const nextValue = Math.max(MIN_VALUE, current + delta);

  state.counters.set(index, nextValue);
  syncDisplay(index);
  persistCounter(index, nextValue);
}

function setStatus(message) {
  if (!statusElement) return;
  statusElement.textContent = message;
}

async function persistCounter(index, value) {
  try {
    const response = await fetch('/api/counters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, value }),
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }
  } catch (error) {
    console.error('Falha ao salvar valor no Google Sheets', error);
    setStatus('Não foi possível salvar o valor na planilha. Verifique o servidor.');
  }
}

listElement?.addEventListener('click', (event) => {
  const button = event.target.closest('.counter-btn');
  if (!button) return;

  const wrapper = button.closest('.counter-item__controls');
  const direction = button.dataset.direction;
  const index = Number(wrapper?.dataset.id);

  if (!Number.isFinite(index) || !direction) return;

  updateCounter(index, direction);
});
