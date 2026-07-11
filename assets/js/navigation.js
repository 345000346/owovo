"use strict";

const navToggle = document.querySelector(".nav-toggle");
const header = document.querySelector(".header");
const navCurtain = document.querySelector(".nav-curtain");

if (navToggle && header && navCurtain) {
  let closeTimer = 0;

  navToggle.addEventListener("click", () => {
    if (isOpen()) {
      closeNav();
    } else {
      openNav();
    }
  });

  navCurtain.addEventListener("animationend", (event) => {
    if (event.target !== navCurtain) {
      return;
    }
    if (!isOpen()) {
      finishClose();
    }
  });

  navCurtain.addEventListener("click", () => {
    closeNav();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      closeNav();
      navToggle.focus();
    }
  });

  window.addEventListener(
    "scroll",
    () => {
      if (isOpen()) {
        closeNav();
      }
    },
    { passive: true },
  );

  const maxWidth = window
    .getComputedStyle(document.documentElement, null)
    .getPropertyValue("--max-width");
  const mediaQuery = window.matchMedia(`(max-width: ${maxWidth})`);
  mediaQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      closeNav(true);
    }
  });

  function isOpen() {
    return navToggle.getAttribute("aria-expanded") === "true";
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function openNav() {
    window.clearTimeout(closeTimer);
    header.classList.add("open");
    header.classList.remove("fade");
    navToggle.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "关闭菜单");
    navCurtain.hidden = false;
  }

  function finishClose() {
    window.clearTimeout(closeTimer);
    navCurtain.hidden = true;
    header.classList.remove("fade");
  }

  function closeNav(noFade) {
    header.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "打开菜单");

    if (noFade || prefersReducedMotion()) {
      finishClose();
      return;
    }

    header.classList.add("fade");
    // Fallback if animationend never fires (reduced-motion CSS overrides, etc.)
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(finishClose, 600);
  }
}
