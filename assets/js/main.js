// --- 1. 定义所有辅助函数 ---

// 导航辅助函数
const closeNav = () => {
  const navContent = document.getElementById("nav-content");
  const navToggle = document.getElementById("nav-toggle");
  if (navContent) navContent.classList.add("hidden");
  if (navToggle) navToggle.setAttribute("aria-expanded", "false");
};

const openNav = () => {
  const navContent = document.getElementById("nav-content");
  const navToggle = document.getElementById("nav-toggle");
  if (navContent) navContent.classList.remove("hidden");
  if (navToggle) navToggle.setAttribute("aria-expanded", "true");
};

// 主题辅助函数（与原主题机制保持一致：使用 html.dark）
const getStoredThemePreference = () => {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  if (storedTheme !== null) {
    localStorage.removeItem("theme");
  }
  return null;
};

const applyRootThemeState = (isDark) => {
  const htmlElement = document.documentElement;
  htmlElement.classList.toggle("dark", isDark);
  htmlElement.dataset.theme = isDark ? "dark" : "light";
  htmlElement.style.colorScheme = isDark ? "dark" : "light";
  htmlElement.style.setProperty("--theme-bg", isDark ? "#374151" : "#f3f4f6");
  htmlElement.style.setProperty("--theme-fg", isDark ? "#f3f4f6" : "#111827");
  htmlElement.style.setProperty("--theme-surface", isDark ? "#1f2937" : "#ffffff");
};

const applyThemeIcons = (isDark) => {
  const lightIcon = document.getElementById("light-icon");
  const darkIcon = document.getElementById("dark-icon");
  const switchThemeButton = document.getElementById("switchTheme");
  if (!lightIcon || !darkIcon) {
    return;
  }

  if (isDark) {
    lightIcon.classList.add("hidden");
    darkIcon.classList.remove("hidden");
  } else {
    lightIcon.classList.remove("hidden");
    darkIcon.classList.add("hidden");
  }

  if (switchThemeButton) {
    switchThemeButton.setAttribute("aria-pressed", String(isDark));
    switchThemeButton.setAttribute(
      "aria-label",
      isDark ? "切换为浅色模式" : "切换为深色模式",
    );
  }
};

const initTheme = () => {
  const storedTheme = getStoredThemePreference();
  const isDark =
    storedTheme === "dark" ||
    (storedTheme === null &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  applyRootThemeState(isDark);
  applyThemeIcons(isDark);
  updateBadgeThemes(isDark);
};

const animateThemeButton = () => {
  const button = document.getElementById("switchTheme");
  if (!button) {
    return;
  }

  button.classList.remove("theme-animating");
  void button.offsetWidth;
  button.classList.add("theme-animating");
};

let themeToastElement;
let themeToastTimer;

const ensureThemeToast = () => {
  if (themeToastElement) {
    return themeToastElement;
  }

  const toast = document.createElement("div");
  toast.id = "theme-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  document.body.appendChild(toast);

  themeToastElement = toast;
  return toast;
};

const showThemeToast = (isDark) => {
  const toast = ensureThemeToast();
  toast.textContent = isDark ? "已切换为深色模式" : "已切换为浅色模式";

  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");

  if (themeToastTimer) {
    window.clearTimeout(themeToastTimer);
  }

  themeToastTimer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1500);
};

