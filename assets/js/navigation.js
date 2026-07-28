"use strict";

// Mobile navigation (open / close / focus trap / inert background / scroll lock).

{
  const navToggle = document.querySelector(".nav-toggle");
  const header = document.querySelector(".header");
  const navCurtain = document.querySelector(".nav-curtain");
  const nav = header ? header.querySelector(".nav") : null;

  if (navToggle && header && navCurtain && nav) {
    let closeTimer = 0;
    let restoreFocusOnClose = false;
    let lockedScrollY = 0;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const backgroundTabIndexes = new Map();

    navToggle.addEventListener("click", (event) => {
      // Fade keeps aria-expanded true; treat a mid-fade click as re-open.
      if (header.classList.contains("fade")) {
        openNav(event.detail === 0);
        return;
      }
      if (isOpen()) {
        closeNav(false, true);
      } else {
        openNav(event.detail === 0);
      }
    });

    navCurtain.addEventListener("transitionend", (event) => {
      if (event.target !== navCurtain || event.propertyName !== "opacity") {
        return;
      }
      // Closing keeps aria-expanded true until finishClose; detect fade instead.
      if (header.classList.contains("fade")) {
        finishClose();
      }
    });

    navCurtain.addEventListener("click", () => {
      closeNav(false, true);
    });

    document.addEventListener("site:close-navigation", () => {
      if (isOpen()) {
        closeNav(true, false);
      }
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

    const maxWidthRaw = window
      .getComputedStyle(document.documentElement, null)
      .getPropertyValue("--max-width")
      .trim();
    // Keep in sync with assets/scss/base/_responsive.scss $maxWidth (fontSize * (max(post,list)+5)).
    const maxWidth = maxWidthRaw || "846px";
    const navMediaQuery = window.matchMedia(`(max-width: ${maxWidth})`);
    const handleViewportChange = (event) => {
      if (!event.matches) {
        closeNav(true);
      }
      syncNavAvailability();
    };
    if (typeof navMediaQuery.addEventListener === "function") {
      navMediaQuery.addEventListener("change", handleViewportChange);
    }
    syncNavAvailability();

    function isOpen() {
      return navToggle.getAttribute("aria-expanded") === "true";
    }

    function prefersReducedMotion() {
      return (
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    function syncNavAvailability() {
      // On mobile the menu stays in layout for transitions; inert keeps it out of tab order when closed.
      if (!navMediaQuery.matches) {
        nav.inert = false;
        return;
      }
      nav.inert = !isOpen();
    }

    function isScrollAllowedTarget(target) {
      // touchmove can target a Text node when the finger is on link text.
      const element =
        target instanceof Element
          ? target
          : target && target.parentElement instanceof Element
            ? target.parentElement
            : null;
      if (!element) {
        return false;
      }
      // Allow scrolling only inside the open nav panel when it actually overflows.
      if (!nav.contains(element)) {
        return false;
      }
      return nav.scrollHeight > nav.clientHeight + 1;
    }

    function preventBackgroundScroll(event) {
      if (!isOpen()) {
        return;
      }
      if (isScrollAllowedTarget(event.target)) {
        return;
      }
      event.preventDefault();
    }

    function pinScrollPosition() {
      if (!isOpen()) {
        return;
      }
      if ((window.scrollY || window.pageYOffset || 0) !== lockedScrollY) {
        window.scrollTo(0, lockedScrollY);
      }
    }

    function setScrollLock(locked) {
      const body = document.body;

      if (locked) {
        if (body.classList.contains("nav-open")) {
          return;
        }
        lockedScrollY = window.scrollY || window.pageYOffset || 0;
        body.classList.add("nav-open");
        // Do not use overflow:hidden / position:fixed on body:
        // overflow:hidden can jump scrollY to 0; position:fixed shifts fixed header.
        // Block background touch/wheel and pin scrollY for any residual scroll.
        document.addEventListener("touchmove", preventBackgroundScroll, {
          passive: false,
        });
        document.addEventListener("wheel", preventBackgroundScroll, {
          passive: false,
        });
        window.addEventListener("scroll", pinScrollPosition, { passive: true });
        pinScrollPosition();
        return;
      }

      if (!body.classList.contains("nav-open")) {
        return;
      }

      body.classList.remove("nav-open");
      document.removeEventListener("touchmove", preventBackgroundScroll);
      document.removeEventListener("wheel", preventBackgroundScroll);
      window.removeEventListener("scroll", pinScrollPosition);
      window.scrollTo(0, lockedScrollY);
    }

    function setBackgroundInert(inert) {
      const background = document.querySelectorAll(
        "main, footer, #back-to-top",
      );
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

    function openNav(focusFirstItem = true) {
      window.clearTimeout(closeTimer);
      header.classList.remove("fade");
      navToggle.classList.add("open");
      // Keep aria/inert/trap active for the whole open + fade cycle so focus
      // is not yanked mid-animation and Tab still stays inside the menu.
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "关闭菜单");
      navCurtain.hidden = false;
      // Force layout so opacity/visibility transitions can run after [hidden] is cleared.
      void navCurtain.offsetWidth;
      header.classList.add("open");
      setScrollLock(true);
      setBackgroundInert(true);
      syncNavAvailability();

      if (focusFirstItem) {
        requestAnimationFrame(() => {
          const firstMenuItem = header.querySelector(".nav a, .nav button");
          (firstMenuItem || navToggle).focus({ preventScroll: true });
          pinScrollPosition();
        });
      }
    }

    function finishClose() {
      window.clearTimeout(closeTimer);
      navCurtain.hidden = true;
      header.classList.remove("fade");
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "打开菜单");
      setScrollLock(false);
      setBackgroundInert(false);
      syncNavAvailability();
      if (restoreFocusOnClose) {
        navToggle.focus({ preventScroll: true });
        restoreFocusOnClose = false;
      }
      // Layout reflow after menu collapse can nudge scroll; re-pin once more.
      window.scrollTo(0, lockedScrollY);
      requestAnimationFrame(() => {
        window.scrollTo(0, lockedScrollY);
      });
    }

    function closeNav(noFade = false, restoreFocus = false) {
      if (!isOpen() && !header.classList.contains("fade")) {
        return;
      }
      restoreFocusOnClose ||= restoreFocus;
      // Visual close starts now (header + hamburger). a11y teardown waits for
      // finishClose so the fading menu stays focusable and inert is not applied mid-transition.
      header.classList.remove("open");
      navToggle.classList.remove("open");

      if (noFade || prefersReducedMotion()) {
        finishClose();
        return;
      }

      header.classList.add("fade");
      window.clearTimeout(closeTimer);
      // Must be >= CSS $duration (0.5s); transitionend on curtain opacity also calls finishClose.
      closeTimer = window.setTimeout(finishClose, 600);
    }
  }
}
