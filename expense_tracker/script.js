/**
 * Expense Tracker by PB
 * Vanilla JavaScript Implementation
 * Features: Add, delete, filter, localStorage persistence, form validation, and dashboard summary
 * Currency: Indian Rupee (INR - ₹)
 */

// Key for LocalStorage
const STORAGE_KEY = 'pb_expense_tracker_data';

// Application State
let expenses = [];
let currentCategoryFilter = 'All';

// DOM Elements
const expenseForm = document.getElementById('expense-form');
const descriptionInput = document.getElementById('expense-description');
const amountInput = document.getElementById('expense-amount');
const categorySelect = document.getElementById('expense-category');
const dateInput = document.getElementById('expense-date');
const resetBtn = document.getElementById('reset-btn');

const descriptionError = document.getElementById('description-error');
const amountError = document.getElementById('amount-error');
const categoryError = document.getElementById('category-error');
const dateError = document.getElementById('date-error');

const expenseTable = document.getElementById('expense-table');
const expenseListBody = document.getElementById('expense-list-body');
const tableFooter = document.getElementById('table-footer');
const tableTotalAmount = document.getElementById('table-total-amount');
const emptyState = document.getElementById('empty-state');
const categoryFilter = document.getElementById('category-filter');

const dashboardTotal = document.getElementById('dashboard-total');
const dashboardCount = document.getElementById('dashboard-count');
const toastElement = document.getElementById('toast');

let toastTimeout = null;

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  setDefaultDate();
  loadExpenses();
  setupEventListeners();
  renderApp();
});

/**
 * Sets the default value of the date input to today's date in YYYY-MM-DD
 */
function setDefaultDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;
}

/**
 * Loads stored expenses from localStorage
 */
function loadExpenses() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        expenses = parsed;
        return;
      }
    }
  } catch (err) {
    console.error('Failed to load expenses from localStorage:', err);
    showToast('Failed to load saved expenses from storage', 'danger');
  }
  expenses = [];
}

/**
 * Persists current expenses array to localStorage
 */
function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to save expenses to localStorage:', err);
    showToast('Storage quota exceeded or storage unavailable', 'danger');
  }
}

/**
 * Attaches event listeners to interactive elements
 */
function setupEventListeners() {
  // Form submission
  expenseForm.addEventListener('submit', handleFormSubmit);

  // Form reset button
  resetBtn.addEventListener('click', handleFormReset);

  // Real-time validation clearance on user input
  descriptionInput.addEventListener('input', () => clearFieldError(descriptionInput, descriptionError));
  amountInput.addEventListener('input', () => clearFieldError(amountInput, amountError));
  categorySelect.addEventListener('change', () => clearFieldError(categorySelect, categoryError));
  dateInput.addEventListener('input', () => clearFieldError(dateInput, dateError));

  // Category filter
  categoryFilter.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    renderExpensesTable();
  });

  // Event delegation for delete buttons
  expenseListBody.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (deleteBtn) {
      const expenseId = deleteBtn.getAttribute('data-id');
      if (expenseId) {
        deleteExpense(expenseId);
      }
    }
  });
}

// ============================================================================
// Form Handling & Validation
// ============================================================================

/**
 * Handles expense form submission
 * @param {Event} e
 */
function handleFormSubmit(e) {
  e.preventDefault();

  const description = descriptionInput.value.trim();
  const amountStr = amountInput.value.trim();
  const amount = parseFloat(amountStr);
  const category = categorySelect.value;
  const date = dateInput.value;

  const isValid = validateForm(description, amountStr, amount, category, date);
  if (!isValid) {
    return;
  }

  // Create new expense object
  const newExpense = {
    id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    description: description,
    amount: Math.round(amount * 100) / 100, // Normalized to 2 decimal places
    category: category,
    date: date
  };

  // Add to state and save
  expenses.unshift(newExpense); // Put newest at the top
  saveExpenses();

  // Reset form inputs & errors
  resetFormFields();
  showToast(`Added "${description}" (${formatCurrency(newExpense.amount)})`, 'success');

  // Re-render UI
  renderApp();
}

