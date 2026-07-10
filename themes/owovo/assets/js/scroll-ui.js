'use strict';

window.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    if (header) {
        const headerHeight = window
            .getComputedStyle(header, null)
            .getPropertyValue('height');
        document.documentElement.style.setProperty('--header-height', headerHeight);
    }

    const progressBar = document.querySelector('#reading-progress');
    const updateReadingProgress = () => {
        if (!progressBar) {
            return;
        }
        const scrollHeight =
            document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (scrollHeight <= 0) {
            progressBar.style.width = '0%';
            return;
        }
        const scrollPercent = (window.scrollY / scrollHeight) * 100;
        progressBar.style.width = `${scrollPercent}%`;
    };
    onScroll(updateReadingProgress);
    updateReadingProgress();

    const backToTop = document.getElementById('back-to-top');
    if (backToTop !== null) {
        onScroll((scrollY) => {
            backToTop.classList.toggle('show', scrollY > 100);
        });
    }
}, { once: true });
