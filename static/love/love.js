import { love } from "./data.js";

(() => {
  const DAY_MS = 1000 * 60 * 60 * 24;
  const TARGET_OFFSET_MS = 8 * 60 * 60 * 1000;
  const pageRoot = document.querySelector(".memorial-page");
  if (!pageRoot) return;

  const startAt =
    pageRoot.getAttribute("data-love-start-at") || love.startAt || "";
  const startDate = startAt ? new Date(startAt) : null;
  const startDisplay = formatStartDisplay(startAt);

  const timerRoot = document.getElementById("loveTimer");
  const timerNodes = {
    years: timerRoot?.querySelector('[data-timer="years"]') ?? null,
    days: timerRoot?.querySelector('[data-timer="days"]') ?? null,
    hours: timerRoot?.querySelector('[data-timer="hours"]') ?? null,
    minutes: timerRoot?.querySelector('[data-timer="minutes"]') ?? null,
    seconds: timerRoot?.querySelector('[data-timer="seconds"]') ?? null,
  };
  let lastTimerValues = null;
  let timerIntervalId = 0;

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function formatStartDisplay(value) {
    const matched = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return matched ? `${matched[1]}.${matched[2]}.${matched[3]}` : value;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function isValidDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime());
  }

  // 纪念册日期按 Asia/Shanghai 的固定东八区墙上时间计算，不随访客时区变化。
  function toTargetWallTime(date) {
    return new Date(date.getTime() + TARGET_OFFSET_MS);
  }

  function fromTargetWallTime(
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  ) {
    return new Date(
      Date.UTC(year, month, day, hour, minute, second, millisecond) -
        TARGET_OFFSET_MS,
    );
  }

  /** 日历年差 + 自上次周年日起的整天数（与「满 x 年 y 天」口语一致）。 */
  function diffCalendar(from, to) {
    const fromWall = toTargetWallTime(from);
    const toWall = toTargetWallTime(to);
    let years = toWall.getUTCFullYear() - fromWall.getUTCFullYear();
    let anniversary = fromTargetWallTime(
      toWall.getUTCFullYear(),
      fromWall.getUTCMonth(),
      fromWall.getUTCDate(),
      fromWall.getUTCHours(),
      fromWall.getUTCMinutes(),
      fromWall.getUTCSeconds(),
      fromWall.getUTCMilliseconds(),
    );

    if (anniversary > to) {
      years -= 1;
      anniversary = fromTargetWallTime(
        toWall.getUTCFullYear() - 1,
        fromWall.getUTCMonth(),
        fromWall.getUTCDate(),
        fromWall.getUTCHours(),
        fromWall.getUTCMinutes(),
        fromWall.getUTCSeconds(),
        fromWall.getUTCMilliseconds(),
      );
    }

    const restMs = Math.max(0, to - anniversary);
    const days = Math.floor(restMs / DAY_MS);
    const afterDays = restMs % DAY_MS;
    const hours = Math.floor(afterDays / (1000 * 60 * 60));
    const minutes = Math.floor((afterDays % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((afterDays % (1000 * 60)) / 1000);

    return { years, days, hours, minutes, seconds };
  }

  function daysBetween(from, to) {
    const fromWall = toTargetWallTime(from);
    const toWall = toTargetWallTime(to);
    const fromUtc = Date.UTC(
      fromWall.getUTCFullYear(),
      fromWall.getUTCMonth(),
      fromWall.getUTCDate(),
    );
    const toUtc = Date.UTC(
      toWall.getUTCFullYear(),
      toWall.getUTCMonth(),
      toWall.getUTCDate(),
    );
    return Math.round((toUtc - fromUtc) / DAY_MS);
  }

  function parseEventDate(dateStr) {
    const matched = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) return null;
    const year = Number(matched[1]);
    const month = Number(matched[2]) - 1;
    const day = Number(matched[3]);
    return fromTargetWallTime(year, month, day);
  }

  function formatDotDate(dateStr) {
    return String(dateStr).replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1.$2.$3");
  }

  function syncLoveStartDisplay() {
    if (!startDisplay) return;
    document.querySelectorAll("[data-love-start-display]").forEach((el) => {
      el.textContent = startDisplay;
    });
  }

  function restartValueAnimation(el) {
    if (!el || prefersReducedMotion()) return;
    el.classList.remove("timer-value--changed");
    void el.offsetWidth;
    el.classList.add("timer-value--changed");
  }

  function updateTimer() {
    if (!isValidDate(startDate) || !timerRoot) return;

    const parts = diffCalendar(startDate, new Date());
    const next = {
      years: String(parts.years),
      days: String(parts.days),
      hours: pad2(parts.hours),
      minutes: pad2(parts.minutes),
      seconds: pad2(parts.seconds),
    };

    Object.keys(next).forEach((key) => {
      const node = timerNodes[key];
      if (!node) return;
      if (lastTimerValues && lastTimerValues[key] === next[key]) return;
      node.textContent = next[key];
      restartValueAnimation(node);
    });

    lastTimerValues = next;
    timerRoot.setAttribute(
      "aria-label",
      `${parts.years} 年 ${parts.days} 天 ${parts.hours} 小时 ${parts.minutes} 分钟 ${parts.seconds} 秒`,
    );
  }

  function setupTimer() {
    if (!timerRoot || !isValidDate(startDate)) return;
    startTimer();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) updateTimer();
    });
  }

  function startTimer() {
    if (!timerRoot || !isValidDate(startDate) || timerIntervalId) return;
    updateTimer();
    timerIntervalId = window.setInterval(updateTimer, 1000);
  }

  function stopTimer() {
    if (!timerIntervalId) return;
    window.clearInterval(timerIntervalId);
    timerIntervalId = 0;
  }

  function renderThemes() {
    const list = document.querySelector("[data-theme-list]");
    if (!list || !love.themes?.items?.length) return;

    const fragment = document.createDocumentFragment();
    love.themes.items.forEach((item) => {
      const article = document.createElement("article");
      article.className = "theme-piece";

      const order = document.createElement("p");
      order.className = "theme-order";
      order.textContent = item.order;

      const copy = document.createElement("div");
      copy.className = "theme-copy";

      const title = document.createElement("h3");
      title.textContent = item.title;
      copy.append(title);

      (item.paragraphs || []).forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        copy.append(p);
      });

      article.append(order, copy);
      fragment.append(article);
    });

    list.replaceChildren(fragment);
  }

  function renderTimeline() {
    const timeline = document.querySelector("[data-timeline]");
    if (!timeline || !love.chronicle?.events?.length || !isValidDate(startDate))
      return;

    const fragment = document.createDocumentFragment();
    let lastYear = null;

    love.chronicle.events.forEach((event) => {
      const eventDate = parseEventDate(event.date);
      if (!eventDate) return;

      const year = toTargetWallTime(eventDate).getUTCFullYear();
      if (year !== lastYear) {
        const yearItem = document.createElement("li");
        yearItem.className = "timeline-year";
        yearItem.setAttribute("aria-hidden", "true");
        yearItem.textContent = String(year);
        fragment.append(yearItem);
        lastYear = year;
      }

      const dayCount = daysBetween(startDate, eventDate);
      const tone = event.tone || "normal";
      const item = document.createElement("li");
      item.className = "timeline-item";
      if (tone === "major") item.classList.add("timeline-item--major");
      if (tone === "quiet") item.classList.add("timeline-item--quiet");
      item.id = `e-${event.date}`;

      const meta = document.createElement("div");
      meta.className = "timeline-meta";

      const dateP = document.createElement("p");
      dateP.className = "timeline-date";
      const time = document.createElement("time");
      time.dateTime = event.date;
      time.textContent = formatDotDate(event.date);
      dateP.append(time);

      const daysP = document.createElement("p");
      daysP.className = "timeline-days";
      daysP.textContent = `相爱第 ${dayCount + 1} 天`;

      meta.append(dateP, daysP);

      const body = document.createElement("div");
      body.className = "timeline-body";
      const title = document.createElement("h3");
      title.textContent = event.title;
      const p = document.createElement("p");
      p.textContent = event.body;
      body.append(title, p);

      item.append(meta, body);
      fragment.append(item);
    });

    timeline.replaceChildren(fragment);
  }

  function setupRevealAnimations() {
    const revealGroups = [
      { selector: ".letter .section-head", baseDelay: 0, step: 0 },
      { selector: ".letter .prose", baseDelay: 120, step: 0 },
      { selector: ".themes .section-head", baseDelay: 0, step: 0 },
      { selector: ".theme-piece", baseDelay: 80, step: 110 },
      { selector: ".chronicle .section-head", baseDelay: 0, step: 0 },
      { selector: ".timeline-item", baseDelay: 60, step: 85 },
      { selector: ".epilogue-inner", baseDelay: 0, step: 0 },
    ];

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
      revealElements.forEach((el) => el.classList.remove("reveal-pending"));
      observedElements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    revealElements.forEach((el) => el.classList.add("reveal-pending"));

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

    observedElements.forEach((el) => observer.observe(el));
  }

  function setupTocSpy() {
    const linkNodes = () =>
      Array.from(document.querySelectorAll("[data-toc-link]"));

    const sectionEntries = () =>
      linkNodes()
        .map((link) => {
          const id = link.getAttribute("href")?.slice(1);
          const section = id ? document.getElementById(id) : null;
          return section ? { link, section } : null;
        })
        .filter(Boolean);

    const setActive = (activeLink) => {
      linkNodes().forEach((item) => {
        const active = item === activeLink;
        item.classList.toggle("is-active", active);
        if (active) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
    };

    const sync = () => {
      const entries = sectionEntries();
      if (!entries.length) return;

      const offset = Math.min(140, window.innerHeight * 0.22);
      let current = entries[0];

      entries.forEach((entry) => {
        if (entry.section.getBoundingClientRect().top <= offset) {
          current = entry;
        }
      });

      // 接近页底时锁定最后一节
      const reachBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (reachBottom) current = entries[entries.length - 1];

      setActive(current.link);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("hashchange", sync);
    document.querySelector(".toc")?.addEventListener("click", (event) => {
      const link = event.target.closest("[data-toc-link]");
      if (!link) return;
      window.requestAnimationFrame(sync);
      window.setTimeout(sync, 120);
      window.setTimeout(sync, 320);
    });
  }

  function init() {
    syncLoveStartDisplay();
    renderThemes();
    renderTimeline();
    setupTimer();
    setupRevealAnimations();
    setupTocSpy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.addEventListener("pagehide", stopTimer);
  window.addEventListener("pageshow", startTimer);
})();
