// Event-delegated copy for server-rendered .code-block wrappers
// (layouts/_default/_markup/render-codeblock.html).

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
  // Chroma lineNos: two <pre>s (gutter + source) — take the last.
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
  if (
    !navigator.clipboard ||
    typeof navigator.clipboard.writeText !== "function"
  ) {
    return;
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

    try {
      await navigator.clipboard.writeText(getCodeText(wrapper));
      button.textContent = labels.copied;
      if (status) {
        status.textContent = labels.copied;
      }
      setTimeout(() => {
        button.textContent = labels.copy;
        if (status) {
          status.textContent = "";
        }
      }, 1000);
    } catch (error) {
      button.textContent = labels.failed;
      if (status) {
        status.textContent = labels.failed;
      }
      console.error(error);
    }
  });
}

initCopyDelegation();
