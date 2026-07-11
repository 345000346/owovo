// Vercount 访问统计的超时回退
const VERCOUNT_FALLBACK_TIMEOUT_MS = 6000;

const valueIds = [
  "vercount_value_site_pv",
  "vercount_value_site_uv",
  "vercount_value_page_pv",
];

const targets = valueIds
  .map((id) => document.getElementById(id))
  .filter(Boolean);

if (targets.length > 0) {
  const hasValue = (el) => (el.textContent || "").trim().length > 0;
  const fallbackText =
    document.documentElement.dataset.statsUnavailable || "统计暂不可用";

  setTimeout(() => {
    targets.forEach((valueEl) => {
      if (hasValue(valueEl)) {
        return;
      }

      const container = valueEl.closest(
        "#vercount_container_site_pv, #vercount_container_site_uv, #vercount_container_page_pv",
      );

      if (!container) {
        valueEl.textContent = "—";
        return;
      }

      container.dataset.vercountStatus = "unavailable";
      container.textContent = fallbackText;
      container.classList.add("vercount-unavailable");
    });
  }, VERCOUNT_FALLBACK_TIMEOUT_MS);
}
