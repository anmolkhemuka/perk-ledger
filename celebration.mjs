// Decide from record transitions, never from a displayed total or a backup import.
export function celebrationFor(previous, next) {
  if (!next) return null;
  if (next.status === 'gifted to family' && previous?.status !== 'gifted to family') return 'Shared with family';
  if (next.status === 'used personally' && previous?.status !== 'used personally') return 'Benefit enjoyed';
  if (next.status === 'sold' && next.sale > 0 && next.received === next.sale) {
    if (!previous || previous.status !== 'sold' ||
        (previous.received < previous.sale && next.received > previous.received)) return 'Payment fully received';
  }
  return null;
}
let cleanupTimer;
export function celebrate(message) {
  if (!message || document.documentElement.dataset.theme !== 'festive') return;
  const slot = document.querySelector('#celebration');
  clearTimeout(cleanupTimer);
  slot.replaceChildren();
  const label = document.createElement('span');
  label.textContent = message;
  slot.append(label);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const sparks = document.createElement('span');
    sparks.className = 'celebration-sparks';
    sparks.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i++) {
      const spark = document.createElement('i');
      spark.textContent = '✦';
      spark.style.setProperty('--spark-index', i);
      sparks.append(spark);
    }
    slot.append(sparks);
  }
  cleanupTimer = setTimeout(() => slot.replaceChildren(), 1800);
}
