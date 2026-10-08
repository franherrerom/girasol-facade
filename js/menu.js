// Phone menu: the Menu button opens a full-screen overlay with the same links.

(function () {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;
  const button = nav.querySelector(".menu-btn");
  const list = nav.querySelector("ul");
  if (!button || !list) return;

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "Close" : "Menu";
    document.body.classList.toggle("menu-open", open);
  }

  button.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

  list.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      button.focus();
    }
  });

  // Back to a wide screen: make sure the overlay is closed
  matchMedia("(min-width: 760px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();
