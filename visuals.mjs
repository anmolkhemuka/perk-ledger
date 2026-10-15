// Presentation only: categories are inferred from names, never added to stored data.
const paths = {
  sparkle: '<path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/><path d="m20 2 .7 1.3L22 4l-1.3.7L20 6l-.7-1.3L18 4l1.3-.7Z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8H8a3 3 0 1 1 3-3Zm0 0h4a3 3 0 1 0-3-3Z"/>',
  spa: '<path d="M12 20c-6 0-9-4-9-9 4 0 7 2 9 5 2-3 5-5 9-5 0 5-3 9-9 9Z"/><path d="M8 12c0-4 1-7 4-10 3 3 4 6 4 10M12 16v4"/>',
  fitness: '<path d="m8 8 8 8M3 8l5-5M16 21l5-5M5 10l5-5M14 19l5-5M2 6l4-4M18 22l4-4"/>',
  healthcare: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  ott: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="m10 9 6 3-6 3Z"/>',
  cab: '<path d="m5 10 2-6h10l2 6M3 10h18v8H3ZM6 18v2M18 18v2M6 14h2M16 14h2"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5a2 2 0 0 1 2-2h12M21 11h-6v5h6M17 13.5h.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  received: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  personal: '<path d="M20 7c0 5-8 12-8 12S4 12 4 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1Z"/>',
  contactless: '<path d="M8 9a5 5 0 0 1 0 6m4-9a10 10 0 0 1 0 12m4-15a15 15 0 0 1 0 18"/>',
};
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`;
}
export function categoryFor(name) {
  if (/spa|lakm|massage/i.test(name)) return 'spa';
  if (/cult|fitness|gym/i.test(name)) return 'fitness';
  if (/thyro|health|medical|diagnostic/i.test(name)) return 'healthcare';
  if (/ott|stream|netflix|prime video/i.test(name)) return 'ott';
  if (/cab|taxi|uber|ola voucher/i.test(name)) return 'cab';
  return 'other';
}
