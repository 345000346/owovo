window.addEventListener("DOMContentLoaded", event => {
    const backToTop = document.getElementById('back-to-top');

    if (backToTop !== null) {
        window.addEventListener(
            'scroll',
            throttle(function() {
                backToTop.classList.toggle('show', window.scrollY > 100);
            }, delayTime)
        );
    }
}, {once: true});
