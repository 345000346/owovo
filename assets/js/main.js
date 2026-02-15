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

// 主题辅助函数
const handleThemeToggle = () => {
  const htmlElement = document.documentElement;
  const currentTheme = htmlElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  htmlElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateBadgeThemes();
};

// 徽章主题辅助函数
const updateBadgeThemes = () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  document.querySelectorAll(".themed-badge").forEach((badge) => {
    const lightSrc = badge.getAttribute("data-light-src");
    const darkSrc = badge.getAttribute("data-dark-src");
    if (currentTheme === "dark") {
      badge.src = darkSrc;
    } else {
      badge.src = lightSrc;
    }
  });
};

// 滚动辅助函数
const handleScroll = () => {
  const progressBar = document.querySelector("#progress");
  const scrollY = window.scrollY;
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;

  if (progressBar) {
    progressBar.style.setProperty(
      "--scroll",
      `${(scrollY / scrollHeight) * 100}%`,
    );
  }
};

// 代码块折叠辅助函数
const handleCodeFolding = () => {
  document.querySelectorAll(".highlight").forEach((el) => {
    const pre = el.querySelector("pre");
    if (pre && pre.scrollHeight > 200) {
      pre.style.maxHeight = "200px";
      const toggleBtn = document.createElement("div");
      toggleBtn.className = "code-toggle";
      toggleBtn.innerHTML =
        '<span class="code-toggle-text">展开</span><i class="iconfont icon-arrow-down"></i>';
      toggleBtn.onclick = () => {
        const isExpanded = pre.style.maxHeight !== "200px";
        pre.style.maxHeight = isExpanded ? "200px" : "none";
        toggleBtn.querySelector(".code-toggle-text").textContent = isExpanded
          ? "展开"
          : "收起";
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
      handleThemeToggle();
    }
  });

  // 监听系统颜色方案的变化
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (e) => {
    // 如果用户未手动设置主题，则跟随系统主题
    if (!localStorage.getItem("theme")) {
      const newTheme = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      updateBadgeThemes(); // 同时更新徽章主题
    }
  });

  // 滚动事件监听
  document.addEventListener("scroll", handleScroll);

  // --- 3. 运行页面特定的初始化脚本 ---
  updateBadgeThemes(); // 页面加载时初始化徽章主题

  // 初始加载后重新启用过渡效果，防止页面加载时出现闪烁
  setTimeout(() => {
    document.documentElement.style.removeProperty("transition");
  }, 0);

  // 代码块折叠功能
  handleCodeFolding();

  // 今日诗词卡片加载
  initPoemCards();
});
