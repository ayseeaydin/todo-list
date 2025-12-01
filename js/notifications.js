/**
 * notifications.js
 * Single responsibility: notification helpers (browser notification & confetti).
 * - This module exposes requestPermission, notifySoonDue, and confettiEffect.
 * - Confetti is intentionally lightweight and self-contained.
 */

/* Request / handle Notification permission */
export const Notifier = {
  requestPermission() {
    if (!('Notification' in window)) return Promise.resolve(false);
    if (Notification.permission === 'granted') return Promise.resolve(true);
    if (Notification.permission === 'denied') return Promise.resolve(false);
    return Notification.requestPermission().then(p => p === 'granted');
  },

  notify(title, options = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  },

  /* A helper that checks soon-due tasks and notifies once when called */
  notifySoonDue(task) {
    if (!task) return;
    this.notify('TaskFlow Reminder', {
      body: `Task "${task.text}" is due soon (${task.dueDate})`,
      icon: 'https://cdn-icons-png.flaticon.com/512/1950/1950715.png'
    });
  },

  /* Lightweight confetti effect using canvas (no external libs).
     It runs only for a short burst and then stops to conserve CPU. */
  confettiEffect(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#ffafcc', '#ffc8dd', '#cdb4db', '#a2d2ff', '#bde0fe'];
    const particles = Array.from({length: 40}).map(() => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 80,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2
    }));

    let raf;
    function frame() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += 0.05;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
        if (p.y > canvas.height + 50) particles.splice(i,1);
      });
      if (particles.length > 0) raf = requestAnimationFrame(frame);
      else cancelAnimationFrame(raf);
    }
    frame();
    // clear canvas after short delay to avoid persistent draw
    setTimeout(()=> ctx.clearRect(0,0,canvas.width,canvas.height), 3500);
  }
};
