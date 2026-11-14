// LinkBox Chrome Extension — Background Service Worker (Manifest V3)
'use strict';

const STORAGE_KEY = 'linkbox_state_v1';

const CAT_RULES = [
  { key: 'nsfw', name: 'Conteúdo 18+', color: '#E11D48', domains: ['pornhub', 'xvideos', 'xnxx', 'xhamster', 'onlyfans', 'rule34', 'chaturbate', 'redtube', 'youporn'], words: ['porn', 'porno', 'nsfw', 'hentai', 'nude', 'onlyfans', 'sexo'] },
  { key: 'book', name: 'Livros e Educação', color: '#A0705A', domains: ['wikipedia.org', 'coursera', 'udemy', 'alura.com.br', 'goodreads', 'duolingo', 'scielo', 'khanacademy.org', 'rocketseat.com.br'], words: ['livro', 'leitura', 'literatura', 'ciencia', 'educacao', 'curso', 'aula', 'book', 'course'] },
  { key: 'music', name: 'Música', color: '#2F8F6B', domains: ['spotify', 'soundcloud', 'music.apple.com', 'deezer', 'bandcamp', 'last.fm', 'shazam', 'cifraclub.com.br'], words: ['musica', 'album', 'playlist', 'podcast', 'violao', 'guitarra', 'cifra', 'music'] },
  { key: 'video', name: 'Filmes e Séries', color: '#C8553D', domains: ['youtube.com', 'youtu.be', 'netflix', 'primevideo', 'disneyplus', 'max.com', 'globoplay', 'imdb', 'vimeo', 'twitch', 'crunchyroll'], words: ['filme', 'serie', 'cinema', 'anime', 'trailer', 'movie', 'film'] },
  { key: 'social', name: 'Redes Sociais e Canais', color: '#B5527A', domains: ['t.me', 'telegram.org', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'threads.net', 'linkedin.com', 'reddit.com', 'tiktok.com', 'discord.com', 'whatsapp.com'], words: ['telegram', 'instagram', 'facebook', 'twitter', 'tiktok', 'reddit', 'discord'] },
  { key: 'code', name: 'Código e Tecnologia', color: '#6E6A63', domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'dev.to', 'tabnews.com.br', 'tecnoblog.net', 'canaltech.com.br', 'openai.com', 'anthropic.com', 'claude.ai', 'chatgpt.com', 'vercel.com', 'docker.com', 'npmjs.com'], words: ['codigo', 'api', 'sdk', 'linux', 'windows', 'android', 'python', 'javascript', 'typescript', 'github', 'docker', 'tecnologia', 'software'] },
  { key: 'shop', name: 'Compras', color: '#6A9A3A', domains: ['mercadolivre', 'amazon', 'magazineluiza', 'kabum.com.br', 'shopee', 'aliexpress', 'ebay', 'americanas', 'casasbahia', 'olx', 'shein'], words: ['comprar', 'compra', 'preco', 'desconto', 'oferta', 'loja', 'shop', 'store'] },
  { key: 'design', name: 'Design', color: '#D98E2B', domains: ['figma.com', 'behance.net', 'dribbble.com', 'awwwards.com', 'pinterest', 'framer.com', 'unsplash.com', 'freepik.com', 'canva.com', 'adobe.com'], words: ['design', 'figma', 'ui', 'ux', 'mockup', 'tipografia', 'interface'] },
  { key: 'travel', name: 'Viagens', color: '#D2546A', domains: ['airbnb', 'booking.com', 'skyscanner', 'tripadvisor', 'decolar.com', 'maps.google.com', 'waze.com', 'latam.com', 'voegol.com.br', 'voeazul.com.br'], words: ['viagem', 'viagens', 'hotel', 'passagem', 'voo', 'roteiro', 'travel', 'trip'] },
  { key: 'finance', name: 'Finanças e Negócios', color: '#1F8A8A', domains: ['nubank.com.br', 'itau.com.br', 'bradesco', 'bb.com.br', 'santander', 'infomoney.com.br', 'valor.globo.com', 'binance.com', 'tradingview.com', 'gov.br'], words: ['financas', 'banco', 'credito', 'investimento', 'bitcoin', 'cripto', 'economia', 'negocios', 'finance'] },
  { key: 'news', name: 'Notícias e Mídia', color: '#8A7A5C', domains: ['g1.globo.com', 'uol.com.br', 'folha.uol.com.br', 'estadao.com.br', 'bbc.com', 'cnnbrasil.com.br', 'forbes', 'reuters', 'bloomberg', 'nytimes.com', 'theguardian.com'], words: ['noticia', 'noticias', 'jornal', 'reportagem', 'news'] }
];

