const scrollTasks = [];
let scrollScheduled = false;

const onScroll = (task) => {
    if (typeof task === 'function') {
        scrollTasks.push(task);
    }
};

const scheduleScrollTasks = window.requestAnimationFrame || ((callback) => setTimeout(callback, 16));

const runScrollTasks = () => {
    scrollScheduled = false;
    scrollTasks.forEach((task) => {
        try {
            task(window.scrollY);
        } catch (error) {
            console.error(error);
        }
    });
};

window.addEventListener('scroll', () => {
    if (!scrollScheduled) {
        scrollScheduled = true;
        scheduleScrollTasks(runScrollTasks);
    }
}, { passive: true });