/**
 * Validates all form fields and displays individual error messages
 * @returns {boolean} True if all fields are valid
 */
function validateForm(description, amountStr, amount, category, date) {
  let isValid = true;
  let firstInvalidInput = null;

  // Validate Description
  if (!description) {
    setFieldError(descriptionInput, descriptionError, 'Please enter an expense description.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || descriptionInput;
  } else if (description.length < 2) {
    setFieldError(descriptionInput, descriptionError, 'Description must be at least 2 characters long.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || descriptionInput;
  } else {
    clearFieldError(descriptionInput, descriptionError);
  }

  // Validate Amount
  if (!amountStr) {
    setFieldError(amountInput, amountError, 'Please enter an amount.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || amountInput;
  } else if (isNaN(amount) || amount <= 0) {
    setFieldError(amountInput, amountError, 'Please enter a valid positive amount greater than ₹0.00.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || amountInput;
  } else if (amount > 10000000) {
    setFieldError(amountInput, amountError, 'Amount exceeds the maximum limit of ₹1,00,00,000.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || amountInput;
  } else {
    clearFieldError(amountInput, amountError);
  }

  // Validate Category
  const validCategories = ['Food', 'Transport', 'Shopping', 'Bills', 'Other'];
  if (!category || !validCategories.includes(category)) {
    setFieldError(categorySelect, categoryError, 'Please select a valid expense category.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || categorySelect;
  } else {
    clearFieldError(categorySelect, categoryError);
  }

  // Validate Date
  if (!date) {
    setFieldError(dateInput, dateError, 'Please select a date.');
    isValid = false;
    firstInvalidInput = firstInvalidInput || dateInput;
  } else {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      setFieldError(dateInput, dateError, 'Please enter a valid date.');
      isValid = false;
      firstInvalidInput = firstInvalidInput || dateInput;
    } else {
      clearFieldError(dateInput, dateError);
    }
  }

  if (firstInvalidInput) {
    firstInvalidInput.focus();
  }

  return isValid;
}

/**
 * Shows an inline field validation error
 */
function setFieldError(inputEl, errorEl, message) {
  inputEl.classList.add('is-invalid');
  errorEl.textContent = message;
  errorEl.classList.add('visible');
}

/**
 * Clears an inline field validation error
 */
function clearFieldError(inputEl, errorEl) {
  inputEl.classList.remove('is-invalid');
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
}

/**
 * Resets form values without clearing default date
 */
function resetFormFields() {
  descriptionInput.value = '';
  amountInput.value = '';
  categorySelect.value = '';
  setDefaultDate();
  clearAllErrors();
  descriptionInput.focus();
}

/**
 * Clears all form error messages
 */
function clearAllErrors() {
  clearFieldError(descriptionInput, descriptionError);
  clearFieldError(amountInput, amountError);
  clearFieldError(categorySelect, categoryError);
  clearFieldError(dateInput, dateError);
}

/**
 * Manual form reset click handler
 */
function handleFormReset() {
  resetFormFields();
  showToast('Form cleared', 'info');
}

// ============================================================================
// Expense Operations (Delete, Filter, Calculation)
// ============================================================================

/**
 * Deletes an expense by its unique identifier
 * @param {string} id
 */
function deleteExpense(id) {
  const expenseToDelete = expenses.find(item => item.id === id);
  if (!expenseToDelete) return;

  const desc = expenseToDelete.description;
  expenses = expenses.filter(item => item.id !== id);
  saveExpenses();

  renderApp();
  showToast(`Deleted "${desc}"`, 'danger');
}

/**
 * Returns filtered expenses according to selected category filter
 * @returns {Array} Filtered expenses
 */
function getFilteredExpenses() {
  if (currentCategoryFilter === 'All') {
    return expenses;
  }
  return expenses.filter(item => item.category === currentCategoryFilter);
}

/**
 * Formats a numeric amount into INR currency string (e.g., ₹1,250.00)
 * Uses Indian numbering grouping (Lakhs, Crores)
 * @param {number} amount
 * @returns {string} Formatted currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats a date string (YYYY-MM-DD) into a friendly display format
 * @param {string} dateString
 * @returns {string} Formatted date (e.g. 29 Sep 2026)
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, monthIndex, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  return dateString;
}

// ============================================================================
// UI Rendering
// ============================================================================

/**
 * Updates both the dashboard cards and table view
 */
function renderApp() {
  renderDashboard();
  renderExpensesTable();
}

/**
 * Updates header dashboard summary totals
 */
function renderDashboard() {
  const total = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  dashboardTotal.textContent = formatCurrency(total);
  dashboardCount.textContent = `${expenses.length} ${expenses.length === 1 ? 'item' : 'items'}`;
}

/**
 * Renders the expense list table, filtered items, and empty state
 */
function renderExpensesTable() {
  const filtered = getFilteredExpenses();
  expenseListBody.innerHTML = '';

  if (filtered.length === 0) {
    expenseTable.style.display = 'none';
    emptyState.classList.add('visible');

    if (expenses.length > 0 && currentCategoryFilter !== 'All') {
      emptyState.querySelector('.empty-title').textContent = 'No matching expenses';
      emptyState.querySelector('.empty-desc').textContent = `No expenses recorded under "${currentCategoryFilter}". Try changing the category filter.`;
    } else {
      emptyState.querySelector('.empty-title').textContent = 'No expenses recorded yet';
      emptyState.querySelector('.empty-desc').textContent = 'Add your first expense using the form on the left to start tracking your spending.';
    }
    return;
  }

  // Items exist - display table & hide empty state
  expenseTable.style.display = 'table';
  emptyState.classList.remove('visible');

  // Build rows securely using document fragments and text content
  const fragment = document.createDocumentFragment();

  filtered.forEach(item => {
    const row = document.createElement('tr');

    // Date Cell
    const dateCell = document.createElement('td');
    dateCell.className = 'expense-date-cell';
    dateCell.textContent = formatDate(item.date);
    row.appendChild(dateCell);

    // Description Cell
    const descCell = document.createElement('td');
    descCell.className = 'expense-desc-cell';
    descCell.textContent = item.description;
    row.appendChild(descCell);

    // Category Cell
    const catCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge badge-${item.category.toLowerCase()}`;
    badge.textContent = item.category;
    catCell.appendChild(badge);
    row.appendChild(catCell);

    // Amount Cell
    const amountCell = document.createElement('td');
    amountCell.className = 'expense-amount-cell text-right';
    amountCell.textContent = formatCurrency(item.amount);
    row.appendChild(amountCell);

    // Action (Delete) Cell
    const actionCell = document.createElement('td');
    actionCell.className = 'text-center';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('data-id', item.id);
    deleteBtn.setAttribute('title', `Delete ${item.description}`);
    deleteBtn.setAttribute('aria-label', `Delete expense ${item.description}`);
    deleteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;

    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    fragment.appendChild(row);
  });

  expenseListBody.appendChild(fragment);

  // Update table footer total for the visible filtered set
  const filteredTotal = filtered.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  tableTotalAmount.textContent = formatCurrency(filteredTotal);

  const totalLabelCell = document.querySelector('.total-label-cell');
  if (totalLabelCell) {
    totalLabelCell.textContent = currentCategoryFilter === 'All' ? 'Total' : `Total (${currentCategoryFilter})`;
  }
}

// ============================================================================
// Toast Notifications
// ============================================================================

/**
 * Displays a non-blocking toast notification
 * @param {string} message
 * @param {'success'|'danger'|'info'} type
 */
function showToast(message, type = 'success') {
  if (!toastElement) return;

  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }

  toastElement.textContent = message;
  toastElement.className = `toast toast-${type} show`;

  toastTimeout = setTimeout(() => {
    toastElement.classList.remove('show');
  }, 3000);
}

