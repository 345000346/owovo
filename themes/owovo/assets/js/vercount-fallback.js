// Vercount 访问统计的超时回退
//
// Vercount（www.vercount.one）为第三方运行时统计，脚本加载失败或接口不可用时，
// 页面上的 PV/UV 占位会长期留空，出现「访问 」「访客 」后面无数字的尴尬空白。
// 此处在脚本预留的填充窗口结束后检测，未填充则统一降级为“统计暂不可用”，
// 避免留白并给屏幕阅读器一个明确提示。

const VERCOUNT_FALLBACK_TIMEOUT_MS = {{ .Site.Params.vercountFallbackTimeout | default 6000 }};

window.addEventListener("DOMContentLoaded", () => {
    const valueIds = [
        "vercount_value_site_pv",
        "vercount_value_site_uv",
        "vercount_value_page_pv",
    ];

    const targets = valueIds
        .map((id) => document.getElementById(id))
        .filter(Boolean);

    if (targets.length === 0) {
        return;
    }

    const hasValue = (el) => (el.textContent || "").trim().length > 0;

    // 若 Vercount 已在超时窗口内填充，则无需干预。
    setTimeout(() => {
        targets.forEach((valueEl) => {
            if (hasValue(valueEl)) {
                return;
            }

            const container = valueEl.closest(
                "#vercount_container_site_pv, #vercount_container_site_uv, #vercount_container_page_pv"
            );

            if (!container) {
                valueEl.textContent = "—";
                return;
            }

            // 隐藏原有文案（如「访问」「阅读」），整体替换为不可用提示。
            container.dataset.vercountStatus = "unavailable";
            container.textContent = "{{ i18n "statsUnavailable" | default "统计暂不可用" }}";
            container.classList.add("vercount-unavailable");
        });
    }, VERCOUNT_FALLBACK_TIMEOUT_MS);
}, { once: true });
