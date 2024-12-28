// 计时器功能
function starttime() {
  time(document.getElementById('loveTimer'), '2021/8/13');
  setTimeout(starttime, 1000);
}

function time(obj, futimg) {
  const nowtime = new Date();
  const futruetime = new Date(futimg);
  const timeDiff = nowtime - futruetime;
  const timeUnits = {
    day: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
    hour: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minute: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
    second: Math.floor((timeDiff % (1000 * 60)) / 1000)
  };

  obj.innerHTML = `${timeUnits.day} 天 ${timeUnits.hour} 小时 ${timeUnits.minute} 分钟 ${timeUnits.second} 秒`;
}

// 背景粒子效果
class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.init();
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = window.innerWidth >= 768 ? '5' : '-1';
    this.canvas.style.pointerEvents = 'none';
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticle() {
    const x = Math.random() * this.canvas.width;
    const y = Math.random() * this.canvas.height;
    const size = Math.random() * 10 + 5;
    const speedX = (Math.random() - 0.5) * 0.5;
    const speedY = (Math.random() - 0.5) * 0.5;
    const color = `rgba(231, 76, 60, ${Math.random() * 0.5 + 0.2})`;

    this.particles.push({ x, y, size, speedX, speedY, color });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const maxParticles = window.innerWidth < 768 ? 50 : 80;
    if (this.particles.length < maxParticles) {
      this.createParticle();
    }

    this.particles.forEach((particle, index) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < 0 || particle.x > this.canvas.width ||
          particle.y < 0 || particle.y > this.canvas.height) {
        this.particles.splice(index, 1);
      }

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
    });

    requestAnimationFrame(() => this.animate());
  }
}

// 更新当前日期和时间
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

// 初始化
window.addEventListener('load', () => {
  starttime();
  const canvas = document.createElement('canvas');
  canvas.classList.add('particles');
  document.body.appendChild(canvas);
  new Particle(canvas);
  updateDateTime();
  setInterval(updateDateTime, 1000);
});