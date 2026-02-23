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

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("scroll", handleScroll);
  handleCodeFolding();
  handleScroll();
});
