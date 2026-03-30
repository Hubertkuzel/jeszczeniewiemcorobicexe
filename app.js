const STORAGE_KEY = "finance-tracker-transactions-v1";
const CURRENCY = "PLN";

const typeInput = document.getElementById("typeInput");
const amountInput = document.getElementById("amountInput");
const dateInput = document.getElementById("dateInput");
const categoryInput = document.getElementById("categoryInput");
const descriptionInput = document.getElementById("descriptionInput");
const categoryDatalist = document.getElementById("categories");
const txForm = document.getElementById("txForm");
const txBody = document.getElementById("txBody");
const emptyState = document.getElementById("emptyState");
const monthSelect = document.getElementById("monthSelect");
const clearAllBtn = document.getElementById("clearAllBtn");

const incomeTotalEl = document.getElementById("incomeTotal");
const expenseTotalEl = document.getElementById("expenseTotal");
const balanceTotalEl = document.getElementById("balanceTotal");
const txCountEl = document.getElementById("txCount");

function formatPLN(amount) {
  const nf = new Intl.NumberFormat("pl-PL", { style: "currency", currency: CURRENCY });
  return nf.format(amount);
}

function monthKeyFromDateString(dateStr) {
  // dateStr format: YYYY-MM-DD
  if (!dateStr || dateStr.length < 7) return "";
  return dateStr.slice(0, 7);
}

function todayLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback UUID-ish. Good enough for local storage.
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape validation.
    return parsed
      .filter((t) => t && typeof t === "object")
      .map((t) => ({
        id: String(t.id || safeUUID()),
        type: t.type === "income" ? "income" : "expense",
        amount: Number(t.amount || 0),
        date: String(t.date || ""),
        category: String(t.category || "").trim(),
        description: String(t.description || "").trim(),
      }))
      .filter((t) => t.date && t.category && Number.isFinite(t.amount) && t.amount >= 0);
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function getAllCategories(transactions) {
  const set = new Set();
  for (const t of transactions) {
    if (t.category) set.add(t.category);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
}

function populateCategoryDatalist(transactions) {
  const categories = getAllCategories(transactions);
  categoryDatalist.innerHTML = "";
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c;
    categoryDatalist.appendChild(opt);
  }
}

function getAvailableMonths(transactions) {
  const set = new Set();
  for (const t of transactions) {
    const mk = monthKeyFromDateString(t.date);
    if (mk) set.add(mk);
  }
  // Ensure current month is present for nicer UX.
  set.add(monthKeyFromDateString(todayLocalDateString()));
  return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
}

function fillMonthSelect(months, selectedMonth) {
  monthSelect.innerHTML = "";
  for (const mk of months) {
    const opt = document.createElement("option");
    opt.value = mk;
    opt.textContent = mk; // YYYY-MM
    monthSelect.appendChild(opt);
  }
  monthSelect.value = selectedMonth || months[0] || monthKeyFromDateString(todayLocalDateString());
}

function computeTotalsForMonth(transactions, selectedMonth) {
  let income = 0;
  let expenses = 0;
  let count = 0;
  const filtered = transactions.filter((t) => monthKeyFromDateString(t.date) === selectedMonth);
  for (const t of filtered) {
    count += 1;
    if (t.type === "income") income += t.amount;
    else expenses += t.amount;
  }
  return { income, expenses, balance: income - expenses, count };
}

function render(transactions, selectedMonth) {
  const months = getAvailableMonths(transactions);
  fillMonthSelect(months, selectedMonth);

  // Update datalist from current dataset.
  populateCategoryDatalist(transactions);

  const { income, expenses, balance, count } = computeTotalsForMonth(transactions, monthSelect.value);

  incomeTotalEl.textContent = formatPLN(income);
  expenseTotalEl.textContent = formatPLN(expenses);
  balanceTotalEl.textContent = formatPLN(balance);
  balanceTotalEl.classList.toggle("negative", balance < 0);
  txCountEl.textContent = String(count);

  const monthTransactions = transactions
    .filter((t) => monthKeyFromDateString(t.date) === monthSelect.value)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  txBody.innerHTML = "";
  emptyState.style.display = monthTransactions.length ? "none" : "block";

  for (const t of monthTransactions) {
    const tr = document.createElement("tr");

    const typePill = document.createElement("span");
    typePill.className = `txType ${t.type}`;
    typePill.textContent = t.type === "income" ? "Przychód" : "Wydatek";

    const amountSign = t.type === "expense" ? -1 : 1;
    const amountCell = formatPLN(t.amount * amountSign);

    tr.innerHTML = `
      <td>${t.date}</td>
      <td></td>
      <td>${amountCell}</td>
      <td>${escapeHtml(t.category)}</td>
      <td>${escapeHtml(t.description || "-")}</td>
      <td></td>
    `;

    tr.children[1].appendChild(typePill);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "iconBtn";
    deleteBtn.textContent = "Usuń";
    deleteBtn.addEventListener("click", () => {
      const ok = window.confirm("Usunąć tę transakcję?");
      if (!ok) return;
      const next = transactions.filter((x) => x.id !== t.id);
      saveTransactions(next);
      state.transactions = next;
      render(state.transactions, monthSelect.value);
    });
    tr.children[5].appendChild(deleteBtn);

    txBody.appendChild(tr);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let state = {
  transactions: [],
};

function init() {
  // Sensible defaults.
  dateInput.value = todayLocalDateString();

  state.transactions = loadTransactions();

  const months = getAvailableMonths(state.transactions);
  const selectedMonth = months[0] || monthKeyFromDateString(todayLocalDateString());
  monthSelect.value = selectedMonth;

  render(state.transactions, selectedMonth);

  monthSelect.addEventListener("change", () => {
    render(state.transactions, monthSelect.value);
  });

  txForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const type = typeInput.value === "income" ? "income" : "expense";
    const amount = Number(amountInput.value);
    const date = dateInput.value;
    const category = categoryInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!date) {
      alert("Podaj datę.");
      return;
    }
    if (!category) {
      alert("Podaj kategorię.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Kwota musi być większa od 0.");
      return;
    }

    const tx = {
      id: safeUUID(),
      type,
      amount,
      date,
      category,
      description,
    };

    const next = [...state.transactions, tx].sort((a, b) => (a.date < b.date ? 1 : -1));
    saveTransactions(next);
    state.transactions = next;

    // Jump to month of the added transaction.
    const mk = monthKeyFromDateString(date);
    if (mk) monthSelect.value = mk;

    // Reset form (keep type).
    amountInput.value = "";
    descriptionInput.value = "";
    render(state.transactions, monthSelect.value);
  });

  clearAllBtn.addEventListener("click", () => {
    const ok = window.confirm("Na pewno wyczyścić WSZYSTKIE transakcje?");
    if (!ok) return;
    saveTransactions([]);
    state.transactions = [];
    // Reset month to current.
    monthSelect.value = monthKeyFromDateString(todayLocalDateString());
    render(state.transactions, monthSelect.value);
  });
}

window.addEventListener("DOMContentLoaded", init);

