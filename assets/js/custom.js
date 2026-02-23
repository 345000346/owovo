// 阅读进度条
const handleScroll = () => {
  const progressBar = document.querySelector("#progress");
  const scrollY = window.scrollY;
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;

  if (progressBar && scrollHeight > 0) {
    progressBar.style.setProperty(
      "--scroll",
      `${(scrollY / scrollHeight) * 100}%`,
    );
  }
};

// 代码块折叠
const handleCodeFolding = () => {
  document.querySelectorAll(".highlight").forEach((el, index) => {
    const pre = el.querySelector("pre");
    if (pre && pre.scrollHeight > 200) {
      pre.style.maxHeight = "200px";
      const preId = `code-block-${index}`;
      pre.id = preId;

      const toggleBtn = document.createElement("div");
      toggleBtn.className = "code-toggle";
      toggleBtn.setAttribute("role", "button");
      toggleBtn.setAttribute("tabindex", "0");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.setAttribute("aria-controls", preId);
      toggleBtn.setAttribute("aria-label", "展开代码块");
      toggleBtn.innerHTML =
        '<span class="code-toggle-text">展开</span><i class="iconfont icon-arrow-down"></i>';

      const toggleExpand = () => {
        const isExpanded = pre.style.maxHeight !== "200px";
        pre.style.maxHeight = isExpanded ? "200px" : "none";
        toggleBtn.setAttribute("aria-expanded", !isExpanded);
        toggleBtn.setAttribute("aria-label", isExpanded ? "展开代码块" : "收起代码块");
        toggleBtn.querySelector(".code-toggle-text").textContent = isExpanded
          ? "展开"
          : "收起";
      };

      toggleBtn.onclick = toggleExpand;
      toggleBtn.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleExpand();
        }
      };
      el.insertBefore(toggleBtn, pre);
    }
  });
};

// 今日诗词懒加载
const renderPoemFallback = (card) => {
  const sentence = card.querySelector(".poem-sentence");
  const info = card.querySelector(".poem-info");
  if (!sentence || !info) {
    return;
  }
  sentence.textContent = "今日诗词加载失败";
  info.textContent = "";
};

const renderPoem = (card, result) => {
  const sentence = card.querySelector(".poem-sentence");
  const info = card.querySelector(".poem-info");
  if (!sentence || !info) {
    return;
  }

  if (!result || !result.data || !result.data.origin) {
    renderPoemFallback(card);
    return;
  }

  sentence.textContent = result.data.content;
  info.textContent =
    "【" +
    result.data.origin.dynasty +
    "】" +
    result.data.origin.author +
    "《" +
    result.data.origin.title +
    "》";
};

const loadPoemForCard = (card) => {
  if (!window.jinrishici || !window.jinrishici.load) {
    return;
  }

  window.jinrishici.load((result) => {
    try {
      renderPoem(card, result);
    } catch (_error) {
      renderPoemFallback(card);
    }
  });
};

const loadPoemSdkOnce = () => {
  if (window.jinrishici?.load) {
    document.dispatchEvent(new Event("jinrishici:ready"));
    return;
  }

  if (window.__jinrishici_script_loading) {
    return;
  }

  window.__jinrishici_script_loading = true;
  const sdk = document.createElement("script");
  sdk.src = "https://sdk.jinrishici.com/v2/browser/jinrishici.js";
  sdk.charset = "utf-8";
  sdk.defer = true;
  sdk.onload = () => {
    document.dispatchEvent(new Event("jinrishici:ready"));
  };
  sdk.onerror = () => {
    document.dispatchEvent(new Event("jinrishici:error"));
  };
  document.head.appendChild(sdk);
};

const initPoemCards = () => {
  const cards = document.querySelectorAll(".poem-card");
  if (!cards.length) {
    return;
  }

  const pendingCards = [];
  cards.forEach((card) => {
    if (card.dataset.jinrishiciInit === "1") {
      return;
    }
    card.dataset.jinrishiciInit = "1";
    pendingCards.push(card);
  });

  if (!pendingCards.length) {
    return;
  }

  const onReady = () => {
    pendingCards.forEach((card) => {
      loadPoemForCard(card);
    });
  };

  const onError = () => {
    pendingCards.forEach((card) => {
      renderPoemFallback(card);
    });
  };

  document.addEventListener("jinrishici:ready", onReady, { once: true });
  document.addEventListener("jinrishici:error", onError, { once: true });
  loadPoemSdkOnce();
};

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("scroll", handleScroll);
  handleCodeFolding();
  initPoemCards();
  handleScroll();
});
