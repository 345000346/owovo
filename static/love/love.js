// 时间格式化工具函数
function formatTimeDiff(timeDiff) {
  return {
    day: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
    hour: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minute: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
    second: Math.floor((timeDiff % (1000 * 60)) / 1000)
  };
}

// 启动并持续更新爱情计时器
function startTimer() {
  updateTimer(); // 立即更新一次
  setInterval(updateTimer, 1000); // 然后每秒更新
}

// 更新计时器显示的内容
function updateTimer() {
  const now = new Date();
  const startDate = new Date('2021/8/13');
  const timeDiff = now - startDate;
  const timeUnits = formatTimeDiff(timeDiff);
  
  document.getElementById('loveTimer').innerHTML = 
    `${timeUnits.day} 天 ${timeUnits.hour} 小时 ${timeUnits.minute} 分钟 ${timeUnits.second} 秒`;
}

// 背景爱心粒子效果系统
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.initCanvasStyle();
    this.init();
  }

  // 初始化Canvas样式
  initCanvasStyle() {
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = window.innerWidth >= 768 ? '5' : '-1';
    this.canvas.style.pointerEvents = 'none';
  }

  // 初始化系统，设置监听器并启动动画
  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  // 响应窗口大小变化，调整Canvas尺寸
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // 创建单个爱心粒子
  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      size: Math.random() * 10 + 5,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      color: `rgba(231, 76, 60, ${Math.random() * 0.5 + 0.2})`
    };
  }

  // 动画循环
  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 根据屏幕宽度调整粒子数量
    const maxParticles = window.innerWidth < 768 ? 50 : 80;
    if (this.particles.length < maxParticles) {
      this.particles.push(this.createParticle());
    }

    this.particles.forEach((particle, index) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      // 如果粒子移出画布，则移除
      if (particle.x < 0 || particle.x > this.canvas.width ||
          particle.y < 0 || particle.y > this.canvas.height) {
        this.particles.splice(index, 1);
        return;
      }

      this.drawHeart(particle);
    });

    requestAnimationFrame(() => this.animate());
  }

  // 绘制单个爱心
  drawHeart(particle) {
    this.ctx.beginPath();
    for (let i = 0; i < 100; i++) {
      const step = (i / 100 - 0.5) * (Math.PI * 2);
      const x = 15 * Math.pow(Math.sin(step), 3);
      const y = -(13 * Math.cos(step) - 5 * Math.cos(2 * step) - 2 * Math.cos(3 * step) - Math.cos(4 * step));
      this.ctx.lineTo(particle.x + x * particle.size / 15, particle.y + y * particle.size / 15);
    }
    this.ctx.fillStyle = particle.color;
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = particle.color;
    this.ctx.fill();
  }
}

// 更新页面页脚的日期时间和版权信息
function updateDateTime() {
  const now = new Date();
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  document.getElementById('currentDateTime').textContent = now.toLocaleString('zh-CN', options);
  document.querySelector('.copyright').innerHTML = `Copyright © ${now.getFullYear()} | Design by PGQ`;
}

// 初始化页面所有功能
function initPage() {
  startTimer();
  
  const canvas = document.createElement('canvas');
  canvas.classList.add('particles');
  document.body.appendChild(canvas);
  new ParticleSystem(canvas);
  
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

// 页面加载完成后执行初始化
window.addEventListener('load', initPage);