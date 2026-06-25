/**
 * api.js — TJ노래방 데이터 레이어 (실제 데이터 발음 매핑 및 캐릭터 분류 정밀화)
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

// 실제 원본 데이터에 존재하는 필드값을 발음 가이드로 안정적인 연동 처리
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
      { songNo: "68341", title: "Lemon", pronunciation: "레몬", artist: "Yonezu Kenshi", addedDate: "2024-01-05" },
      { songNo: "28744", title: "丸の内サディスティック", pronunciation: "마루노우치 사디스팃쿠", artist: "Shiina Ringo", addedDate: "2023-12-15" }
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
      // 데이터 내에 vocaloid 식별 필드가 없으면 제목이나 아티스트명에서 유추해서 분류 데이터 강제 삽입
      let vChar = s.vocaloid || "";
      if (!vChar) {
        const txt = (s.title + " " + s.artist).toLowerCase();
        if (txt.includes('初音') || txt.includes('miku') || txt.includes('미쿠')) vChar = 'miku';
        else if (txt.includes('린') || txt.includes('rin') || txt.includes('鏡音リン')) vChar = 'rin';
        else if (txt.includes('렌') || txt.includes('len') || txt.includes('鏡音レン')) vChar = 'len';
        else if (txt.includes('루카') || txt.includes('luka') || txt.includes('巡音')) vChar = 'luka';
        else if (txt.includes('kaito') || txt.includes('카이토')) vChar = 'kaito';
        else if (txt.includes('meiko') || txt.includes('메이코')) vChar = 'meiko';
        else if (txt.includes('gumi') || txt.includes('구미')) vChar = 'gumi';
        else if (txt.includes('ia') || txt.includes('이아')) vChar = 'ia';
        else vChar = 'miku'; // 기본 폴백
      }
      return { ...s, pronunciation: pron, vocaloid: vChar.toLowerCase() };
    });
    return { data: deduplicateSongs(processed), source: 'voca_list' };
  } catch {
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
    { songNo: "68310", title: "怪獣の花唄", pronunciation: "카이쥬우노 하나우타", artist: "Vaundy" },
    { songNo: "28211", title: "小さな恋의 うた", pronunciation: "치이사나 코이노우타", artist: "MONGOL800" },
    { songNo: "68710", title: "Kick Back", pronunciation: "킥밧쿠", artist: "Yonezu Kenshi" }
  ];

  const mappedBase = baseLib.map(s => ({ ...s, pronunciation: extractPronunciation(s) }));
  return deduplicateSongs([...newSongs, ...mappedBase]);
}

export function getVocaloidClass(vocaloidStr = '') {
  const v = String(vocaloidStr).toLowerCase();
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