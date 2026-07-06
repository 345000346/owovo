window.addEventListener(
    "DOMContentLoaded",
    () => {
        const navToggle = document.querySelector(".nav-toggle");
        const header = document.querySelector(".header");
        const navCurtain = document.querySelector(".nav-curtain");

        if (!navToggle || !header || !navCurtain) {
            return;
        }

        // 创建导航按钮的三条横线，保持与主题默认视觉一致。
        const navToggleLabelInner = document.createElement("div");
        navToggleLabelInner.className = "nav-toggle-inner";
        navToggle.appendChild(navToggleLabelInner);

        for (let i = 0; i < 3; i++) {
            const span = document.createElement("span");
            navToggleLabelInner.appendChild(span);
        }

        navToggle.addEventListener("click", () => {
            if (isOpen()) {
                closeNav();
            } else {
                openNav();
            }
        });

        navCurtain.addEventListener("animationend", (event) => {
            if (!isOpen()) {
                event.target.hidden = true;
            }
        });

        navCurtain.addEventListener("click", () => {
            closeNav();
        });

        window.addEventListener(
            "scroll",
            throttle(() => {
                closeNav();
            }, delayTime),
        );

        const maxWidth = window
            .getComputedStyle(document.documentElement, null)
            .getPropertyValue("--max-width");
        const mediaQuery = window.matchMedia(`(max-width: ${maxWidth})`);
        const handleWidthChange = (event) => {
            if (!event.matches) {
                closeNav(true);
            }
        };

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener("change", handleWidthChange);
        } else if (typeof mediaQuery.addListener === "function") {
            mediaQuery.addListener(handleWidthChange);
        }

        function isOpen() {
            return navToggle.getAttribute("aria-expanded") === "true";
        }

        function openNav() {
            header.classList.add("open");
            navToggle.classList.add("open");
            navToggle.setAttribute("aria-expanded", "true");
            navToggle.setAttribute("aria-label", "关闭菜单");

            header.classList.remove("fade");
            navCurtain.hidden = false;
        }

        function closeNav(noFade) {
            if (!isOpen()) {
                return;
            }

            header.classList.remove("open");
            navToggle.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
            navToggle.setAttribute("aria-label", "打开菜单");

            if (noFade) {
                navCurtain.hidden = true;
            } else {
                header.classList.add("fade");
            }
        }
    },
    { once: true },
);
