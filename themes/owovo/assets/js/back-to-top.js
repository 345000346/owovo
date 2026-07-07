window.addEventListener("DOMContentLoaded", event => {
    const backToTop = document.getElementById('back-to-top');

    if (backToTop !== null) {
        onScroll((scrollY) => {
            backToTop.classList.toggle('show', scrollY > 100);
        });
    }
}, {once: true});
