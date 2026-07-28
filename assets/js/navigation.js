// 移动端导航：开合、焦点陷阱、背景 inert、滚动锁定。
//
// 契约：.nav-toggle / .header / .nav-curtain / .nav；
// --max-width 与 _responsive.scss $maxWidth 同步；关闭兜底 ≥ $duration（0.5s）；
// 监听 site:close-navigation（搜索打开时关菜单）。
// Concat：与 theme.js / scroll-ui.js 同 module，顶层仅常量 + initNavigation。

const NAV_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function initNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const header = document.querySelector(".header");
  const navCurtain = document.querySelector(".nav-curtain");
  const nav = header ? header.querySelector(".nav") : null;

  if (!navToggle || !header || !navCurtain || !nav) {
    return;
  }

  let closeTimer = 0;
  let restoreFocusOnClose = false;
  let lockedScrollY = 0;
  const backgroundTabIndexes = new Map();

  const maxWidthRaw = window
    .getComputedStyle(document.documentElement, null)
    .getPropertyValue("--max-width")
    .trim();
  // 与 _responsive.scss $maxWidth 同步（fontSize * (max(post,list)+5)）。
  const maxWidth = maxWidthRaw || "846px";
  const navMediaQuery = window.matchMedia(`(max-width: ${maxWidth})`);

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
    // 移动端保留布局做过渡；关闭时 inert 移出 Tab 序。
    if (!navMediaQuery.matches) {
      nav.inert = false;
      return;
    }
    nav.inert = !isOpen();
  }

  function isScrollAllowedTarget(target) {
    // touchmove 点在文字上时 target 可能是 Text。
    const element =
      target instanceof Element
        ? target
        : target && target.parentElement instanceof Element
          ? target.parentElement
          : null;
    if (!element) {
      return false;
    }
    // 仅面板自身溢出时允许内部滚动。
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
      // 勿用 body overflow:hidden / position:fixed（会跳滚动或顶栏错位）；
      // 拦截背景 touch/wheel，并钉住 scrollY。
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
    const background = document.querySelectorAll("main, footer, #back-to-top");
    background.forEach((element) => {
      element.inert = inert;
      element.setAttribute("aria-hidden", String(inert));
      element.querySelectorAll(NAV_FOCUSABLE_SELECTOR).forEach((focusable) => {
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
      ...header.querySelectorAll(`.nav ${NAV_FOCUSABLE_SELECTOR}`),
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
    // 开合与淡出全程保持 aria/inert/陷阱，避免动画中焦点被抽走。
    navToggle.setAttribute("aria-expanded", "true");
    navToggle.setAttribute("aria-label", "关闭菜单");
    navCurtain.hidden = false;
    // 清 [hidden] 后强制回流，过渡才能生效。
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
    // 收起回流可能微移滚动，再钉一次。
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
    // 视觉先关；a11y 等 finishClose，淡出中仍可聚焦。
    header.classList.remove("open");
    navToggle.classList.remove("open");

    if (noFade || prefersReducedMotion()) {
      finishClose();
      return;
    }

    header.classList.add("fade");
    window.clearTimeout(closeTimer);
    // 须 ≥ $duration（0.5s）；幕布 transitionend 也会 finishClose。
    closeTimer = window.setTimeout(finishClose, 600);
  }

  function handleViewportChange(event) {
    if (!event.matches) {
      closeNav(true);
    }
    syncNavAvailability();
  }

  navToggle.addEventListener("click", (event) => {
    // 淡出中 aria-expanded 仍 true；中途点击视为重开。
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
    // 关闭中 aria-expanded 仍 true，用 fade 判断收尾。
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

  if (typeof navMediaQuery.addEventListener === "function") {
    navMediaQuery.addEventListener("change", handleViewportChange);
  }
  syncNavAvailability();
}

initNavigation();
