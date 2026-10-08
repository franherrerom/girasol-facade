// Log-in card: switches between Log in and Create account,
// checks the fields, then logs in or signs up with Supabase.

const form = document.getElementById("login-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const message = document.getElementById("form-message");
const submitBtn = document.getElementById("submit-btn");
const switchText = document.getElementById("switch-text");
const switchBtn = document.getElementById("switch-btn");

let mode = "login"; // or "signup"

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  submitBtn.textContent = signup ? "Create account" : "Log in";
  switchText.textContent = signup ? "Already have an account?" : "New here?";
  switchBtn.textContent = signup ? "Log in" : "Create account";
  password.autocomplete = signup ? "new-password" : "current-password";
  message.textContent = "";
}

// Turns Supabase errors into plain language
function friendlyError(error) {
  const text = (error && error.message ? error.message : "").toLowerCase();
  if (text.includes("invalid login credentials")) {
    return "That email and password don't match. Try again, or create an account.";
  }
  if (text.includes("already registered")) {
    return "There's already an account with that email. Log in instead.";
  }
  if (text.includes("email not confirmed")) {
    return "Check your email to confirm your account.";
  }
  if (text.includes("password")) {
    return "Pick a longer password: at least 6 characters.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many tries. Wait a minute and try again.";
  }
  if (text.includes("fetch") || text.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}

// Frost clears, then the visitor moves into the home page
function enterSite() {
  document.body.classList.add("is-entering");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(() => location.replace("index.html"), reduced ? 0 : 800);
}

switchBtn.addEventListener("click", () => {
  setMode(mode === "login" ? "signup" : "login");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!email.value.trim() || !email.validity.valid) {
    message.textContent = "Please enter a valid email address.";
    email.focus();
    return;
  }
  if (password.value.length < 6) {
    message.textContent = "Your password needs at least 6 characters.";
    password.focus();
    return;
  }

  const auth = window.girasolAuth.auth;
  const credentials = { email: email.value.trim(), password: password.value };

  submitBtn.disabled = true;
  message.textContent = mode === "signup" ? "Creating your account…" : "Logging in…";

  const { data, error } = mode === "signup"
    ? await auth.signUp(credentials)
    : await auth.signInWithPassword(credentials);

  submitBtn.disabled = false;

  if (error) {
    message.textContent = friendlyError(error);
    return;
  }

  // Sign-up without a session means email confirmation is switched on
  if (!data.session) {
    message.textContent = "Check your email to confirm your account.";
    return;
  }

  message.textContent = "";
  enterSite();
});
