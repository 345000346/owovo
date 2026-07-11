'use strict';

// Header height is one-shot init; keep it out of scroll closures.
{
    const header = document.querySelector('.header');
    if (header) {
        const headerHeight = window
            .getComputedStyle(header, null)
            .getPropertyValue('height');
        document.documentElement.style.setProperty('--header-height', headerHeight);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const progressBar = document.querySelector('#reading-progress');
    const backToTop = document.getElementById('back-to-top');

    if (!progressBar && !backToTop) {
        return;
    }

    const updateScrollUI = (scrollY) => {
        if (progressBar) {
            const scrollHeight =
                document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (scrollHeight <= 0) {
                progressBar.style.width = '0%';
            } else {
                progressBar.style.width = `${(scrollY / scrollHeight) * 100}%`;
            }
        }
        if (backToTop) {
            backToTop.classList.toggle('show', scrollY > 100);
        }
    };

    onScroll(updateScrollUI);
    updateScrollUI(window.scrollY);
}, { once: true });
