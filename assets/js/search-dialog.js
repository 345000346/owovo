// 全站搜索 Dialog + 懒加载 Pagefind UI。
// 打开：[data-search-trigger]、Ctrl/Cmd+K、/、#search（repeat 自动重放被忽略）。
//
// 契约：#search-dialog、#search-dialog-config 的 data-pagefind-*；
// 结果加 ?hl=；打开时派发 site:close-navigation；路径只放 data-*（防 --minify）；
// ↑/↓ 在结果链接之间移动（Pagefind Default UI 自身不提供）。

/** 元素是否真的渲染出来（display: none 与 visibility: hidden 都算否）。 */
function isRendered(element) {
  return (
    element.offsetParent !== null &&
    window.getComputedStyle(element).visibility !== "hidden"
  );
}

function initSearchDialog() {
  const dialog = document.getElementById("search-dialog");
  const config = document.getElementById("search-dialog-config");
  const searchLink = document.querySelector("[data-search-trigger]");

  if (
    !dialog ||
    !config ||
    typeof dialog.showModal !== "function"
  ) {
    return;
  }

  const closeButton = dialog.querySelector(".search-dialog-close");
  const bundlePath = config.getAttribute("data-pagefind-bundle");
  const scriptPath = config.getAttribute("data-pagefind-js");
  const stylePath = config.getAttribute("data-pagefind-css");
  if (!bundlePath || !scriptPath || !stylePath) {
    console.error("search-dialog: missing pagefind path on #search-dialog-config");
    return;
  }
  const searchContainer = dialog.querySelector(".search-dialog-search");
  let uiPromise;
  let previousHash = "";

  function clearSearchHash() {
    if (location.hash !== "#search") {
      return;
    }
    // 恢复打开前的锚点，避免破坏 TOC 深链等原 hash。
    const { pathname, search } = window.location;
    history.replaceState(null, "", `${pathname}${search}${previousHash}`);
  }

  function highlightTerms(term) {
    const matches = term.match(/"[^"]+"|\S+/g) || [];
    return [
      ...new Set(
        matches
          .map((match) => match.replace(/^"|"$/g, "").trim())
          .filter(Boolean),
      ),
    ];
  }

  function withHighlight(rawUrl, term) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      url.searchParams.delete("hl");
      highlightTerms(term).forEach((highlightTerm) => {
        url.searchParams.append("hl", highlightTerm);
      });
      // 保留 Pagefind 绝对 URL。
      return rawUrl.startsWith("http")
        ? url.toString()
        : `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return rawUrl;
    }
  }

  function processResult(result) {
    const term = dialog.dataset.searchTerm || "";
    if (!term) {
      return result;
    }

    const next = {
      ...result,
      url: withHighlight(result.url, term),
      meta: { ...result.meta },
    };
    if (next.meta.url) {
      next.meta.url = withHighlight(next.meta.url, term);
    }
    if (Array.isArray(result.sub_results)) {
      next.sub_results = result.sub_results.map((subResult) => ({
        ...subResult,
        url: withHighlight(subResult.url, term),
      }));
    }
    return next;
  }

  function ensureStyle() {
    if (document.querySelector("link[data-search-dialog-pagefind]")) {
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylePath;
    link.setAttribute("data-search-dialog-pagefind", "");
    document.head.append(link);
  }

  function loadScript() {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        "script[data-search-dialog-pagefind]",
      );
      if (existing) {
        if (typeof window.PagefindUI === "function") {
          resolve();
        } else {
          existing.addEventListener("load", resolve, { once: true });
          existing.addEventListener("error", reject, { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = scriptPath;
      script.setAttribute("data-search-dialog-pagefind", "");
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.append(script);
    });
  }

  function loadUI() {
    if (!uiPromise) {
      ensureStyle();
      uiPromise = loadScript().then(() => {
        if (typeof window.PagefindUI !== "function") {
          throw new Error("Pagefind UI 未正确加载");
        }

        searchContainer?.replaceChildren();
        new window.PagefindUI({
          element: "#search-dialog-search",
          bundlePath,
          excerptLength: 25,
          pageSize: 100,
          processResult,
          processTerm(term) {
            dialog.dataset.searchTerm = term.trim();
            return dialog.dataset.searchTerm;
          },
          showImages: false,
          showSubResults: true,
        });
      });
    }
    return uiPromise;
  }

  let opener = null;

  // Pagefind Default UI 只处理 Enter/Escape，结果之间没有 ↑/↓ 导航；
  // 面板底部写着的「↑ ↓ 选择」由这里兑现：输入框里按 ↓ 进到第一条结果，
  // 结果之间上下移动，第一条再按 ↑ 回到输入框。
  function moveResultFocus(step) {
    const links = [...dialog.querySelectorAll(".pagefind-ui__result-link")];
    if (!links.length) {
      return false;
    }
    const input = dialog.querySelector(".pagefind-ui__search-input");
    const current = links.indexOf(document.activeElement);
    if (current === -1) {
      links[step > 0 ? 0 : links.length - 1].focus();
      return true;
    }
    if (step < 0 && current === 0) {
      input?.focus();
      return true;
    }
    links[Math.min(links.length - 1, current + step)].focus();
    return true;
  }

  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    if (!moveResultFocus(event.key === "ArrowDown" ? 1 : -1)) {
      return;
    }
    event.preventDefault();
  });

  function openDialog() {
    document.dispatchEvent(new CustomEvent("site:close-navigation"));
    if (location.hash !== "#search") {
      // 写入 #search 可分享，且不强制滚顶；先记下原 hash 以便关闭时恢复。
      previousHash = location.hash;
      const { pathname, search } = window.location;
      history.replaceState(null, "", `${pathname}${search}#search`);
    }
    if (!dialog.open) {
      const current = document.activeElement;
      opener =
        current instanceof HTMLElement && current !== document.body
          ? current
          : null;
      dialog.showModal();
    }

    loadUI()
      .then(() => {
        if (!dialog.open) {
          return;
        }
        dialog.querySelector(".pagefind-ui__search-input")?.focus();
      })
      .catch((error) => {
        // 允许临时网络失败后再次打开时重新加载 Pagefind。
        uiPromise = null;
        document.querySelector("script[data-search-dialog-pagefind]")?.remove();
        console.error(error);
        if (searchContainer) {
          searchContainer.textContent =
            "搜索暂时不可用，请稍后重试。";
        }
      });
  }

  // 菜单项缺失只影响这一处点击绑定；Ctrl/Cmd+K、/ 与 #search 仍可用。
  if (searchLink) {
    searchLink.setAttribute("aria-haspopup", "dialog");
    searchLink.setAttribute("aria-controls", "search-dialog");

    searchLink.addEventListener("click", (event) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      openDialog();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      dialog.close();
    });
  }

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.addEventListener("close", () => {
    clearSearchHash();
    // close 事件触发时焦点通常还在 Dialog 内（输入框），浏览器稍后才把它丢回 body：
    // 只看「焦点是否已在 Dialog 外的可用元素上」来决定是否手动归还。
    const active = document.activeElement;
    const focusElsewhere =
      active instanceof HTMLElement &&
      active !== document.body &&
      !dialog.contains(active);
    if (focusElsewhere) {
      return;
    }
    // 打开时菜单已收起（site:close-navigation）：窄屏触发项所在的 .nav 现在是
    // visibility: hidden，聚焦它等于交给不可见元素，改为归还给菜单开关。
    const navToggle = document.querySelector(".nav-toggle");
    const target = opener && isRendered(opener)
      ? opener
      : navToggle && isRendered(navToggle)
        ? navToggle
        : null;
    target?.focus();
  });

  document.addEventListener("keydown", (event) => {
    // 组合键/斜杠按住的自动 repeat 会反复重开 Dialog：一次性动作，忽略 repeat。
    if (event.repeat) {
      return;
    }
    const target = event.target;
    const isTyping =
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable);
    const openShortcut =
      (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    const slashShortcut =
      event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey;

    if ((openShortcut || (slashShortcut && !isTyping)) && !event.shiftKey) {
      event.preventDefault();
      openDialog();
    }
  });

  // /#search 与 hashchange 打开。
  if (location.hash === "#search") {
    openDialog();
  }
  window.addEventListener("hashchange", (event) => {
    if (location.hash !== "#search") {
      // 后退/前进离开 #search 时模态随 URL 同步关闭；close 触发上方监听完成清理。
      if (dialog.open) dialog.close();
      return;
    }
    // 记录 hashchange 打开前（如手改地址为 /#search）的真实锚点。
    try {
      const oldHash = new URL(event.oldURL, window.location.href).hash;
      if (oldHash !== "#search") {
        previousHash = oldHash;
      }
    } catch {}
    openDialog();
  });
}

initSearchDialog();
