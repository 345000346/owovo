// 仅 ?hl= 时由 head loader 注入；动态 import，失败 console.error。
//
// 契约：hl 参数；data-pagefind-highlight 脚本路径（无绝对路径回退）；
// 命中 mark.search-highlight（样式 _search-highlight.scss）。

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
    document.documentElement.getAttribute("data-pagefind-highlight");
  if (!highlightSrc) {
    console.error("search-highlight: missing data-pagefind-highlight path");
    return;
  }

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
