// 时间格式化工具函数
(() => {
  const MOBILE_BREAKPOINT = 768;
  const LOVE_START_DATE = new Date(2021, 7, 13, 0, 0, 0);

  const pageState = {
    initialized: false,
    teardownDone: false,
    timerIntervalId: null,
    dateTimeIntervalId: null,
    canvas: null,
    particleSystem: null,
  };

  // 安全获取 DOM 元素
  function safeGetElement(id, selector) {
    if (id) {
      const element = document.getElementById(id);
      if (element) return element;
    }
    if (selector) {
      return document.querySelector(selector);
    }
    return null;
  }

  function formatTimeDiff(timeDiff) {
    return {
      day: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
      hour: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minute: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
      second: Math.floor((timeDiff % (1000 * 60)) / 1000),
    };
  }

  // 更新计时器显示的内容
  function updateTimer() {
    const timerElement = safeGetElement("loveTimer", null);
    if (!timerElement) return;

    const now = new Date();
    const timeDiff = now - LOVE_START_DATE;
    const timeUnits = formatTimeDiff(timeDiff);

    timerElement.textContent = `${timeUnits.day} 天 ${timeUnits.hour} 小时 ${timeUnits.minute} 分钟 ${timeUnits.second} 秒`;
  }

  // 启动并持续更新爱情计时器
  function startTimer() {
    updateTimer();
    if (pageState.timerIntervalId) {
      clearInterval(pageState.timerIntervalId);
    }
    pageState.timerIntervalId = setInterval(updateTimer, 1000);
  }

  // 背景爱心粒子效果系统
  class ParticleSystem {
    constructor(canvas) {
      if (!canvas) return;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      if (!this.ctx) return;

      this.particles = [];
      this.animationId = null;
      this.running = false;
      this.motionState = "normal";

      this.boundResize = this.resize.bind(this);
      this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
      this.boundMotionChange = this.handleMotionPreferenceChange.bind(this);

      this.motionMedia =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(prefers-reduced-motion: reduce)")
          : null;

      this.initCanvasStyle();
      this.init();
    }

    initCanvasStyle() {
      this.canvas.style.position = "fixed";
      this.canvas.style.top = "0";
      this.canvas.style.left = "0";
      this.canvas.style.zIndex =
        window.innerWidth >= MOBILE_BREAKPOINT ? "5" : "-1";
      this.canvas.style.pointerEvents = "none";
    }

    init() {
      this.resize();
      window.addEventListener("resize", this.boundResize);
      document.addEventListener("visibilitychange", this.boundVisibilityChange);

      if (this.motionMedia) {
        if (typeof this.motionMedia.addEventListener === "function") {
          this.motionMedia.addEventListener("change", this.boundMotionChange);
        } else if (typeof this.motionMedia.addListener === "function") {
          this.motionMedia.addListener(this.boundMotionChange);
        }
      }

      this.updateMotionState();
      this.applyMotionState();
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.canvas.style.zIndex =
        window.innerWidth >= MOBILE_BREAKPOINT ? "5" : "-1";
    }

    createParticle() {
      return {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 10 + 5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: `rgba(231, 76, 60, ${Math.random() * 0.5 + 0.2})`,
      };
    }

    updateMotionState() {
      if (document.hidden) {
        this.motionState = "hidden";
        return;
      }

      if (this.motionMedia && this.motionMedia.matches) {
        this.motionState = "reduced-motion";
        return;
      }

      this.motionState = "normal";
    }

    applyMotionState() {
      if (this.motionState === "normal") {
        this.start();
      } else {
        this.stop();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    handleVisibilityChange() {
      this.updateMotionState();
      this.applyMotionState();
    }

    handleMotionPreferenceChange() {
      this.updateMotionState();
      this.applyMotionState();
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.animate();
    }

    stop() {
      this.running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    animate() {
      if (!this.running || this.motionState !== "normal") {
        return;
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const maxParticles =
        window.innerWidth < MOBILE_BREAKPOINT ? 50 : 80;
      if (this.particles.length < maxParticles) {
        this.particles.push(this.createParticle());
      }

      this.particles = this.particles.filter((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (
          particle.x < 0 ||
          particle.x > this.canvas.width ||
          particle.y < 0 ||
          particle.y > this.canvas.height
        ) {
          return false;
        }

        this.drawHeart(particle);
        return true;
      });

      this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawHeart(particle) {
      this.ctx.beginPath();
      for (let i = 0; i < 100; i++) {
        const step = (i / 100 - 0.5) * (Math.PI * 2);
        const x = 15 * Math.pow(Math.sin(step), 3);
        const y = -(
          13 * Math.cos(step) -
          5 * Math.cos(2 * step) -
          2 * Math.cos(3 * step) -
          Math.cos(4 * step)
        );
        this.ctx.lineTo(
          particle.x + (x * particle.size) / 15,
          particle.y + (y * particle.size) / 15,
        );
      }
      this.ctx.fillStyle = particle.color;
      this.ctx.shadowBlur = 5;
      this.ctx.shadowColor = particle.color;
      this.ctx.fill();
    }

    destroy() {
      this.stop();
      window.removeEventListener("resize", this.boundResize);
      document.removeEventListener(
        "visibilitychange",
        this.boundVisibilityChange,
      );

      if (this.motionMedia) {
        if (typeof this.motionMedia.removeEventListener === "function") {
          this.motionMedia.removeEventListener("change", this.boundMotionChange);
        } else if (typeof this.motionMedia.removeListener === "function") {
          this.motionMedia.removeListener(this.boundMotionChange);
        }
      }

      this.particles = [];
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // 更新页面页脚的日期时间和版权信息
  function updateDateTime() {
    const dateTimeElement = safeGetElement("currentDateTime", null);
    const copyrightElement = safeGetElement(null, ".copyright");

    const now = new Date();
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };

    if (dateTimeElement) {
      dateTimeElement.textContent = now.toLocaleString("zh-CN", options);
    }

    if (copyrightElement) {
      copyrightElement.textContent = `Copyright © ${now.getFullYear()} | Design by PGQ`;
    }
  }

  function startDateTimeUpdater() {
    updateDateTime();
    if (pageState.dateTimeIntervalId) {
      clearInterval(pageState.dateTimeIntervalId);
    }
    pageState.dateTimeIntervalId = setInterval(updateDateTime, 1000);
  }

  function teardownPage() {
    if (pageState.teardownDone) return;

    pageState.teardownDone = true;

    if (pageState.timerIntervalId) {
      clearInterval(pageState.timerIntervalId);
      pageState.timerIntervalId = null;
    }

    if (pageState.dateTimeIntervalId) {
      clearInterval(pageState.dateTimeIntervalId);
      pageState.dateTimeIntervalId = null;
    }

    if (pageState.particleSystem) {
      pageState.particleSystem.destroy();
      pageState.particleSystem = null;
    }

    if (pageState.canvas && pageState.canvas.parentNode) {
      pageState.canvas.parentNode.removeChild(pageState.canvas);
    }

    pageState.canvas = null;
    pageState.initialized = false;
  }

  // 初始化页面所有功能
  function initPage() {
    if (pageState.initialized) return;

    pageState.initialized = true;
    pageState.teardownDone = false;

    startTimer();

    const canvas = document.createElement("canvas");
    canvas.classList.add("particles");
    document.body.appendChild(canvas);
    pageState.canvas = canvas;
    pageState.particleSystem = new ParticleSystem(canvas);

    startDateTimeUpdater();
  }

  // 页面加载完成后执行初始化
  window.addEventListener("load", initPage);
  window.addEventListener("pagehide", teardownPage);
  window.addEventListener("beforeunload", teardownPage);
})();
