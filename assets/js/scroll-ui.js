// 滚动 UI：--header-height、阅读进度、回到顶部。
//
// 契约：
// - --header-height ← .header 的 border-box 高度（初始化 + resize + 字体就绪 + 内容尺寸变化重算）
// - #reading-progress：--progress（0–1）、aria-valuenow（0–100，仅整数变化时写入）
// - resize / 内容高度变化同时重算进度分母，不依赖下一次滚动
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
    // getBoundingClientRect 含 1px 下边框；getComputedStyle().height 只有内容盒。
    const headerHeight = headerEl.getBoundingClientRect().height;
    document.documentElement.style.setProperty(
      "--header-height",
      `${headerHeight}px`,
    );
  }

  updateHeaderHeight();

  // 进度分母缓存：每帧读 scrollHeight 会强制同步布局。字体、图片、展开折叠都会改变
  // 文档高度，用 ResizeObserver（body 内容盒）与 load/resize 重算。
  let progressRange = 0;
  function updateProgressRange() {
    if (!hasScrollUi) {
      return;
    }
    const doc = document.documentElement;
    progressRange = Math.max(0, doc.scrollHeight - doc.clientHeight);
  }

  let scheduled = false;
  let lastProgressPercent = -1;

  function updateScrollUI() {
    scheduled = false;
    if (!hasScrollUi) {
      return;
    }
    const scrollY = window.scrollY;

    if (progressBar) {
      const progress =
        progressRange <= 0
          ? 0
          : Math.min(1, Math.max(0, scrollY / progressRange));
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

  function refreshLayout() {
    updateHeaderHeight();
    updateProgressRange();
    updateScrollUI();
  }

  refreshLayout();

  let resizeScheduled = false;
  window.addEventListener("resize", () => {
    if (resizeScheduled) {
      return;
    }
    resizeScheduled = true;
    requestAnimationFrame(() => {
      resizeScheduled = false;
      refreshLayout();
    });
  });

  // 字体异步加载会改变顶栏高度与正文折行。
  if (document.fonts && typeof document.fonts.ready === "object") {
    document.fonts.ready.then(refreshLayout).catch(() => {});
  }
  window.addEventListener("load", refreshLayout);

  if (hasScrollUi) {
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

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        updateProgressRange();
        updateScrollUI();
      });
      observer.observe(document.body);
    }
  }
}

initScrollUi();
