const STORAGE_KEY = "finance-tracker-transactions-v1";
const STORAGE_KEY_CATEGORIES = "finance-tracker-categories-v1";
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

const categoryForm = document.getElementById("categoryForm");
const newCategoryInput = document.getElementById("newCategoryInput");
const categoryListEl = document.getElementById("categoryList");
const categoriesEmptyStateEl = document.getElementById("categoriesEmptyState");

const incomeTotalEl = document.getElementById("incomeTotal");
const expenseTotalEl = document.getElementById("expenseTotal");
const balanceTotalEl = document.getElementById("balanceTotal");
const txCountEl = document.getElementById("txCount");

const chartModeSelect = document.getElementById("chartModeSelect");
const donutChartCanvas = document.getElementById("donutChart");
const chartLegendEl = document.getElementById("chartLegend");
const chartEmptyStateEl = document.getElementById("chartEmptyState");

/**
 * Formatuje kwotę w PLN zgodnie z ustawieniami lokalnymi przeglądarki.
 * @param {number} amount
 * @returns {string}
 */
function formatPLN(amount) {
  const nf = new Intl.NumberFormat("pl-PL", { style: "currency", currency: CURRENCY });
  return nf.format(amount);
}

/**
 * Zwraca klucz miesiąca w formacie `YYYY-MM` na podstawie daty `YYYY-MM-DD`.
 * @param {string} dateStr
 * @returns {string}
 */
function monthKeyFromDateString(dateStr) {
  // dateStr format: YYYY-MM-DD
  if (!dateStr || dateStr.length < 7) return "";
  return dateStr.slice(0, 7);
}

/**
 * Zwraca aktualną datę w formacie `YYYY-MM-DD` (czas lokalny).
 * @returns {string}
 */
function todayLocalDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generuje identyfikator do transakcji/kategorii.
 * Używa `crypto.randomUUID`, a jeśli jest niedostępne — fallback na bazie czasu i losowości.
 * @returns {string}
 */
function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback UUID-ish. Good enough for local storage.
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Wczytuje transakcje z `localStorage` i wykonuje prostą walidację struktury.
 * @returns {Array<{id: string, type: "income"|"expense", amount: number, date: string, category: string, description: string}>}
 */
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

/**
 * Zapisuje transakcje do `localStorage`.
 * @param {Array} transactions
 */
function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

/**
 * Wczytuje listę kategorii z `localStorage` (unikalne, znormalizowane case-insensitive).
 * @returns {string[]}
 */
function loadCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Store unique non-empty strings (case-insensitive).
    const normalizedMap = new Map();
    for (const item of parsed) {
      const name = String(item ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!normalizedMap.has(key)) normalizedMap.set(key, name);
    }
    return Array.from(normalizedMap.values()).sort((a, b) => a.localeCompare(b, "pl"));
  } catch {
    return [];
  }
}

/**
 * Zapisuje listę kategorii do `localStorage`.
 * @param {string[]} categories
 */
function saveCategories(categories) {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
}

/**
 * Zwraca unikalne kategorie wyciągnięte z transakcji.
 * (Fallback w sytuacji, gdy kategorie nie były jeszcze zapisane osobno.)
 * @param {Array} transactions
 * @returns {string[]}
 */
