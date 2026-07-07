(() => {
    const highlightParam = "hl";
    let currentTerm = "";

    function getHashSearch() {
        return new URLSearchParams(window.location.hash.slice(1)).get("search") || "";
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

    const search = new PagefindUI({
        element: "#search",
        bundlePath: "{{ "pagefind/" | relURL }}",
        excerptLength: 25,
        focusOnSlash: true,
        highlightParam,
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
})();
