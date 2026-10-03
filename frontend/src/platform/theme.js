import presets from '../../../shared/themes.json';
export { presets };
export function luminance(hex) {
 const values=hex.replace('#','').match(/.{2}/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return values.reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
}
export function foreground(hex) {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)
    .map((x) => parseInt(x, 16) / 255);
  const lum = rgb
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((n, x, i) => n + x * [0.2126, 0.7152, 0.0722][i], 0);
  return (lum + 0.05) / 0.05 >= 1.05 / (lum + 0.05) ? '#000000' : '#ffffff';
}
const rgb = (hex) =>
  hex
    ?.replace('#', '')
    .match(/.{2}/g)
    ?.map((x) => parseInt(x, 16))
    .join(' ');
export function themeOf(value, path = 'institute') {
  const p =
    presets[value?.preset] || presets[path === 'institute' ? 'chalk' : 'mint'];
  const primary = value?.primary || p.primary,
    accent = value?.accent || p.accent;
  return {
    ...p,
    ...value,
    primary,
    accent,
    onPrimary: foreground(primary),
    onAccent: foreground(accent),
  };
}
export function applyTheme(tenant) {
  const root = document.documentElement,
    dark = root.dataset.theme === 'dark';
  root.dataset.plinth = tenant?.path || 'marketing';
  const t = tenant
    ? themeOf(tenant.theme, tenant.path)
    : {
        canvas: dark ? '#080808' : '#f4f4f4',
        surface: dark ? '#151515' : '#ffffff',
        ink: dark ? '#ffffff' : '#000000',
        muted: dark ? '#b8b8b8' : '#555555',
        line: dark ? '#666666' : '#929292',
        primary: dark ? '#ffffff' : '#000000',
        accent: '#2ec4b6',
        onPrimary: dark ? '#000000' : '#ffffff',
        radius: 16,
      };
  const set = (key, value) => root.style.setProperty(key, value);
  for (const [key, value] of Object.entries({
    paper: dark && tenant ? t.darkCanvas : t.canvas,
    surface: dark && tenant ? t.darkSurface : t.surface,
    ink: dark && tenant ? t.darkInk : t.ink,
    muted: dark && tenant ? t.darkMuted : t.muted,
    line: dark && tenant ? t.darkLine : t.line,
    green: (()=>{const bg=dark&&tenant?t.darkCanvas:t.canvas,a=luminance(t.primary),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return ratio>=4.5?t.primary:dark&&tenant?t.darkInk:t.ink})(),
  }))
    set('--' + key, rgb(value));
  set('--p-primary', t.primary);
  set('--p-accent', t.accent);
  set('--p-on-primary', foreground(t.primary));
  set('--p-on-accent', foreground(t.accent));
  set('--p-radius', t.radius + 'px');
  document.title = tenant
    ? tenant.name + ' · Plinth'
    : 'Plinth — A place for your people';
  const icon = document.querySelector('link[rel="icon"]');
  if (icon)
    icon.href = tenant?.logoUrl
      ? tenant.logoUrl.replace('/192', '/32')
      : tenant?.slug === 'dps-agra'
        ? '/dps-logo.png'
        : '/plinth.svg';
}