function getAllCategories(transactions) {
  const set = new Set();
  for (const t of transactions) {
    if (t.category) set.add(t.category);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pl"));
}

/**
 * Aktualizuje `datalist` dla pola kategorii na podstawie przekazanej listy.
 * @param {string[]} categories
 */
function populateCategoryDatalist(categories) {
  const list = Array.isArray(categories) ? categories : [];
  categoryDatalist.innerHTML = "";
  for (const c of list) {
    const opt = document.createElement("option");
    opt.value = c;
    categoryDatalist.appendChild(opt);
  }
}

/**
 * Sprawdza czy kategoria o danej nazwie już istnieje na liście (case-insensitive).
 * @param {string[]} categories
 * @param {string} categoryName
 * @returns {boolean}
 */
function isCategoryPresent(categories, categoryName) {
  const needle = String(categoryName ?? "").trim().toLowerCase();
  if (!needle) return false;
  return categories.some((c) => String(c).trim().toLowerCase() === needle);
}

/**
 * Dodaje kategorię jeśli nie istnieje (unikalność case-insensitive).
 * @param {string[]} categories
 * @param {string} categoryName
 * @returns {{categories: string[], added: boolean}}
 */
function upsertCategory(categories, categoryName) {
  const name = String(categoryName ?? "").trim();
  if (!name) return { categories, added: false };
  if (isCategoryPresent(categories, name)) {
    return { categories, added: false };
  }
  const next = [...categories, name].sort((a, b) => a.localeCompare(b, "pl"));
  return { categories: next, added: true };
}

/**
 * Wyznacza listę miesięcy obecnych w transakcjach i dodaje bieżący miesiąc dla UX.
 * @param {Array} transactions
 * @returns {string[]} Lista `YYYY-MM`
 */
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

/**
 * Renderuje opcje w selektorze miesiąca.
 * @param {string[]} months
 * @param {string} selectedMonth
 */
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

/**
 * Liczy sumy i saldo dla danego miesiąca.
 * @param {Array} transactions
 * @param {string} selectedMonth
 * @returns {{income: number, expenses: number, balance: number, count: number}}
 */
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

/**
 * Wylicza sumy kwot per kategoria dla wybranego miesiąca i typu transakcji.
 * Następnie agreguje kategorie do puli "Inne", aby wykres był czytelny.
 * @param {Array} transactions
 * @param {string} selectedMonth - `YYYY-MM`
 * @param {"income"|"expense"} type
 * @param {number} topN
 * @returns {{total: number, segments: Array<{category: string, amount: number}>}}
 */
function computeCategorySharesForMonth(transactions, selectedMonth, type, topN = 6) {
  /** @type {Map<string, number>} */
  const totalsByCategory = new Map();

  for (const t of transactions) {
    if (monthKeyFromDateString(t.date) !== selectedMonth) continue;
    if (t.type !== type) continue;

    const category = String(t.category ?? "").trim();
    if (!category) continue;

    const prev = totalsByCategory.get(category) ?? 0;
    totalsByCategory.set(category, prev + Number(t.amount || 0));
  }

  const total = Array.from(totalsByCategory.values()).reduce((sum, v) => sum + v, 0);

  const entries = Array.from(totalsByCategory.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));

  entries.sort((a, b) => b.amount - a.amount);
  const nonZeroEntries = entries.filter((e) => e.amount > 0);

  if (nonZeroEntries.length <= topN) {
    return { total, segments: nonZeroEntries };
  }

  const top = nonZeroEntries.slice(0, topN);
  const rest = nonZeroEntries.slice(topN);
  const restSum = rest.reduce((sum, e) => sum + e.amount, 0);

  if (restSum > 0) {
    top.push({ category: "Inne", amount: restSum });
  }

  return { total, segments: top };
}

/**
 * Formatuje wartość jako procent (0..1) w stylu polskim.
 * @param {number} ratio - 0..1
 * @returns {string}
 */
function formatPercent(ratio) {
  const safe = Number.isFinite(ratio) ? ratio : 0;
  const nf = new Intl.NumberFormat("pl-PL", { style: "percent", maximumFractionDigits: 1 });
  return nf.format(safe);
}

/**
 * Rysuje wykres donut na `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{category: string, amount: number, ratio: number, color: string}>} segments
 * @param {number} total
 * @param {string} title
 */
function drawDonutChart(canvas, segments, total, title) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;

  const radius = Math.min(w, h) * 0.36;
  const thickness = Math.min(w, h) * 0.085;

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.stroke();

  let start = -Math.PI / 2;
  const colors = segments.map((s) => s.color);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const sweep = seg.ratio * Math.PI * 2;
    if (sweep <= 0) continue;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + sweep);
    ctx.strokeStyle = colors[i] ?? "rgba(110, 168, 254, 1)";
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    ctx.stroke();

    start += sweep;
  }

  // Center text
  ctx.fillStyle = "rgba(232, 238, 252, 0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.fillText(title, cx, cy - 8);

  ctx.font = "800 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  const totalText = total > 0 ? formatPLN(total) : "0 zł";
  ctx.fillText(totalText, cx, cy + 16);
}

/**
 * Renderuje wykres donut z udziałami kategorii oraz legendą.
 * @param {Array} transactions
 */
