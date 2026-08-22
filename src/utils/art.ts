const palettes = [
  ['#7c3aed', '#db2777', '#0b1020'],
  ['#0891b2', '#4338ca', '#050816'],
  ['#be123c', '#7c2d12', '#09090b'],
  ['#059669', '#164e63', '#08110f'],
  ['#a16207', '#7e22ce', '#0c0713'],
];

const hash = (value: string) =>
  Array.from(value || 'CINEMIND').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);

const esc = (value: string) => value.replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch] || ch));

export function makeArt(label: string, kind: 'backdrop' | 'poster' | 'avatar' | 'thumb' = 'backdrop'): string {
  const [a, b, c] = palettes[Math.abs(hash(label)) % palettes.length];
  const dims = kind === 'poster' ? [600, 900] : kind === 'avatar' ? [512, 512] : kind === 'thumb' ? [720, 405] : [1600, 900];
  const [w, h] = dims;
  const safe = esc((label || 'CINEMIND').slice(0, 42));
  const subtitle = kind === 'avatar' ? 'SYNTHETIC CHARACTER' : 'CINEMIND ORIGINAL';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
      <radialGradient id="r"><stop stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="38"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w*.72}" cy="${h*.28}" r="${Math.min(w,h)*.28}" fill="url(#r)" filter="url(#blur)"/>
    <path d="M0 ${h*.78} C ${w*.22} ${h*.52}, ${w*.45} ${h*.98}, ${w*.66} ${h*.66} S ${w} ${h*.62}, ${w} ${h*.62} L ${w} ${h} L0 ${h}Z" fill="#000" opacity=".32"/>
    <g fill="white" font-family="Inter,Arial,sans-serif">
      <text x="${w*.07}" y="${h*.74}" font-size="${Math.max(24, Math.round(w*.045))}" font-weight="800" letter-spacing="1">${safe}</text>
      <text x="${w*.07}" y="${h*.80}" font-size="${Math.max(12, Math.round(w*.015))}" opacity=".72" letter-spacing="4">${subtitle}</text>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const artSrc = (url: string | undefined, label: string, kind: 'backdrop' | 'poster' | 'avatar' | 'thumb' = 'backdrop') =>
  url && !/^https?:\/\//i.test(url) ? url : makeArt(label, kind);
