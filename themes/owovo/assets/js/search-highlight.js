(() => {
  const highlightTerms = new URLSearchParams(window.location.search).getAll("hl");

  if (!highlightTerms.some(Boolean)) {
    return;
  }

  import("{{ "pagefind/pagefind-highlight.js" | relURL }}").then(({ default: PagefindHighlight }) => {
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
    if (firstMark) {
      requestAnimationFrame(() => {
        firstMark.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  });
})();
