// 阅读进度条
const handleScroll = () => {
  const progressBar = document.querySelector("#progress");
  const scrollY = window.scrollY;
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;

  if (progressBar && scrollHeight > 0) {
    progressBar.style.setProperty(
      "--scroll",
      `${(scrollY / scrollHeight) * 100}%`,
    );
  }
};

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("scroll", handleScroll);
  handleScroll();
});