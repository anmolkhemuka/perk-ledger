export const THEME_KEY = 'perk-ledger.theme.v1';

export function initTheme() {
  const toggle = document.querySelector('#festive-theme');
  const notice = document.querySelector('#theme-notice');
  const apply = festive => {
    document.documentElement.dataset.theme = festive ? 'festive' : 'everyday';
    toggle.checked = festive;
    document.querySelector('meta[name="theme-color"]').content = festive ? '#fff9ef' : '#f5f2ff';
    document.querySelector('#page-heading').innerHTML = festive
      ? 'Light up<br>your rewards<span>.</span>'
      : 'Your cards.<br>More possibilities<span>.</span>';
    document.querySelector('#intro-eyebrow').textContent = festive
      ? 'A LITTLE LIGHT. EVERY PERK IN SIGHT.'
      : 'A LITTLE PERK. A LOT OF POSSIBILITY.';
    document.querySelector('#intro-description').textContent = festive
      ? 'A brighter home for the perks you already have. Keep vouchers, payments, and important dates in view.'
      : 'Keep your perks close. Track vouchers, enjoy rewards, and never miss what’s next.';
  };
  try { apply(localStorage.getItem(THEME_KEY) !== 'everyday'); }
  catch { apply(true); notice.textContent = 'Theme preference is unavailable in this browser.'; }
  toggle.addEventListener('change', () => {
    apply(toggle.checked);
    // This preference is deliberately separate from the ledger and its backups.
    try { localStorage.setItem(THEME_KEY, toggle.checked ? 'festive' : 'everyday'); notice.textContent = ''; }
    catch { notice.textContent = 'Theme changed for now; this browser could not save your preference.'; }
  });
  window.addEventListener('storage', event => {
    if (event.key === THEME_KEY) apply(event.newValue !== 'everyday');
  });
}
