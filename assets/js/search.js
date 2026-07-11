(() => {
  const highlightParam = "hl";
  let currentTerm = "";

  const searchRoot = document.getElementById("search");
  const pagefindBundlePath =
    (searchRoot && searchRoot.dataset.pagefindBundle) || "/pagefind/";

  function getHashSearch() {
    return (
      new URLSearchParams(window.location.hash.slice(1)).get("search") || ""
    );
  }

  function withHighlight(rawUrl) {
    if (!currentTerm || !rawUrl) return rawUrl;

    try {
      const url = new URL(rawUrl, window.location.origin);
      url.searchParams.delete(highlightParam);
      url.searchParams.append(highlightParam, currentTerm);
      return rawUrl.startsWith("http")
        ? url.toString()
        : `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return rawUrl;
    }
  }

  function processResult(result) {
    if (!currentTerm) {
      return result;
    }

    const next = {
      ...result,
      url: withHighlight(result.url),
      meta: { ...result.meta },
    };

    if (next.meta.url) {
      next.meta.url = withHighlight(next.meta.url);
    }

    if (Array.isArray(result.sub_results)) {
      next.sub_results = result.sub_results.map((subResult) => ({
        ...subResult,
        url: withHighlight(subResult.url),
      }));
    }

    return next;
  }

  function initSearch() {
    if (typeof PagefindUI !== "function") {
      return false;
    }

    const search = new PagefindUI({
      element: "#search",
      bundlePath: pagefindBundlePath,
      excerptLength: 25,
      focusOnSlash: true,
      pageSize: 5,
      processResult,
      processTerm(term) {
        currentTerm = term.trim();
        return currentTerm;
      },
      showImages: false,
      showSubResults: true,
      sort: { term_frequency_desc: {} },
    });

    const initialTerm = getHashSearch();
    if (initialTerm) {
      requestAnimationFrame(() => search.triggerSearch(initialTerm));
    }

    window.addEventListener("hashchange", () => {
      search.triggerSearch(getHashSearch());
    });

    return true;
  }

  // pagefind-ui.js is a classic blocking script before this module, but keep a
  // short ready wait so future defer/async on the UI script does not break us.
  if (initSearch()) {
    return;
  }

  let attempts = 0;
  const maxAttempts = 40; // ~640ms at 16ms
  const timer = window.setInterval(() => {
    attempts += 1;
    if (initSearch() || attempts >= maxAttempts) {
      window.clearInterval(timer);
      if (attempts >= maxAttempts && typeof PagefindUI !== "function") {
        console.error("PagefindUI is not available");
      }
    }
  }, 16);
})();
