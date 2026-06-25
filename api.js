/**
 * api.js — TJ노래방 데이터 레이어 (중복 검증 가드 내장형)
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

// 중복 제거 가용 헬퍼 함수
function deduplicateSongs(songsArray) {
  const seen = new Set();
  return songsArray.filter(item => {
    if (!item || !item.songNo) return false;
    if (seen.has(item.songNo)) return false;
    seen.add(item.songNo);
    return true;
  });
}

export async function getJPopNewSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.jpopNew);
    const data = await res.json();
    const orig = data.songs || data || [];
    const processed = orig.map(s => ({
      ...s,
      pronunciation: s.pronunciation || getMockPronunciation(s.title)
    }));
    return { data: deduplicateSongs(processed), source: 'live' };
  } catch {
    const mock = [
      { songNo: "68992", title: "アイドル", pronunciation: "아이도루", artist: "YOASOBI", addedDate: "2024-01-10", isNew: true },
      { songNo: "68341", title: "Lemon", pronunciation: "레몬", artist: "Yonezu Kenshi", addedDate: "2024-01-05", isNew: false },
      { songNo: "28744", title: "丸の内サディスティック", pronunciation: "마루노우치 사디스팃쿠", artist: "Shiina Ringo", addedDate: "2023-12-15", isNew: false }
    ];
    return { data: deduplicateSongs(mock), source: 'backup' };
  }
}

export async function getVocaloidSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.vocaloid);
    const data = await res.json();
    const orig = data.songs || data || [];
    const processed = orig.map(s => ({
      ...s,
      pronunciation: s.pronunciation || getMockPronunciation(s.title)
    }));
    return { data: deduplicateSongs(processed), source: 'voca_list' };
  } catch {
    const mock = [
      { songNo: "27610", title: "初音ミク의 消失", pronunciation: "하츠네미쿠노 쇼우시츠", artist: "cosMo@폭주P", vocaloid: "miku" },
      { songNo: "28655", title: "メルト", pronunciation: "메루토", artist: "ryo", vocaloid: "miku" },
      { songNo: "28911", title: "ロ미오와 シンデレラ", pronunciation: "로미오토 신데레라", artist: "doriko", vocaloid: "miku" }
    ];
    return { data: deduplicateSongs(mock), source: 'backup' };
  }
}

export async function getJPopFullLibrary() {
  const { data: newSongs } = await getJPopNewSongs();
  const baseLib = [
    { songNo: "68551", title: "ドライフラワー", pronunciation: "도라이후라와", artist: "Yuuri" },
    { songNo: "68400", title: "夜に駆ける", pronunciation: "요루니 카케루", artist: "YOASOBI" },
    { songNo: "68102", title: "Pretender", pronunciation: "프리텐다", artist: "Official髭男dism" },
    { songNo: "68310", title: "怪獣の花唄", pronunciation: "카이쥬우노 하나우타", artist: "Vaundy" },
    { songNo: "28211", title: "小さな恋のうた", pronunciation: "치이사나 코이노우타", artist: "MONGOL800" },
    { songNo: "68710", title: "Kick Back", pronunciation: "킥밧쿠", artist: "Yonezu Kenshi" }
  ];

  return deduplicateSongs([...newSongs, ...baseLib]);
}

function getMockPronunciation(title) {
  if (/^[a-zA-Z\s]+$/.test(title)) return title;
  return "한국어 발음 가이드";
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