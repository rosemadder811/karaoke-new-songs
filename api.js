/**
 * api.js — TJ노래방 데이터 레이어
 */

const TJ_BASE = 'https://www.tjmedia.com';
const PROXY_LIST = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/get?url=',
];

const TJ_URLS = {
  newSong: `${TJ_BASE}/tjsong/song_search_list.asp?searchType=4&strType=4`,
};

const FALLBACK = {
  jpopList: './data/jpop_chart.json',
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json',
};

const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJPopSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.jpopList);
    const data = await res.json();
    const songArray = data.songs || data || [];
    return { data: songArray, source: 'offline_library' };
  } catch (e) {
    const mockData = [
      { songNo: "68341", title: "Lemon", titleKo: "레몬", artist: "Yonezu Kenshi" },
      { songNo: "68725", title: "Pretender", titleKo: "프리텐더", artist: "Official HIGE DANDISM" },
      { songNo: "68601", title: "Marigold", titleKo: "메리골드", artist: "Aimyon" },
      { songNo: "68992", title: "Idol", titleKo: "아이돌", artist: "YOASOBI" },
      { songNo: "68843", title: "Dry Flower", titleKo: "드라이 플라워", artist: "Yuuri" }
    ];
    return { data: mockData, source: 'mock_fallback' };
  }
}

export async function getJPopNewSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.jpopNew);
    const data = await res.json();
    const songArray = data.songs || data || [];
    return { data: songArray.slice(0, 100), source: 'cached' };
  } catch {
    return { data: [], source: 'error' };
  }
}

export async function getVocaloidSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.vocaloid);
    const data = await res.json();
    const songArray = data.songs || data || [];
    return { data: songArray, source: 'curated' };
  } catch {
    return { data: [], source: 'error' };
  }
}

export function getVocaloidClass(vocaloidStr = '') {
  const v = vocaloidStr.toLowerCase();
  if (v.includes('初音') || v.includes('miku')) return 'voca-miku char-miku';
  if (v.includes('鏡音リン') || v.includes('rin')) return 'voca-rin char-rin';
  if (v.includes('鏡音レン') || v.includes('len')) return 'voca-len char-len';
  if (v.includes('巡音') || v.includes('luka')) return 'voca-luka char-luka';
  if (v.includes('kaito')) return 'voca-kaito char-kaito';
  if (v.includes('meiko')) return 'voca-meiko char-meiko';
  if (v.includes('gumi')) return 'voca-gumi char-gumi';
  if (v.includes('ia')) return 'voca-ia char-ia';
  return 'voca-miku char-miku';
}

export function getRelativeDateLabel(dateStr) {
  if (!dateStr) return '최근';
  return dateStr.replace(/-/g, '.');
}