function renderCategoryShareChart(transactions) {
  if (!donutChartCanvas || !chartLegendEl || !chartEmptyStateEl) return;

  const selectedMonth = monthSelect.value;
  const mode = state.chartMode;
  const type = mode === "income" ? "income" : "expense";
  const title = type === "income" ? "Przychody" : "Wydatki";

  const { total, segments } = computeCategorySharesForMonth(transactions, selectedMonth, type, 6);

  if (!total || segments.length === 0) {
    donutChartCanvas.getContext("2d")?.clearRect(0, 0, donutChartCanvas.width, donutChartCanvas.height);
    chartLegendEl.innerHTML = "";
    chartEmptyStateEl.style.display = "block";
    return;
  }

  chartEmptyStateEl.style.display = "none";

  const palette = ["#6ea8fe", "#35d07f", "#ff6b6b", "#f6c85f", "#a78bfa", "#22c55e", "#f97316", "#60a5fa"];

  const computed = segments.map((s, idx) => ({
    ...s,
    ratio: s.amount / total,
    color: palette[idx % palette.length],
  }));

  drawDonutChart(donutChartCanvas, computed, total, `${title} (%)`);

  chartLegendEl.innerHTML = "";
  for (const seg of computed) {
    const item = document.createElement("div");
    item.className = "legendItem";

    const left = document.createElement("div");
    left.className = "legendLeft";

    const dot = document.createElement("span");
    dot.className = "legendDot";
    dot.style.background = seg.color;

    const name = document.createElement("div");
    name.className = "legendName";
    name.textContent = seg.category;

    left.appendChild(dot);
    left.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "legendMeta";
    meta.textContent = `${formatPercent(seg.ratio)} · ${formatPLN(seg.amount)}`;

    item.appendChild(left);
    item.appendChild(meta);
    chartLegendEl.appendChild(item);
  }
}

/**
 * Renderuje dane UI dla wybranego miesiąca: sumy, licznik transakcji i tabelę transakcji.
 * @param {Array} transactions
 * @param {string} selectedMonth
 */
function render(transactions, selectedMonth) {
  const months = getAvailableMonths(transactions);
  fillMonthSelect(months, selectedMonth);

  // Update datalist from managed categories.
  populateCategoryDatalist(state.categories);

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

  renderCategoryShareChart(transactions);
}

/**
 * Renderuje listę kategorii (dodawanie/usuwanie) w sekcji "Kategorie".
 */
function renderCategoriesList() {
  const categories = state.categories;

  categoryListEl.innerHTML = "";
  categoriesEmptyStateEl.style.display = categories.length ? "none" : "block";

  for (const c of categories) {
    const item = document.createElement("div");
    item.className = "categoryItem";

    const name = document.createElement("span");
    name.className = "categoryName";
    name.textContent = c;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "deleteCategoryBtn";
    delBtn.textContent = "Usuń";
    delBtn.addEventListener("click", () => {
      const ok = window.confirm(`Usunąć kategorię "${c}"?`);
      if (!ok) return;
      const next = state.categories.filter((x) => x.toLowerCase() !== c.toLowerCase());
      state.categories = next;
      saveCategories(state.categories);
      renderCategoriesList();
      render(state.transactions, monthSelect.value);
    });

    item.appendChild(name);
    item.appendChild(delBtn);
    categoryListEl.appendChild(item);
  }
}

/**
 * Ucieka znaki HTML wstawianych do `innerHTML` (żeby uniknąć problemów z markupiem).
 * @param {string} str
 * @returns {string}
 */
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
  categories: [],
  chartMode: "expense",
};

/**
 * Inicjalizuje aplikację po załadowaniu DOM:
 * - wczytuje transakcje i kategorie,
 * - ustawia domyślny miesiąc,
 * - podłącza obsługę formularzy i przycisków,
 * - renderuje widoki.
 */
function init() {
  // Sensible defaults.
  dateInput.value = todayLocalDateString();

  state.transactions = loadTransactions();
  state.categories = loadCategories();
  if (!state.categories.length) {
    // Fallback: if user has existing transactions but no stored categories yet.
    state.categories = getAllCategories(state.transactions);
    saveCategories(state.categories);
  }

  const months = getAvailableMonths(state.transactions);
  const selectedMonth = months[0] || monthKeyFromDateString(todayLocalDateString());
  monthSelect.value = selectedMonth;

  if (chartModeSelect?.value) {
    state.chartMode = chartModeSelect.value;
  }

  render(state.transactions, selectedMonth);
  renderCategoriesList();

  monthSelect.addEventListener("change", () => {
    render(state.transactions, monthSelect.value);
  });

  if (chartModeSelect) {
    chartModeSelect.addEventListener("change", () => {
      state.chartMode = chartModeSelect.value;
      renderCategoryShareChart(state.transactions);
    });
  }

  categoryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = newCategoryInput.value;
    const name = String(raw ?? "").trim();

    if (!name) {
      alert("Podaj nazwę kategorii.");
      return;
    }

    if (isCategoryPresent(state.categories, name)) {
      alert("Taka kategoria już istnieje.");
      return;
    }

    const next = [...state.categories, name].sort((a, b) => a.localeCompare(b, "pl"));
    state.categories = next;
    saveCategories(state.categories);

    newCategoryInput.value = "";
    renderCategoriesList();
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

    // Ensure managed categories include this one.
    const up = upsertCategory(state.categories, category);
    if (up.added) {
      state.categories = up.categories;
      saveCategories(state.categories);
      renderCategoriesList();
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

