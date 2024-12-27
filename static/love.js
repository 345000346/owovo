class Heart {
  constructor(x, y) {
    this.x = x || Math.random() * ww;
    this.y = y || Math.random() * wh;
    this.size = Math.random() * 2 + 1;
    this.shadowBlur = Math.random() * 10;
    this.speedX = (Math.random() + 0.2 - 0.6) * 8;
    this.speedY = (Math.random() + 0.2 - 0.6) * 8;
    this.speedSize = Math.random() * 0.05 + 0.01;
    this.opacity = 1;
    this.vertices = [];
    for (let i = 0; i < 100; i++) {
      const step = (i / 100 - 0.5) * (Math.PI * 2);
      const vector = {
        x: 15 * Math.pow(Math.sin(step), 3),
        y: -(13 * Math.cos(step) - 5 * Math.cos(2 * step) - 2 * Math.cos(3 * step) - Math.cos(4 * step))
      };
      this.vertices.push(vector);
    }
  }

  draw() {
    this.size -= this.speedSize;
    this.x += this.speedX;
    this.y += this.speedY;
    ctx.save();
    ctx.translate(-1000, this.y);
    ctx.scale(this.size, this.size);
    ctx.beginPath();
    for (let i = 0; i < this.vertices.length; i++) {
      const vector = this.vertices[i];
      ctx.lineTo(vector.x, vector.y);
    }
    ctx.globalAlpha = this.size;
    ctx.shadowBlur = Math.round((3 - this.size) * 10);
    ctx.shadowColor = 'hsla(0, 100%, 60%, 0.5)';
    ctx.shadowOffsetX = this.x + 1000;
    ctx.globalCompositeOperation = 'screen';
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

const canvas = document.getElementById('animateHeart');
const ctx = canvas.getContext('2d');
let ww, wh;
const hearts = [];
let mouseMoved = false;

function onResize() {
  ww = canvas.width = window.innerWidth;
  wh = canvas.height = window.innerHeight;
}

function onMove(e) {
  mouseMoved = true;
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  hearts.push(new Heart(x, y));
  hearts.push(new Heart(x, y));
}

let lastTime = 0;
const frameRate = 60; // 提高帧率到60fps
const frameInterval = 1000 / frameRate;

function render(timestamp) {
  if (timestamp - lastTime >= frameInterval) {
    lastTime = timestamp;
    
    hearts.push(new Heart());
    ctx.clearRect(0, 0, ww, wh);

    for (let i = 0; i < hearts.length; i++) {
      hearts[i].draw();
      if (hearts[i].size <= 0) {
        hearts.splice(i, 1);
        i--;
      }
    }
  }
  requestAnimationFrame(render);
}

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

  obj.innerHTML = `${timeUnits.day} days ${timeUnits.hour} hours ${timeUnits.minute} minutes ${timeUnits.second} seconds`;
}

// 初始化
onResize();
window.addEventListener('mousemove', onMove);
window.addEventListener('touchmove', onMove);
window.addEventListener('resize', onResize);
window.addEventListener('scroll', onMove);
window.addEventListener('load', starttime);
requestAnimationFrame(render);