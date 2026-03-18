(() => {
  const pageRoot = document.querySelector(".memorial-page");
  const LOVE_START_AT = pageRoot?.getAttribute("data-love-start-at") || "";
  const LOVE_START_DISPLAY_TEXT = LOVE_START_AT.replace(
    /^(\d{4})-(\d{2})-(\d{2}).*$/,
    "$1.$2.$3",
  );
  const LOVE_START_DATE = LOVE_START_AT ? new Date(LOVE_START_AT) : null;
  const REVEAL_GROUPS = [
    { selector: ".foreword .section-head", baseDelay: 0, step: 0 },
    { selector: ".foreword .prose", baseDelay: 120, step: 0 },
    { selector: ".chapters .section-head", baseDelay: 0, step: 0 },
    { selector: ".chapter-piece", baseDelay: 80, step: 110 },
    { selector: ".timeline-section .section-head", baseDelay: 0, step: 0 },
    { selector: ".timeline-item", baseDelay: 60, step: 85 },
    { selector: ".closing-inner", baseDelay: 0, step: 0 },
  ];
  const VISIBILITY_GROUPS = [".timeline"];
  const TIMER_PARTS = [
    { key: "day", unit: "天", format: (value) => String(value) },
    { key: "hour", unit: "小时", format: (value) => String(value).padStart(2, "0") },
    { key: "minute", unit: "分钟", format: (value) => String(value).padStart(2, "0") },
    { key: "second", unit: "秒", format: (value) => String(value).padStart(2, "0") },
  ];
  const REVEAL_PENDING_CLASS = "reveal-pending";
  const pageState = {
    initialized: false,
    timerIntervalId: null,
    revealObserver: null,
    timerElement: null,
    timerValueElements: [],
    lastTimerValues: null,
  };

  function safeGetElement(id, selector) {
    if (id) {
      const element = document.getElementById(id);
      if (element) return element;
    }
    if (selector) {
      return document.querySelector(selector);
    }
    return null;
  }

  function syncLoveStartDisplay() {
    if (!LOVE_START_DISPLAY_TEXT || LOVE_START_DISPLAY_TEXT === LOVE_START_AT) return;
    document.querySelectorAll("[data-love-start-display]").forEach((element) => {
      element.textContent = LOVE_START_DISPLAY_TEXT;
    });
  }

  function formatTimeDiff(timeDiff) {
    return {
      day: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
      hour: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minute: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
      second: Math.floor((timeDiff % (1000 * 60)) / 1000),
    };
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function ensureTimerStructure() {
    const timerElement = safeGetElement("loveTimer", null);
    if (!timerElement) return null;

    if (
      pageState.timerElement === timerElement &&
      pageState.timerValueElements.length === TIMER_PARTS.length
    ) {
      return timerElement;
    }

    const fragment = document.createDocumentFragment();
    const timerValueElements = [];

    TIMER_PARTS.forEach(({ unit }) => {
      const partElement = document.createElement("span");
      partElement.className = "timer-part";

      const valueElement = document.createElement("span");
      valueElement.className = "timer-value";
      partElement.append(valueElement);

      const unitElement = document.createElement("span");
      unitElement.className = "timer-unit";
      unitElement.textContent = unit;
      partElement.append(unitElement);

      fragment.append(partElement);
      timerValueElements.push(valueElement);
    });

    timerElement.replaceChildren(fragment);
    pageState.timerElement = timerElement;
    pageState.timerValueElements = timerValueElements;
    pageState.lastTimerValues = null;

    return timerElement;
  }

  function restartTimerValueAnimation(valueElement) {
    if (prefersReducedMotion()) {
      valueElement.classList.remove("timer-value--changed");
      return;
    }

    valueElement.classList.remove("timer-value--changed");
    void valueElement.offsetWidth;
    valueElement.classList.add("timer-value--changed");
  }

  function updateTimer() {
    if (!(LOVE_START_DATE instanceof Date) || Number.isNaN(LOVE_START_DATE.getTime())) return;

    const timerElement = ensureTimerStructure();
    if (!timerElement) return;

    const now = new Date();
    const timeDiff = now - LOVE_START_DATE;
    const timeUnits = formatTimeDiff(timeDiff);
    const nextValues = TIMER_PARTS.map(({ key, format }) => format(timeUnits[key]));
    const previousValues = pageState.lastTimerValues;

    pageState.timerValueElements.forEach((valueElement, index) => {
      const nextValue = nextValues[index];
      const changed = !previousValues || previousValues[index] !== nextValue;

      if (valueElement.textContent !== nextValue) {
        valueElement.textContent = nextValue;
      }

      if (changed) {
        restartTimerValueAnimation(valueElement);
      }
    });

    pageState.lastTimerValues = nextValues;
    timerElement.setAttribute(
      "aria-label",
      `${timeUnits.day} 天 ${timeUnits.hour} 小时 ${timeUnits.minute} 分钟 ${timeUnits.second} 秒`,
    );
  }

  function startTimer() {
    updateTimer();
    if (pageState.timerIntervalId) {
      clearInterval(pageState.timerIntervalId);
    }
    pageState.timerIntervalId = setInterval(updateTimer, 1000);
  }

  function setupRevealAnimations() {
    if (pageState.revealObserver) {
      pageState.revealObserver.disconnect();
      pageState.revealObserver = null;
    }

    const revealElements = [];
    const observedElements = new Set();

    REVEAL_GROUPS.forEach(({ selector, baseDelay, step }) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        element.setAttribute("data-reveal", "");
        element.style.setProperty(
          "--reveal-delay",
          `${baseDelay + index * step}ms`,
        );
        element.classList.remove(REVEAL_PENDING_CLASS);
        revealElements.push(element);
        observedElements.add(element);
      });
    });

    VISIBILITY_GROUPS.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        observedElements.add(element);
      });
    });

    if (!observedElements.size) return;

    if (prefersReducedMotion() || typeof IntersectionObserver !== "function") {
      revealElements.forEach((element) => {
        element.classList.remove(REVEAL_PENDING_CLASS);
      });
      observedElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    revealElements.forEach((element) => {
      if (element.classList.contains("is-visible")) return;
      element.classList.add(REVEAL_PENDING_CLASS);
    });

    pageState.revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          entry.target.classList.remove(REVEAL_PENDING_CLASS);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observedElements.forEach((element) => {
      if (element.classList.contains("is-visible")) {
        element.classList.remove(REVEAL_PENDING_CLASS);
        return;
      }
      pageState.revealObserver.observe(element);
    });
  }

  function stopTimer() {
    if (!pageState.timerIntervalId) return;
    clearInterval(pageState.timerIntervalId);
    pageState.timerIntervalId = null;
  }

  function initPage() {
    if (pageState.initialized) return;
    pageState.initialized = true;
    syncLoveStartDisplay();
    startTimer();
    setupRevealAnimations();
  }

  function teardownPage() {
    stopTimer();
    if (pageState.revealObserver) {
      pageState.revealObserver.disconnect();
      pageState.revealObserver = null;
    }
    pageState.initialized = false;
  }

  function handlePageShow() {
    if (!pageState.initialized) {
      initPage();
    }
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initPage, { once: true });
  } else {
    initPage();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopTimer();
      return;
    }

    if (pageState.initialized) {
      startTimer();
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", teardownPage);
  window.addEventListener("beforeunload", teardownPage);
  window.addEventListener("pageshow", handlePageShow);
})();
