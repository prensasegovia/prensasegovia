/* ================= Configuración ================= */
const CATS = [
  {k:"policial", n:"Policial y sucesos", d:"M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"},
  {k:"social", n:"Movilizaciones y crispación", d:"M7 21v-4l-3-3 2-6h3l2 4h4M15 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 21v-6l2-2-1-4h-4"},
  {k:"medioambiente", n:"Medio ambiente", d:"M5 20c0-9 6-15 15-15 0 9-6 15-15 15zM5 20l8-8"},
  {k:"autoridades", n:"Visitas de autoridades", d:"M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"},
  {k:"politica", n:"Política", d:"M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M3 10l9-6 9 6z"},
  {k:"emergencias", n:"Tráfico y emergencias", d:"M12 3l9 16H3zM12 10v4M12 17h.01"},
  {k:"eventos", n:"Fiestas y eventos", d:"M4 21V4M4 4h12l-2 4 2 4H4"}
];
const CAT = Object.fromEntries(CATS.map(c=>[c.k,c]));
const ALL = CATS.map(c=>c.k);
const I = {
  ext:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>`,
  share:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>`,
  fav:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  cal:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  check:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>`,
  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16z"/><path d="M10 21h4"/></svg>`,
  reload:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>`,
  back:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  chev:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>`
};
const ICON = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const REFRESH_MS = 10*60*1000;


