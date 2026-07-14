"use strict";

// Header height CSS var, reading progress, back-to-top visibility.

{
  const headerEl = document.querySelector(".header");
  if (headerEl) {
    const headerHeight = window
      .getComputedStyle(headerEl, null)
      .getPropertyValue("height");
    document.documentElement.style.setProperty("--header-height", headerHeight);
  }

  const progressBar = document.querySelector("#reading-progress");
  const backToTop = document.getElementById("back-to-top");

  if (progressBar || backToTop) {
    let scheduled = false;

    const updateScrollUI = () => {
      scheduled = false;
      const scrollY = window.scrollY;

      if (progressBar) {
        const scrollHeight =
          document.documentElement.scrollHeight -
          document.documentElement.clientHeight;
        const progress = scrollHeight <= 0 ? 0 : scrollY / scrollHeight;
        progressBar.style.setProperty("--progress", String(progress));
        progressBar.setAttribute(
          "aria-valuenow",
          String(Math.round(progress * 100)),
        );
      }

      if (backToTop) {
        backToTop.classList.toggle("show", scrollY > 100);
      }
    };

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
}
