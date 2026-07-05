(() => {
  const pageRoot = document.querySelector(".memorial-page");
  if (!pageRoot) return;

  const loveStartAt = pageRoot.getAttribute("data-love-start-at") || "";
  const loveStartDate = loveStartAt ? new Date(loveStartAt) : null;
  const loveStartDisplayText = loveStartAt.replace(
    /^(\d{4})-(\d{2})-(\d{2}).*$/,
    "$1.$2.$3",
  );
  const timerParts = [
    { key: "day", unit: "天", format: (value) => String(value) },
    {
      key: "hour",
      unit: "小时",
      format: (value) => String(value).padStart(2, "0"),
    },
    {
      key: "minute",
      unit: "分钟",
      format: (value) => String(value).padStart(2, "0"),
    },
    {
      key: "second",
      unit: "秒",
      format: (value) => String(value).padStart(2, "0"),
    },
  ];
  const revealGroups = [
    { selector: ".foreword .section-head", baseDelay: 0, step: 0 },
    { selector: ".foreword .prose", baseDelay: 120, step: 0 },
    { selector: ".chapters .section-head", baseDelay: 0, step: 0 },
    { selector: ".chapter-piece", baseDelay: 80, step: 110 },
    { selector: ".timeline-section .section-head", baseDelay: 0, step: 0 },
    { selector: ".timeline-item", baseDelay: 60, step: 85 },
    { selector: ".closing-inner", baseDelay: 0, step: 0 },
  ];
  const timerElement = document.getElementById("loveTimer");
  const timerValueElements = [];
  let lastTimerValues = null;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function syncLoveStartDisplay() {
    if (loveStartDisplayText === loveStartAt) return;
    document
      .querySelectorAll("[data-love-start-display]")
      .forEach((element) => {
        element.textContent = loveStartDisplayText;
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

  function buildTimerDOM() {
    if (!timerElement) return false;

    const fragment = document.createDocumentFragment();
    timerParts.forEach(({ unit }) => {
      const partElement = document.createElement("span");
      const valueElement = document.createElement("span");
      const unitElement = document.createElement("span");

      partElement.className = "timer-part";
      valueElement.className = "timer-value";
      unitElement.className = "timer-unit";
      unitElement.textContent = unit;

      partElement.append(valueElement, unitElement);
      fragment.append(partElement);
      timerValueElements.push(valueElement);
    });

    timerElement.replaceChildren(fragment);
    return true;
  }

  function restartTimerValueAnimation(valueElement) {
    valueElement.classList.remove("timer-value--changed");
    if (prefersReducedMotion()) return;
    void valueElement.offsetWidth;
    valueElement.classList.add("timer-value--changed");
  }

  function updateTimer() {
    if (
      !(loveStartDate instanceof Date) ||
      Number.isNaN(loveStartDate.getTime())
    )
      return;

    const timeUnits = formatTimeDiff(new Date() - loveStartDate);
    const nextValues = timerParts.map(({ key, format }) =>
      format(timeUnits[key]),
    );

    timerValueElements.forEach((valueElement, index) => {
      if (lastTimerValues && lastTimerValues[index] === nextValues[index])
        return;
      valueElement.textContent = nextValues[index];
      restartTimerValueAnimation(valueElement);
    });

    lastTimerValues = nextValues;
    timerElement.setAttribute(
      "aria-label",
      `${timeUnits.day} 天 ${timeUnits.hour} 小时 ${timeUnits.minute} 分钟 ${timeUnits.second} 秒`,
    );
  }

  function setupTimer() {
    if (!buildTimerDOM()) return;
    updateTimer();
    setInterval(updateTimer, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) updateTimer();
    });
  }

  function setupRevealAnimations() {
    const revealElements = [];
    const observedElements = new Set(document.querySelectorAll(".timeline"));

    revealGroups.forEach(({ selector, baseDelay, step }) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        element.setAttribute("data-reveal", "");
        element.style.setProperty(
          "--reveal-delay",
          `${baseDelay + index * step}ms`,
        );
        revealElements.push(element);
        observedElements.add(element);
      });
    });

    if (!observedElements.size) return;

    if (prefersReducedMotion() || typeof IntersectionObserver !== "function") {
      revealElements.forEach((element) =>
        element.classList.remove("reveal-pending"),
      );
      observedElements.forEach((element) =>
        element.classList.add("is-visible"),
      );
      return;
    }

    revealElements.forEach((element) =>
      element.classList.add("reveal-pending"),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          entry.target.classList.remove("reveal-pending");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observedElements.forEach((element) => observer.observe(element));
  }

  function init() {
    syncLoveStartDisplay();
    setupTimer();
    setupRevealAnimations();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
