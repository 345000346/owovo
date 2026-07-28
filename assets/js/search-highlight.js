// Loaded only when ?hl= is present (see head loader).
// Dynamic import keeps the common path free of Pagefind highlight cost;
// failures degrade silently (no highlight) rather than breaking the page.

function initSearchHighlight() {
  const highlightTerms = new URLSearchParams(window.location.search).getAll(
    "hl",
  );

  if (!highlightTerms.some(Boolean)) {
    return;
  }

  const scriptEl = document.querySelector(
    "script[data-pagefind-highlight][type='module']",
  );
  const highlightSrc =
    scriptEl?.getAttribute("data-pagefind-highlight") ||
    document.documentElement.getAttribute("data-pagefind-highlight") ||
    "/pagefind/pagefind-highlight.js";

  import(highlightSrc)
    .then(({ default: PagefindHighlight }) => {
      new PagefindHighlight({
        addStyles: false,
        highlightParam: "hl",
        markOptions: {
          className: "search-highlight",
          exclude: [
            "[data-pagefind-ignore]",
            "[data-pagefind-ignore] *",
            "script",
            "style",
            "textarea",
            "input",
            "select",
            "noscript",
            "code",
            "pre",
            "kbd",
          ],
        },
      });

      const firstMark = document.querySelector("mark.search-highlight");
      if (!firstMark) {
        return;
      }

      const reducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = reducedMotion ? "auto" : "smooth";

      requestAnimationFrame(() => {
        firstMark.scrollIntoView({ block: "center", behavior });
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

initSearchHighlight();
