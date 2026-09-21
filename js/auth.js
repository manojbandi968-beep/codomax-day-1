/* ============================================
   auth.js — user accounts & session, backed by localStorage
   (Stands in for a real backend for this assignment.)
   ============================================ */

const USERS_KEY = "inkwell_users";
const SESSION_KEY = "inkwell_current_user";

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
  // never store the password in the session record
  const { password, ...safeUser } = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

// Call at the top of any page that requires a signed-in user.
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

function registerUser({ name, email, password }) {
  const users = getUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with that email already exists.");
  }
  const newUser = {
    id: "u_" + Date.now(),
    name,
    email,
    password, // demo-only: plain text, fine for a localStorage prototype, never do this with a real backend
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

function loginUser({ email, password }) {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) {
    throw new Error("Email or password is incorrect.");
  }
  return user;
}

// Reflects signed-in state in the navbar across all pages.
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

document.addEventListener("DOMContentLoaded", renderNavAuthState);
