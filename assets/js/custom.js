// 说明：custom.js 会被 Hugo 作为模板执行（可读取 .Site.Params / i18n）

const getResolvedTheme = () => {
  const theme = document.documentElement.getAttribute("data-theme")
  if (theme === "light" || theme === "dark") {
    return theme
  }

  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark"
  }

  return "light"
}

const syncThemedBadges = () => {
  const theme = getResolvedTheme()

  document.querySelectorAll("img.themed-badge").forEach((badge) => {
    const nextSrc = theme === "dark" ? badge.dataset.darkSrc : badge.dataset.lightSrc
    if (nextSrc && badge.getAttribute("src") !== nextSrc) {
      badge.setAttribute("src", nextSrc)
    }
  })
}

const initThemedBadges = () => {
  const badges = document.querySelectorAll("img.themed-badge")
  if (badges.length === 0) {
    return
  }

  syncThemedBadges()

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.attributeName === "data-theme")) {
      syncThemedBadges()
    }
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  })
}

window.addEventListener(
  "DOMContentLoaded",
  async () => {
    initThemedBadges()

    // =========================================================
    // Pagefind 搜索初始化
    // =========================================================
    const pagefindEnabled = {{ .Site.Params.enablePagefindSearch | default false }}
    if (pagefindEnabled) {
      const searchPath = "{{ .Site.Params.pagefindSearchPath | default "/search/" }}"
      const normalizedPath = `${window.location.pathname.replace(/\/+$/, "")}/`
      const normalizedSearchPath = `${searchPath.replace(/\/+$/, "")}/`

      // 兼容 GitHub Pages 项目站点这类带前缀的路径，例如 /owovo/search/。
      if (normalizedPath.endsWith(normalizedSearchPath)) {
        const searchContainer = document.getElementById("search")
        const statusNode = document.getElementById("search-status")

        if (searchContainer) {
          const waitForPagefindUI = async () => {
            const timeoutMs = 2000
            const intervalMs = 50
            const maxTries = Math.ceil(timeoutMs / intervalMs)

            for (let i = 0; i < maxTries; i++) {
              if (typeof window.PagefindUI === "function") {
                return true
              }
              await new Promise((resolve) => setTimeout(resolve, intervalMs))
            }

            return false
          }

          const pagefindReady = await waitForPagefindUI()
          if (!pagefindReady) {
            if (statusNode) {
              statusNode.textContent = "{{ i18n "pagefindSearchUnavailable" }}"
            }
          } else {
            try {
              new window.PagefindUI({
                element: "#search"
              })

              const input = searchContainer.querySelector('input[type="search"], input[type="text"]')
              if (input) {
                if (!input.id) {
                  input.id = "search-input"
                }
                if (!input.getAttribute("aria-label")) {
                  input.setAttribute("aria-label", "{{ i18n "pagefindSearchInputLabel" }}")
                }
              }

              if (statusNode) {
                statusNode.textContent = ""
              }
            } catch (error) {
              if (statusNode) {
                statusNode.textContent = "{{ i18n "pagefindSearchUnavailable" }}"
              }
              console.error("[search] Pagefind initialization failed", error)
            }
          }
        }
      }
    }

  },
  { once: true }
)
