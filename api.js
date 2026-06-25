/**
 * api.js — TJ노래방 데이터 레이어 (보컬로이드 자동 식별 및 발음 연동 강화)
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

function deduplicateSongs(songsArray) {
  const seen = new Set();
  return songsArray.filter(item => {
    if (!item || !item.songNo) return false;
    if (seen.has(item.songNo)) return false;
    seen.add(item.songNo);
    return true;
  });
}

function extractPronunciation(s) {
  return s.pronunciation || s.subTitle || s.japanese_title || s.subtitle || "일본어 발음 가이드";
}

export async function getJPopNewSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.jpopNew);
    const data = await res.json();
    const orig = data.songs || data || [];
    const processed = orig.map(s => ({
      ...s,
      pronunciation: extractPronunciation(s)
    }));
    return { data: deduplicateSongs(processed), source: 'live' };
  } catch {
    const mock = [
      { songNo: "68992", title: "アイドル", pronunciation: "아이도루", artist: "YOASOBI", addedDate: "2024-01-10" },
      { songNo: "68341", title: "Lemon", pronunciation: "레몬", artist: "Yonezu Kenshi", addedDate: "2024-01-05" }
    ];
    return { data: deduplicateSongs(mock), source: 'backup' };
  }
}

export async function getVocaloidSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.vocaloid);
    const data = await res.json();
    const orig = data.songs || data || [];

    const processed = orig.map(s => {
      const pron = extractPronunciation(s);

      // [핵심 수정] 제목과 아티스트 텍스트를 파싱하여 보컬로이드 종류를 정밀 식별합니다.
      let vChar = String(s.vocaloid || "").toLowerCase().trim();

      if (!vChar) {
        const text = (s.title + " " + s.artist).toLowerCase();
        if (text.includes('미쿠') || text.includes('miku') || text.includes('初音')) vChar = 'miku';
        else if (text.includes('린') || text.includes('rin') || text.includes('鏡音リン')) vChar = 'rin';
        else if (text.includes('렌') || text.includes('len') || text.includes('鏡音レン')) vChar = 'len';
        else if (text.includes('루카') || text.includes('luka') || text.includes('巡音')) vChar = 'luka';
        else if (text.includes('카이토') || text.includes('kaito')) vChar = 'kaito';
        else if (text.includes('메이코') || text.includes('meiko')) vChar = 'meiko';
        else if (text.includes('구미') || text.includes('gumi') || text.includes('megpoid')) vChar = 'gumi';
        else if (text.includes('ia') || text.includes('이아')) vChar = 'ia';
        else vChar = 'miku'; // 매칭이 안 될 경우 기본 카테고리 지정
      }

      return {
        ...s,
        pronunciation: pron,
        vocaloid: vChar
      };
    });

    return { data: deduplicateSongs(processed), source: 'voca_list' };
  } catch {
    // 백업용 모킹 데이터에도 정확한 매핑 적용
    const mock = [
      { songNo: "27610", title: "初音ミクの消失", pronunciation: "하츠네미쿠노 쇼우시츠", artist: "cosMo@폭주P", vocaloid: "miku" },
      { songNo: "28655", title: "メルト", pronunciation: "메루토", artist: "ryo", vocaloid: "miku" },
      { songNo: "28911", title: "ロミオ와 シンデレラ", pronunciation: "로미오토 신데레라", artist: "doriko", vocaloid: "miku" }
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
    { songNo: "68310", title: "怪獣の花唄", pronunciation: "카이쥬우노 하나우타", artist: "Vaundy" }
  ];
  const mappedBase = baseLib.map(s => ({ ...s, pronunciation: extractPronunciation(s) }));
  return deduplicateSongs([...newSongs, ...mappedBase]);
}

export function getVocaloidClass(vocaloidStr = '') {
  const v = String(vocaloidStr).toLowerCase().trim();
  if (v.includes('miku')) return 'voca-miku char-miku';
  if (v.includes('rin')) return 'voca-rin char-rin';
  if (v.includes('len')) return 'voca-len char-len';
  if (v.includes('luka')) return 'voca-luka char-luka';
  if (v.includes('kaito')) return 'voca-kaito char-kaito';
  if (v.includes('meiko')) return 'voca-meiko char-meiko';
  if (v.includes('gumi')) return 'voca-gumi char-gumi';
  if (v.includes('ia')) return 'voca-ia char-ia';
  return 'voca-miku char-miku';
}