// 滚动 UI：--header-height、阅读进度、回到顶部。
//
// 契约：
// - --header-height ← .header 计算高度（初始化 + resize + 字体就绪重算）
// - #reading-progress：--progress（0–1）、aria-valuenow（0–100，仅整数变化时写入）
// - resize 同时重算进度（视口变化改变 scrollHeight 分母），不依赖下一次滚动
// - #back-to-top：scrollY > 100 时加 .show
// Concat：与 theme.js / navigation.js 同 module，顶层仅 initScrollUi。

function initScrollUi() {
  const headerEl = document.querySelector(".header");
  const progressBar = document.querySelector("#reading-progress");
  const backToTop = document.getElementById("back-to-top");
  const hasScrollUi = Boolean(progressBar || backToTop);

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

  // 字体异步加载与窗口缩放后重算 --header-height（锚点 scroll-margin 依赖）；
  // 视口尺寸变化也会改变进度分母（scrollHeight），一并重算避免比例失真。
  let resizeScheduled = false;
  window.addEventListener("resize", () => {
    if (resizeScheduled) {
      return;
    }
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      updateHeaderHeight();
      if (hasScrollUi) {
        updateScrollUI();
      }
    });
  });
  if (document.fonts && typeof document.fonts.ready === "object") {
    document.fonts.ready.then(updateHeaderHeight).catch(() => {});
  }

  if (!hasScrollUi) {
    return;
  }

  let scheduled = false;
  let lastProgressPercent = -1;

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
      const percent = Math.round(progress * 100);
      // aria-valuenow 只在整数变化时写入，避免每滚动帧重复 DOM 写。
      if (percent !== lastProgressPercent) {
        lastProgressPercent = percent;
        progressBar.setAttribute("aria-valuenow", String(percent));
      }
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