const handleThemeToggle = (event) => {
  const htmlElement = document.documentElement;
  const isDark = htmlElement.classList.contains("dark");
  const nextDark = !isDark;

  if (!htmlElement.classList.contains("theme-ready")) {
    htmlElement.classList.add("theme-ready");
  }

  const applyTheme = () => {
    applyRootThemeState(nextDark);
    localStorage.theme = nextDark ? "dark" : "light";

    applyThemeIcons(nextDark);
    updateBadgeThemes(nextDark);
    showThemeToast(nextDark);
  };

  animateThemeButton();

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || prefersReducedMotion) {
    applyTheme();
    return;
  }

  const clickX = event?.clientX ?? window.innerWidth - 40;
  const clickY = event?.clientY ?? 40;
  const endRadius = Math.hypot(
    Math.max(clickX, window.innerWidth - clickX),
    Math.max(clickY, window.innerHeight - clickY),
  );

  htmlElement.style.setProperty("--theme-switch-x", `${clickX}px`);
  htmlElement.style.setProperty("--theme-switch-y", `${clickY}px`);

  const transition = document.startViewTransition(() => {
    applyTheme();
  });

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${clickX}px ${clickY}px)`,
          `circle(${endRadius}px at ${clickX}px ${clickY}px)`,
        ],
      },
      {
        duration: 640,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
};

// 徽章主题辅助函数
const updateBadgeThemes = (isDark = document.documentElement.classList.contains("dark")) => {
  document.querySelectorAll(".themed-badge").forEach((badge) => {
    const lightSrc = badge.getAttribute("data-light-src");
    const darkSrc = badge.getAttribute("data-dark-src");
    badge.src = isDark ? darkSrc : lightSrc;
  });
};

// 滚动辅助函数
const handleScroll = () => {
  const progressBar = document.querySelector("#progress");
  const navcontent = document.getElementById("nav-content");
  const scrollY = window.scrollY;
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;

  if (progressBar && scrollHeight > 0) {
    progressBar.style.setProperty(
      "--scroll",
      `${(scrollY / scrollHeight) * 100}%`,
    );
  }

  if (navcontent) {
    if (scrollY > 10) {
      navcontent.classList.remove("bg-gray-100");
    } else {
      navcontent.classList.add("bg-gray-100");
    }
  }
};

// 代码块折叠辅助函数
const handleCodeFolding = () => {
  document.querySelectorAll(".highlight").forEach((el, index) => {
    const pre = el.querySelector("pre");
    if (pre && pre.scrollHeight > 200) {
      pre.style.maxHeight = "200px";
      // 为 pre 添加 ID 以支持 aria-controls
      const preId = `code-block-${index}`;
      pre.id = preId;

      const toggleBtn = document.createElement("div");
      toggleBtn.className = "code-toggle";
      toggleBtn.setAttribute("role", "button");
      toggleBtn.setAttribute("tabindex", "0");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.setAttribute("aria-controls", preId);
      toggleBtn.setAttribute("aria-label", "展开代码块");
      toggleBtn.innerHTML =
        '<span class="code-toggle-text">展开</span><i class="iconfont icon-arrow-down"></i>';

      const toggleExpand = () => {
        const isExpanded = pre.style.maxHeight !== "200px";
        pre.style.maxHeight = isExpanded ? "200px" : "none";
        toggleBtn.setAttribute("aria-expanded", !isExpanded);
        toggleBtn.setAttribute("aria-label", isExpanded ? "展开代码块" : "收起代码块");
        toggleBtn.querySelector(".code-toggle-text").textContent = isExpanded
          ? "展开"
          : "收起";
      };

      toggleBtn.onclick = toggleExpand;
      toggleBtn.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleExpand();
        }
      };
      el.insertBefore(toggleBtn, pre);
    }
  });
};

// 今日诗词辅助函数
const renderPoemFallback = (card) => {
  const sentence = card.querySelector(".poem-sentence");
  const info = card.querySelector(".poem-info");
  if (!sentence || !info) {
    return;
  }
  sentence.textContent = "今日诗词加载失败";
  info.textContent = "";
};

const renderPoem = (card, result) => {
  const sentence = card.querySelector(".poem-sentence");
  const info = card.querySelector(".poem-info");
  if (!sentence || !info) {
    return;
  }

  if (!result || !result.data || !result.data.origin) {
    renderPoemFallback(card);
    return;
  }

  sentence.textContent = result.data.content;
  info.textContent =
    "【" +
    result.data.origin.dynasty +
    "】" +
    result.data.origin.author +
    "《" +
    result.data.origin.title +
    "》";
};

const loadPoemForCard = (card) => {
  if (!window.jinrishici || !window.jinrishici.load) {
    return;
  }

  window.jinrishici.load((result) => {
    try {
      renderPoem(card, result);
    } catch (_error) {
      renderPoemFallback(card);
    }
  });
};

const loadPoemSdkOnce = () => {
  if (window.jinrishici?.load) {
    document.dispatchEvent(new Event("jinrishici:ready"));
    return;
  }

  if (window.__jinrishici_script_loading) {
    return;
  }

  window.__jinrishici_script_loading = true;
  const sdk = document.createElement("script");
  sdk.src = "https://sdk.jinrishici.com/v2/browser/jinrishici.js";
  sdk.charset = "utf-8";
  sdk.defer = true;
  sdk.onload = () => {
    document.dispatchEvent(new Event("jinrishici:ready"));
  };
  sdk.onerror = () => {
    document.dispatchEvent(new Event("jinrishici:error"));
  };
  document.head.appendChild(sdk);
};

const initPoemCards = () => {
  const cards = document.querySelectorAll(".poem-card");
  if (!cards.length) {
    return;
  }

  const pendingCards = [];
  cards.forEach((card) => {
    if (card.dataset.jinrishiciInit === "1") {
      return;
    }
    card.dataset.jinrishiciInit = "1";
    pendingCards.push(card);
  });

  if (!pendingCards.length) {
    return;
  }

  const onReady = () => {
    pendingCards.forEach((card) => {
      loadPoemForCard(card);
    });
  };

  const onError = () => {
    pendingCards.forEach((card) => {
      renderPoemFallback(card);
    });
  };

  document.addEventListener("jinrishici:ready", onReady, { once: true });
  document.addEventListener("jinrishici:error", onError, { once: true });
  loadPoemSdkOnce();
};

// --- 2. 添加持久化的事件监听器 ---
document.addEventListener("DOMContentLoaded", () => {
  // 导航和主题切换的点击事件监听
  document.body.addEventListener("click", (e) => {
    if (e.target.closest("#nav-toggle")) {
      const navContent = document.getElementById("nav-content");
      if (navContent?.classList.contains("hidden")) {
        openNav();
      } else {
        closeNav();
      }
    } else if (e.target.closest("#nav-content a")) {
      closeNav();
    }

    if (e.target.closest("#switchTheme")) {
      handleThemeToggle(e);
    }
  });

  // 监听系统颜色方案的变化
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    // 如果用户未手动设置有效主题，则跟随系统主题
    if (getStoredThemePreference() === null) {
      const isDark = e.matches;
      applyRootThemeState(isDark);
      applyThemeIcons(isDark);
      updateBadgeThemes(isDark);
    }
  });

  // 滚动事件监听
  document.addEventListener("scroll", handleScroll);

  // --- 3. 运行页面特定的初始化脚本 ---
  initTheme(); // 页面加载时初始化主题与徽章


  // 代码块折叠功能
  handleCodeFolding();

  // 今日诗词卡片加载
  initPoemCards();

  // 初始化滚动进度和导航背景
  handleScroll();
});
