const getResolvedTheme = () => {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

const syncThemedBadges = () => {
  const theme = getResolvedTheme();

  document.querySelectorAll("img.themed-badge").forEach((badge) => {
    const nextSrc =
      theme === "dark" ? badge.dataset.darkSrc : badge.dataset.lightSrc;
    if (nextSrc && badge.getAttribute("src") !== nextSrc) {
      badge.setAttribute("src", nextSrc);
    }
  });
};

const initThemedBadges = () => {
  const badges = document.querySelectorAll("img.themed-badge");
  if (badges.length === 0) {
    return;
  }

  syncThemedBadges();

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === "data-theme")) {
      syncThemedBadges();
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
};

const initPagefindSearch = async () => {
  const config = window.__BLOG_CONFIG__;
  if (!config) {
    return;
  }

  const searchPath = config.pagefindSearchPath || "/search/";
  const normalizedPath = `${window.location.pathname.replace(/\/+$/, "")}/`;
  const normalizedSearchPath = `${searchPath.replace(/\/+$/, "")}/`;

  if (!normalizedPath.endsWith(normalizedSearchPath)) {
    return;
  }

  const searchContainer = document.getElementById("search");
  const statusNode = document.getElementById("search-status");

  if (!searchContainer) {
    return;
  }

  const waitForPagefindUI = async () => {
    const timeoutMs = 2000;
    const intervalMs = 50;
    const maxTries = Math.ceil(timeoutMs / intervalMs);

    for (let i = 0; i < maxTries; i++) {
      if (typeof window.PagefindUI === "function") {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return false;
  };

  const pagefindReady = await waitForPagefindUI();
  if (!pagefindReady) {
    if (statusNode) {
      statusNode.textContent = config.i18n.pagefindSearchUnavailable;
    }
    return;
  }

  try {
    new window.PagefindUI({
      element: "#search",
    });

    const input = searchContainer.querySelector(
      'input[type="search"], input[type="text"]',
    );
    if (input) {
      if (!input.id) {
        input.id = "search-input";
      }
      if (!input.getAttribute("aria-label")) {
        input.setAttribute("aria-label", config.i18n.pagefindSearchInputLabel);
      }
    }

    if (statusNode) {
      statusNode.textContent = "";
    }
  } catch (error) {
    if (statusNode) {
      statusNode.textContent = config.i18n.pagefindSearchUnavailable;
    }
    console.error("[搜索] Pagefind 初始化失败", error);
  }
};

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    initThemedBadges();
    initPagefindSearch();
  },
  { once: true },
);
