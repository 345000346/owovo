// 文章页：事件委托复制 .code-block（外壳：render-codeblock.html）；
// TOC 滚动定位（.toc a.active + aria-current）与文末淡出（.contents.bottom）。
//
// 契约：.copy-button / .code-block-status；.post-body 的 data-copy-* 文案；
// details.contents / summary.contents-title；nav a[href^="#"]；
// .contents.bottom：文章区底部进入视口后淡出让位（fixed 悬浮时）；
// 移动端（<68em）默认折叠 TOC（桌面由模板 open 展开）。
// 由 script.html 注入：文章页，以及开启 TOC 的普通页（or (partial "utils/is-post.html" .) .Params.toc）。
// 每个按钮独立复位计时器；点击递增版本号，并发写入时仅最后一次点击生效，
// 状态（成功/失败）统一在 1s 后复位。

function getCopyLabels(root) {
  const scope =
    root?.closest?.(".post-body") || document.querySelector(".post-body");
  return {
    copy: scope?.dataset.copyLabel || "复制",
    copied: scope?.dataset.copiedLabel || "已复制",
    failed: scope?.dataset.copyFailedLabel || "复制失败",
  };
}

function getCodeText(wrapper) {
  // Chroma lineNos 会出两个 <pre>（行号 + 源码），取最后一个。
  const pres = wrapper.querySelectorAll("pre");
  if (pres.length >= 2) {
    return pres[pres.length - 1].innerText;
  }
  if (pres.length === 1) {
    const code = pres[0].querySelector("code");
    return code ? code.innerText : pres[0].innerText;
  }
  const code = wrapper.querySelector("code");
  return code ? code.innerText : wrapper.innerText;
}

function initCopyDelegation() {
  const copyButtons = document.querySelectorAll(".code-block .copy-button");
  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    copyButtons.forEach((button) => {
      button.hidden = true;
    });
    return;
  }

  // 每个按钮一个复位计时器：连续点击时先清旧计时器，避免“已复制”被提前复位。
  const resetTimers = new WeakMap();
  // 每个按钮一个点击版本号：写入重叠时只有最后一次点击能写 UI 状态。
  const clickCounters = new WeakMap();

  function clearResetTimer(button) {
    const timer = resetTimers.get(button);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      resetTimers.delete(button);
    }
  }

  function nextClickId(button) {
    const next = (clickCounters.get(button) || 0) + 1;
    clickCounters.set(button, next);
    return next;
  }

  function scheduleReset(button, labels, status) {
    const timer = window.setTimeout(() => {
      // 仅当仍是当前计时器时清理条目，避免误删新点击设置的计时器。
      if (resetTimers.get(button) === timer) {
        resetTimers.delete(button);
      }
      button.textContent = labels.copy;
      if (status) {
        status.textContent = "";
      }
    }, 1000);
    resetTimers.set(button, timer);
  }

  function isCurrentClick(button, clickId) {
    return clickCounters.get(button) === clickId;
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".code-block .copy-button");
    if (!button) {
      return;
    }

    const wrapper = button.closest(".code-block");
    if (!wrapper) {
      return;
    }

    const labels = getCopyLabels(wrapper);
    const status = wrapper.querySelector(".code-block-status");

    const clickId = nextClickId(button);
    clearResetTimer(button);
    try {
      await navigator.clipboard.writeText(getCodeText(wrapper));
      if (!isCurrentClick(button, clickId)) {
        return; // 期间有更新的点击，放弃本次状态写入。
      }
      button.textContent = labels.copied;
      if (status) {
        status.textContent = labels.copied;
      }
      scheduleReset(button, labels, status);
    } catch (error) {
      if (!isCurrentClick(button, clickId)) {
        return; // 被更新的点击取代：本次失败不再写 UI（状态已由新点击接管）。
      }
      button.textContent = labels.failed;
      if (status) {
        status.textContent = labels.failed;
      }
      scheduleReset(button, labels, status);
      console.error(error);
    }
  });
}

function initTocSpy() {
  const contents = document.querySelector(".contents");
  if (!contents) {
    return;
  }

  // 折叠默认：移动端（<断点）折叠，桌面端由模板 open 默认展开；
  // 跨断点（旋转/分屏）恢复默认。断点同源自 SCSS --toc-side-breakpoint。
  // 无记忆（用户要求）；无 JS 时维持模板默认（全部展开）。
  function initTocCollapse() {
    const breakpointRaw = window
      .getComputedStyle(document.documentElement, null)
      .getPropertyValue("--toc-side-breakpoint")
      .trim();
    // 与 _single.scss $tocSideBreakpoint 同源；CSS 变量缺失时回退。
    const wide = window.matchMedia(`(min-width: ${breakpointRaw || "68em"})`);
    function applyDefault() {
      contents.open = wide.matches;
    }
    applyDefault();
    if (typeof wide.addEventListener === "function") {
      wide.addEventListener("change", applyDefault);
    }
  }
  initTocCollapse();

  // 以 TOC 链接反向定位 heading，保证高亮与目录严格对应。
  const links = Array.from(contents.querySelectorAll("nav a[href^='#']"));
  const linkByHeading = new Map();
  for (const link of links) {
    const heading = document.getElementById(
      link.getAttribute("href").slice(1),
    );
    if (heading) {
      linkByHeading.set(heading, link);
    }
  }
  if (linkByHeading.size === 0) {
    return;
  }
  const headings = Array.from(linkByHeading.keys());

  let activeLink = null;

  function updateActive() {
    // 判定线：--header-height（scroll-ui 维护）+ 少量余量。
    const headerHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-height",
      ),
    );
    const threshold =
      (Number.isFinite(headerHeight) ? headerHeight : 0) + 12;
    let current = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= threshold) {
        current = heading;
      } else {
        break;
      }
    }
    const link = current ? linkByHeading.get(current) : null;
    if (link === activeLink) {
      return;
    }
    if (activeLink) {
      activeLink.classList.remove("active");
      activeLink.removeAttribute("aria-current");
    }
    if (link) {
      link.classList.add("active");
      link.setAttribute("aria-current", "location");
    }
    activeLink = link;
  }

  // fixed 悬浮时：文章区底部进入视口即淡出让位（footer 区域）。
  const mainEl = document.querySelector("main.single");
  function updateTocExit() {
    if (!mainEl) {
      return;
    }
    contents.classList.toggle(
      "bottom",
      mainEl.getBoundingClientRect().bottom <= window.innerHeight,
    );
  }

  let scheduled = false;
  function updateTocUi() {
    scheduled = false;
    updateActive();
    updateTocExit();
  }
  function scheduleTocUi() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateTocUi);
    }
  }
  window.addEventListener("scroll", scheduleTocUi, { passive: true });

  updateTocUi();
}

initCopyDelegation();
initTocSpy();
