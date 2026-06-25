/**
 * api.js — TJ노래방 데이터 레이어
 */

const FALLBACK = {
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json',
};

async function fetchWithTimeout(url, options = {}, timeout = 6000) {
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

export async function getJPopNewSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.jpopNew);
    const data = await res.json();
    return { data: data.songs || data || [], source: 'live' };
  } catch {
    const mock = [
      { songNo: "68992", title: "Idol", artist: "YOASOBI", addedDate: "2024-01-10", isNew: true },
      { songNo: "68341", title: "Lemon", artist: "Yonezu Kenshi", addedDate: "2024-01-05", isNew: false }
    ];
    return { data: mock, source: 'backup' };
  }
}

export async function getVocaloidSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.vocaloid);
    const data = await res.json();
    return { data: data.songs || data || [], source: 'voca_list' };
  } catch {
    const mock = [
      { songNo: "27610", title: "소실 (消失)", artist: "cosMo@폭주P", vocaloid: "miku" },
      { songNo: "28655", title: "멜트 (Melt)", artist: "ryo", vocaloid: "miku" },
      { songNo: "28911", title: "로미오와 신데렐라", artist: "doriko", vocaloid: "miku" }
    ];
    return { data: mock, source: 'backup' };
  }
}

export function getVocaloidClass(vocaloidStr = '') {
  const v = String(vocaloidStr).toLowerCase();
  if (v.includes('miku') || v.includes('미쿠') || v.includes('初音')) return 'voca-miku';
  if (v.includes('rin') || v.includes('린') || v.includes('鏡音リン')) return 'voca-rin';
  if (v.includes('len') || v.includes('렌') || v.includes('鏡音レン')) return 'voca-len';
  if (v.includes('luka') || v.includes('루카') || v.includes('巡音')) return 'voca-luka';
  if (v.includes('gumi') || v.includes('구미') || v.includes('GUMI')) return 'voca-gumi';
  return 'voca-miku';
}

export function getRelativeDateLabel(dateStr) {
  if (!dateStr) return '최근';
  return dateStr.replace(/-/g, '.');
}

export function getRankChangeText(change) {
  if (change > 0) return { text: `▲${change}`, cls: 'up' };
  if (change < 0) return { text: `▼${Math.abs(change)}`, cls: 'down' };
  return { text: '-', cls: 'same' };
}