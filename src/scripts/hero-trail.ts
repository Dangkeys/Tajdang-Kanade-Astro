type Spark = {
  x: number;
  y: number;
  born: number;
  lifetime: number;
  radius: number;
  drift: number;
  rotation: number;
  color: string;
  star: boolean;
};

export function attachHeroTrail(hero: HTMLElement): () => void {
  const target = hero.querySelector<HTMLCanvasElement>(".hero-cursor-trail");
  const brush = target?.getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  if (!target || !brush || !finePointer.matches) return () => {};
  const canvas = target;
  const context = brush;

  let sparks: Spark[] = [];
  let frame: number | undefined;
  let width = 0;
  let height = 0;
  let previous: { x: number; y: number } | undefined;
  const colors = ["#efdbad", "#f8e9c9", "#e78e7e"];

  function resize() {
    const bounds = hero.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(now: number) {
    frame = undefined;
    context.clearRect(0, 0, width, height);
    if (reducedMotion.matches || hero.hasAttribute("data-effects-paused")) {
      sparks = [];
      return;
    }
    sparks = sparks.filter((spark) => now - spark.born < spark.lifetime);
    for (const spark of sparks) {
      const progress = (now - spark.born) / spark.lifetime;
      const size = spark.radius * (1 - progress * 0.5);
      context.save();
      context.translate(
        spark.x + spark.drift * progress,
        spark.y - 18 * progress,
      );
      context.rotate(spark.rotation + progress * 0.5);
      context.globalAlpha = Math.pow(1 - progress, 1.5) * 0.85;
      context.fillStyle = spark.color;
      context.beginPath();
      if (spark.star) {
        for (let point = 0; point < 8; point++) {
          const angle = (point * Math.PI) / 4;
          const radius = point % 2 === 0 ? size : size * 0.25;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          if (point === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
      } else context.arc(0, 0, size * 0.35, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    if (sparks.length) frame = requestAnimationFrame(draw);
  }

  function move(event: PointerEvent) {
    if (
      event.pointerType !== "mouse" ||
      reducedMotion.matches ||
      !finePointer.matches ||
      hero.hasAttribute("data-effects-paused")
    )
      return;
    const bounds = hero.getBoundingClientRect();
    const point = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const start = previous ?? point;
    const distance = Math.hypot(point.x - start.x, point.y - start.y);
    if (previous && distance < 7) return;
    const count = Math.min(3, Math.max(1, Math.ceil(distance / 14)));
    const now = performance.now();
    for (let i = 1; i <= count; i++) {
      const fraction = i / count;
      sparks.push({
        x: start.x + (point.x - start.x) * fraction,
        y: start.y + (point.y - start.y) * fraction,
        born: now,
        lifetime: 400 + Math.random() * 250,
        radius: 2 + Math.random() * 4,
        drift: (Math.random() - 0.5) * 16,
        rotation: Math.random() * Math.PI,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#efdbad",
        star: Math.random() > 0.4,
      });
    }
    previous = point;
    if (sparks.length > 70) sparks = sparks.slice(-70);
    if (frame === undefined) frame = requestAnimationFrame(draw);
  }
  function leave() {
    previous = undefined;
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(hero);
  hero.addEventListener("pointermove", move, { passive: true });
  hero.addEventListener("pointerleave", leave);
  return () => {
    observer.disconnect();
    hero.removeEventListener("pointermove", move);
    hero.removeEventListener("pointerleave", leave);
    if (frame !== undefined) cancelAnimationFrame(frame);
    context.clearRect(0, 0, width, height);
    sparks = [];
  };
}
