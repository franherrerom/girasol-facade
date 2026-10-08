// Log-in gate for every page.
// Gated pages start with class "auth-pending" on <html>, which hides them.
// This script shows the page once a session is found, or sends the visitor
// to login.html. On login.html it does the opposite: a visitor who is
// already logged in goes straight to index.html.

(function () {
  const cfg = window.GIRASOL_SUPABASE;

  // A log-in lasts only for this tab, so every new visit starts at login.html.
  // Clear any log-in an older version of the site saved for good.
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    // Storage blocked: nothing to clear
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { storage: window.sessionStorage, persistSession: true }
  });
  window.girasolAuth = client;

  const root = document.documentElement;
  const isLoginPage = root.hasAttribute("data-login-page");

  client.auth.getSession().then(({ data }) => {
    const signedIn = Boolean(data.session);

    if (isLoginPage) {
      if (signedIn) location.replace("index.html");
      return;
    }

    if (signedIn) {
      root.classList.remove("auth-pending");
    } else {
      location.replace("login.html");
    }
  });

  // Logged out in another tab: leave this page too
  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT" && !isLoginPage) location.replace("login.html");
  });

  // Any element with data-logout logs the visitor out
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-logout]");
    if (!button) return;
    event.preventDefault();
    await client.auth.signOut();
    location.replace("login.html");
  });
})();
