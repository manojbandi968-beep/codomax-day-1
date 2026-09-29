/* ============================================
   auth.js — user accounts & session, connected to the Express API
   ============================================ */

const USERS_KEY = "inkwell_users";
const SESSION_KEY = "inkwell_current_user";
const API_BASE = `${window.location.origin}/api`;

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  const { password, ...safeUser } = user || {};
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...safeUser }));
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
  }
  return user;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function registerUser({ name, email, password }) {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Registration failed.");
  }

  const registeredUser = data.user || { name, email };
  saveUsers([...getUsers(), { id: registeredUser.id, name: registeredUser.name, email: registeredUser.email, password }]);
  return registeredUser;
}

async function loginUser({ email, password }) {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Email or password is incorrect.");
  }

  return data.user;
}

function renderNavAuthState() {
  const user = getCurrentUser();
  const authSlot = document.getElementById("nav-auth-slot");
  if (!authSlot) return;

  if (user) {
    authSlot.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="#" id="nav-logout-link">Log out</a>
    `;
    document.getElementById("nav-logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    authSlot.innerHTML = `
      <a href="login.html">Log in</a>
      <a href="register.html" class="btn">Sign up</a>
    `;
  }
}

window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.logout = logout;
window.requireAuth = requireAuth;
window.isValidEmail = isValidEmail;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.renderNavAuthState = renderNavAuthState;

document.addEventListener("DOMContentLoaded", renderNavAuthState);
