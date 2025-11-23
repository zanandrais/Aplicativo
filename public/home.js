const form = document.querySelector('#expense-form');
const dateInput = document.querySelector('#expense-date');
const todayButton = document.querySelector('#expense-today');
const descriptionInput = document.querySelector('#expense-description');
const amountInput = document.querySelector('#expense-amount');
const feedback = document.querySelector('[data-feedback]');

init();

function init() {
  setToday();

  todayButton?.addEventListener('click', (event) => {
    event.preventDefault();
    setToday();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFeedback();

    const payload = buildPayload();
    if (!payload) return;

    setFeedback('Salvando gasto...', 'pending');

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
      }

      form.reset();
      setToday();
      setFeedback('Gasto salvo com sucesso!', 'success');
    } catch (error) {
      console.error('Falha ao salvar gasto', error);
      setFeedback('Não foi possível salvar o gasto. Verifique o servidor.', 'error');
    }
  });
}

function buildPayload() {
  const description = descriptionInput?.value.trim();
  const amountValue = amountInput?.value.trim();
  const dateValue = dateInput?.value;

  if (!description || !amountValue || !dateValue) {
    setFeedback('Preencha todos os campos.', 'error');
    return null;
  }

  const amount = Number(amountValue.replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) {
    setFeedback('Informe um valor válido.', 'error');
    return null;
  }

  return { description, amount, date: dateValue };
}

function setToday() {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  if (dateInput) {
    dateInput.value = iso;
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
