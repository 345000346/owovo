// 滚动 UI：--header-height、阅读进度、回到顶部。
//
// 契约：
// - --header-height ← .header 计算高度（初始化 + resize + 字体就绪重算）
// - #reading-progress：--progress（0–1）、aria-valuenow（0–100）
// - #back-to-top：scrollY > 100 时加 .show
// Concat：与 theme.js / navigation.js 同 module，顶层仅 initScrollUi。

function initScrollUi() {
  const headerEl = document.querySelector(".header");

  function updateHeaderHeight() {
    if (!headerEl) {
      return;
    }
    const headerHeight = window
      .getComputedStyle(headerEl)
      .getPropertyValue("height");
    document.documentElement.style.setProperty(
      "--header-height",
      headerHeight,
    );
  }

  updateHeaderHeight();

  // 字体异步加载与窗口缩放后重算 --header-height（锚点 scroll-margin 依赖）。
  let resizeScheduled = false;
  window.addEventListener("resize", () => {
    if (resizeScheduled) {
      return;
    }
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      updateHeaderHeight();
    });
  });
  if (document.fonts && typeof document.fonts.ready === "object") {
    document.fonts.ready.then(updateHeaderHeight).catch(() => {});
  }

  const progressBar = document.querySelector("#reading-progress");
  const backToTop = document.getElementById("back-to-top");
  if (!progressBar && !backToTop) {
    return;
  }

  let scheduled = false;

  function updateScrollUI() {
    scheduled = false;
    const scrollY = window.scrollY;

    if (progressBar) {
      const scrollHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const progress =
        scrollHeight <= 0 ? 0 : Math.min(1, Math.max(0, scrollY / scrollHeight));
      progressBar.style.setProperty("--progress", String(progress));
      progressBar.setAttribute(
        "aria-valuenow",
        String(Math.round(progress * 100)),
      );
    }

    if (backToTop) {
      backToTop.classList.toggle("show", scrollY > 100);
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateScrollUI);
      }
    },
    { passive: true },
  );

  updateScrollUI();
}

initScrollUi();
