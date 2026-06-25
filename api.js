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
    const processed = (data.songs || data || []).map(s => ({
      ...s,
      pronunciation: s.pronunciation || getMockPronunciation(s.title) // 발음 누락 방지 보정
    }));
    return { data: processed, source: 'live' };
  } catch {
    const mock = [
      { songNo: "68992", title: "アイドル", pronunciation: "아이도루", artist: "YOASOBI", addedDate: "2024-01-10", isNew: true },
      { songNo: "68341", title: "Lemon", pronunciation: "레몬", artist: "Yonezu Kenshi", addedDate: "2024-01-05", isNew: false },
      { songNo: "28744", title: "丸の内サディスティック", pronunciation: "마루노우치 사디스팃쿠", artist: "Shiina Ringo", addedDate: "2023-12-15", isNew: false }
    ];
    return { data: mock, source: 'backup' };
  }
}

export async function getVocaloidSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.vocaloid);
    const data = await res.json();
    const processed = (data.songs || data || []).map(s => ({
      ...s,
      pronunciation: s.pronunciation || getMockPronunciation(s.title)
    }));
    return { data: processed, source: 'voca_list' };
  } catch {
    const mock = [
      { songNo: "27610", title: "初音ミク의 消失", pronunciation: "하츠네미쿠노 쇼우시츠", artist: "cosMo@폭주P", vocaloid: "miku" },
      { songNo: "28655", title: "メルト", pronunciation: "메루토", artist: "ryo", vocaloid: "miku" },
      { songNo: "28911", title: "ロミ오와 シンデレラ", pronunciation: "로미오토 신데레라", artist: "doriko", vocaloid: "miku" }
    ];
    return { data: mock, source: 'backup' };
  }
}

// J-POP 라이브러리용 전체 목록 목업 제네레이터
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

  // 중복 제거 결합
  const pool = [...newSongs, ...baseLib];
  const unique = [];
  const seen = new Set();
  pool.forEach(item => {
    if (!seen.has(item.songNo)) {
      seen.add(item.songNo);
      unique.push(item);
    }
  });
  return unique;
}

function getMockPronunciation(title) {
  if (/^[a-zA-Z\s]+$/.test(title)) return title;
  return "한국어 발음 제공 예정";
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