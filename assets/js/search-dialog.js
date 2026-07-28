"use strict";

{
  const dialog = document.getElementById("search-dialog");
  const config = document.getElementById("search-dialog-config");
  const searchLink = document.querySelector("[data-search-trigger]");

  if (
    dialog &&
    config &&
    searchLink &&
    typeof dialog.showModal === "function"
  ) {
    const closeButton = dialog.querySelector(".search-dialog-close");
    const bundlePath =
      config.getAttribute("data-pagefind-bundle") || "/pagefind/";
    const scriptPath =
      config.getAttribute("data-pagefind-js") || `${bundlePath}pagefind-ui.js`;
    const stylePath =
      config.getAttribute("data-pagefind-css") ||
      `${bundlePath}pagefind-ui.css`;
    let uiPromise;

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

    closeButton.addEventListener("click", () => {
      dialog.close();
      clearSearchHash();
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
        clearSearchHash();
      }
    });

    dialog.addEventListener("close", () => {
      clearSearchHash();
    });

    document.addEventListener("keydown", (event) => {
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

    // Deep link: /#search or hashchange to #search opens the dialog.
    if (location.hash === "#search") {
      openDialog();
    }
    window.addEventListener("hashchange", () => {
      if (location.hash === "#search") {
        openDialog();
      }
    });

    function openDialog() {
      document.dispatchEvent(new CustomEvent("site:close-navigation"));
      if (location.hash !== "#search") {
        // Keep menu href="#search" shareable without forcing scroll jump noise.
        const { pathname, search } = window.location;
        history.replaceState(null, "", `${pathname}${search}#search`);
      }
      if (!dialog.open) {
        dialog.showModal();
      }

      loadUI()
        .then(() => {
          dialog.querySelector(".pagefind-ui__search-input")?.focus();
        })
        .catch((error) => {
          console.error(error);
          dialog.querySelector(".search-dialog-search").textContent =
            "搜索暂时不可用，请稍后重试。";
        });
    }

    function clearSearchHash() {
      if (location.hash !== "#search") {
        return;
      }
      const { pathname, search } = window.location;
      history.replaceState(null, "", `${pathname}${search}`);
    }

    function loadUI() {
      if (!uiPromise) {
        ensureStyle();
        uiPromise = loadScript().then(() => {
          if (typeof window.PagefindUI !== "function") {
            throw new Error("Pagefind UI 未正确加载");
          }

          new window.PagefindUI({
            element: "#search-dialog-search",
            bundlePath,
            excerptLength: 25,
            pageSize: 5,
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

    function withHighlight(rawUrl, term) {
      try {
        const url = new URL(rawUrl, window.location.origin);
        url.searchParams.delete("hl");
        url.searchParams.append("hl", term);
        // Preserve absolute result URLs from Pagefind when present.
        return rawUrl.startsWith("http")
          ? url.toString()
          : `${url.pathname}${url.search}${url.hash}`;
      } catch {
        return rawUrl;
      }
    }
  }
}