const DEFAULT_GLOBE_SVG = `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

function cleanRawUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  u = u.replace(/^["'«(\[]+/, '').replace(/["'».,;:!?)\]]+$/, '').trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/i.test(parsed.protocol)) return '';
    return parsed.href;
  } catch (e) {
    return '';
  }
}

function normalizeUrlForCompare(raw) {
  const c = cleanRawUrl(raw);
  if (!c) return '';
  try {
    const u = new URL(c);
    let host = u.hostname.toLowerCase().replace(/^www\./, '');
    let path = u.pathname.replace(/\/+$/, '');
    return host + path + u.search;
  } catch (e) {
    return c.toLowerCase();
  }
}

function extractBrand(domain) {
  const parts = domain.split('.').filter(p => !['www', 'm', 'mobile', 'com', 'net', 'org', 'br', 'gov', 'edu', 'io', 'co'].includes(p));
  const root = parts.length ? parts[parts.length - 1] : domain.split('.')[0];
  return root ? root.charAt(0).toUpperCase() + root.slice(1) : 'Site';
}

function classifyUrl(domain, title, url) {
  const host = domain.toLowerCase().replace(/^www\./, '');
  const hay = (title + ' ' + url).toLowerCase();
  for (const rule of CAT_RULES) {
    if (rule.domains.some(d => host === d || host.endsWith('.' + d) || host.includes(d))) {
      return rule;
    }
    if (rule.words.some(w => hay.includes(w))) {
      return rule;
    }
  }
  return { key: 'web', name: 'Recursos Web', color: '#7A8A6A' };
}

function formatDateBR() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
}

async function saveUrlToStorage(rawUrl, rawTitle = '', checkAutoCopyFlag = false) {
  const url = cleanRawUrl(rawUrl);
  if (!url) return { status: 'invalid' };

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = stored[STORAGE_KEY] || { items: [], lockedFolders: [], themeMode: 'light', viewMode: 'small', sortMode: 'newest', fontScale: 'md', autoSaveCopy: true };

  if (checkAutoCopyFlag && state.autoSaveCopy === false) {
    return { status: 'disabled' };
  }

  const items = Array.isArray(state.items) ? state.items : [];
  const normTarget = normalizeUrlForCompare(url);
  const dup = items.find(it => normalizeUrlForCompare(it.url) === normTarget);
  if (dup) {
    flashBadge('DUP', '#D98E2B');
    return { status: 'duplicate', item: dup };
  }

  const u = new URL(url);
  const domain = u.hostname.replace(/^www\./, '');
  const name = extractBrand(domain);
  const cat = classifyUrl(domain, rawTitle, url);
  const title = (rawTitle && rawTitle.trim()) ? rawTitle.trim() : `${name} — Página Web`;
  const brandTag = '#' + name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const newItem = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name,
    domain,
    url,
    title,
    cat: cat.name,
    cats: [cat.name],
    date: formatDateBR(),
    color: cat.color,
    note: `Página «${title}» em ${name} (${domain}).`,
    tags: [brandTag, '#' + cat.key].filter((v, i, a) => v.length > 1 && a.indexOf(v) === i),
    svg: DEFAULT_GLOBE_SVG,
    lockedOverride: cat.key === 'nsfw' ? true : null,
    pinned: false,
    folderPriority: false,
    pendingOffline: !rawTitle,
    isRead: false
  };

  items.unshift(newItem);
  state.items = items;
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  flashBadge('✓', '#16A34A');
  return { status: 'saved', item: newItem };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'save-page', title: 'Salvar página no LinkBox', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'save-link', title: 'Salvar link no LinkBox', contexts: ['link'] });
    chrome.contextMenus.create({ id: 'open-linkbox', title: 'Abrir LinkBox (tela cheia)', contexts: ['action', 'page'] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-page' && tab && tab.url) {
    saveUrlToStorage(tab.url, tab.title || '');
  } else if (info.menuItemId === 'save-link' && info.linkUrl) {
    saveUrlToStorage(info.linkUrl, info.selectionText || '');
  } else if (info.menuItemId === 'open-linkbox') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'SAVE_COPIED_LINK' && msg.url) {
    saveUrlToStorage(msg.url, msg.title || '', true).then(sendResponse);
    return true;
  }
});
