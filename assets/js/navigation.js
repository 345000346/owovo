"use strict";

const navToggle = document.querySelector(".nav-toggle");
const header = document.querySelector(".header");
const navCurtain = document.querySelector(".nav-curtain");

if (navToggle && header && navCurtain) {
  let closeTimer = 0;
  let restoreFocusOnClose = false;
  const focusableSelector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const backgroundTabIndexes = new Map();

  navToggle.addEventListener("click", () => {
    if (isOpen()) {
      closeNav(false, true);
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
    closeNav(false, true);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      closeNav(false, true);
      return;
    }

    if (event.key === "Tab" && isOpen()) {
      trapFocus(event);
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
  const handleViewportChange = (event) => {
    if (!event.matches) {
      closeNav(true);
    }
  };
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleViewportChange);
  } else {
    mediaQuery.addListener(handleViewportChange);
  }

  function isOpen() {
    return navToggle.getAttribute("aria-expanded") === "true";
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function setBackgroundInert(inert) {
    const background = document.querySelectorAll("main, footer, #back-to-top");
    background.forEach((element) => {
      element.inert = inert;
      element.setAttribute("aria-hidden", String(inert));
      element.querySelectorAll(focusableSelector).forEach((focusable) => {
        if (inert) {
          backgroundTabIndexes.set(
            focusable,
            focusable.getAttribute("tabindex"),
          );
          focusable.setAttribute("tabindex", "-1");
        } else {
          const originalTabIndex = backgroundTabIndexes.get(focusable);
          if (originalTabIndex === null) {
            focusable.removeAttribute("tabindex");
          } else if (originalTabIndex !== undefined) {
            focusable.setAttribute("tabindex", originalTabIndex);
          }
        }
      });
    });
    if (!inert) {
      backgroundTabIndexes.clear();
    }
  }

  function getFocusableElements() {
    return [
      navToggle,
      ...header.querySelectorAll(".nav " + focusableSelector),
    ].filter(
      (element) => !element.hidden && element.getClientRects().length > 0,
    );
  }

  function trapFocus(event) {
    const focusableElements = getFocusableElements();
    if (!focusableElements.length) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function openNav() {
    window.clearTimeout(closeTimer);
    header.classList.add("open");
    header.classList.remove("fade");
    navToggle.classList.add("open");
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "关闭菜单");
    navCurtain.hidden = false;
    setBackgroundInert(true);

    requestAnimationFrame(() => {
      const firstMenuItem = header.querySelector(".nav a, .nav button");
      (firstMenuItem || navToggle).focus();
    });
  }

  function finishClose() {
    window.clearTimeout(closeTimer);
    navCurtain.hidden = true;
    header.classList.remove("fade");
    setBackgroundInert(false);
    if (restoreFocusOnClose) {
      navToggle.focus();
      restoreFocusOnClose = false;
    }
  }

  function closeNav(noFade = false, restoreFocus = false) {
    restoreFocusOnClose ||= restoreFocus;
    header.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "打开菜单");

    if (noFade || prefersReducedMotion()) {
      finishClose();
      return;
    }

    header.classList.add("fade");
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(finishClose, 600);
  }
}
