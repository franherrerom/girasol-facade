// Log-in card: switches between Log in and Create account,
// and checks the fields before anything is sent.
// Supabase is connected in a later step.

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

switchBtn.addEventListener("click", () => {
  setMode(mode === "login" ? "signup" : "login");
});

form.addEventListener("submit", (event) => {
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

  message.textContent = "Log-in isn't connected yet. Coming in the next step.";
});
