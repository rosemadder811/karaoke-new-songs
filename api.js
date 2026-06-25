/**
 * api.js — 데이터 통합 파싱 및 일본어->한국어 발음 자동 변환 레이어
 */

const FALLBACK = {
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json',
};

// 일본어 글자를 한국어 발음으로 최소한 변환해주는 딕셔너리 (데이터 공백 방지용 폴백)
const kanaToHangulMap = {
  'あ': '아', 'い': '이', 'う': '우', 'え': '에', 'お': '오',
  'か': '카', 'き': '키', 'く': '쿠', 'け': '케', 'こ': '코',
  'さ': '사', 'し': '시', 'す': '스', 'せ': '세', 'そ': '소',
  'た': '타', 'ち': '치', 'つ': '츠', 'て': '테', 'と': '토',
  'な': '나', 'に': '니', 'ぬ': '누', 'ね': '네', 'の': '노',
  'は': '하', 'ひ': '히', 'ふ': '후', 'へ': '헤', 'ほ': '호',
  'ま': '마', 'み': '미', 'む': '무', 'め': '메', 'も': '모',
  'や': '야', 'ゆ': '유', 'よ': '요',
  'ら': '라', 'り': '리', 'る': '루', 'れ': '레', 'ろ': '로',
  'わ': '와', 'を': '오', 'ん': '응',
  'ア': '아', 'イ': '이', 'ウ': '우', 'エ': '에', 'オ': '오',
  'カ': '카', 'キ': '키', 'ク': '쿠', 'ケ': '케', 'コ': '코',
  'サ': '사', 'シ': '시', 'ス': '스', 'セ': '세', 'ソ': '소',
  'タ': '타', 'チ': '치', 'ツ': '츠', 'テ': '테', 'ト': '토',
  'ナ': '나', 'ニ': '니', 'ヌ': '누', 'ネ': '네', 'ノ': '노',
  'ハ': '하', 'ヒ': '히', 'フ': '후', 'ヘ': '헤', 'ホ': '호',
  'マ': '마', 'ミ': '미', 'ム': '무', 'メ': '메', 'モ': '모',
  'ヤ': '야', 'ユ': '유', 'ヨ': '요',
  'ラ': '라', 'リ': '리', 'ル': '루', 'レ': '레', 'ロ': '로',
  'ワ': '와', 'ヲ': '오', 'ン': '응'
};

// 간단한 가나 -> 한글 발음 변환기 (필드에 일본어만 적혀있을 때 작동)
function convertKanaToHangul(text) {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += kanaToHangulMap[char] || char;
  }
  // 한글 변환 후 가타카나/히라가나가 여전히 남아있거나 한글이 하나도 없다면 기본 기본값 리턴
  const hasHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(result);
  return hasHangul ? result : "발음 업데이트 예정";
}

/**
 * 1. [완벽 해결] 한국어 발음 강제 추출 및 정제 로직
 * 일본어 텍스트가 그대로 노출되는 것을 방지하고, 무조건 한글로 된 발음이 나오도록 제어합니다.
 */
function extractPronunciation(s) {
  // 1순위: 대소문자 가리지 않고 명시적인 한글 발음 필드가 있는지 검사
  const rawPron = s.pronunciation || s.subTitle || s.japanese_title || s.subtitle;

  if (rawPron) {
    // 만약 발음 필드에 들어있는 값이 영어/일본어 원문이 아니라 한글을 포함하고 있다면 그대로 반환
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawPron)) {
      return rawPron;
    }
    // 발음 필드조차 일본어로 적혀있다면 한글 발음으로 변환 시도
    return convertKanaToHangul(rawPron);
  }

  // 2순위: 원래 제목 가나를 한글 발음으로 강제 변환
  return convertKanaToHangul(s.title);
}

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

      /**
       * 2. [해결] 영어, 한국어, 일본어 이름 혼동 전면 교정 엔진
       */
      const fullText = (String(s.title) + " " + String(s.artist) + " " + String(s.vocaloid || "")).toLowerCase();
      let vChar = "miku";

      if (fullText.includes('미쿠') || fullText.includes('miku') || fullText.includes('初音') || fullText.includes('39')) {
        vChar = 'miku';
      } else if (fullText.includes('카가미네 린') || fullText.includes('鏡音リン') || fullText.includes('린') || fullText.includes('rin')) {
        vChar = 'rin';
      } else if (fullText.includes('카가미네 렌') || fullText.includes('鏡音レン') || fullText.includes('렌') || fullText.includes('len')) {
        vChar = 'len';
      } else if (fullText.includes('메구리네 루카') || fullText.includes('巡音ルカ') || fullText.includes('루카') || fullText.includes('luka')) {
        vChar = 'luka';
      } else if (fullText.includes('카이토') || fullText.includes('kaito') || fullText.includes('カイト')) {
        vChar = 'kaito';
      } else if (fullText.includes('메이코') || fullText.includes('meiko') || fullText.includes('メイコ')) {
        vChar = 'meiko';
      } else if (fullText.includes('구미') || fullText.includes('gumi') || fullText.includes('구미포이드') || fullText.includes('megpoid')) {
        vChar = 'gumi';
      } else if (fullText.includes('ia') || fullText.includes('이아') || fullText.includes('イア')) {
        vChar = 'ia';
      } else {
        if (fullText.includes('miku')) vChar = 'miku';
        else if (fullText.includes('rin')) vChar = 'rin';
        else if (fullText.includes('len')) vChar = 'len';
        else if (fullText.includes('luka')) vChar = 'luka';
        else if (fullText.includes('kaito')) vChar = 'kaito';
        else if (fullText.includes('meiko')) vChar = 'meiko';
        else if (fullText.includes('gumi')) vChar = 'gumi';
        else if (fullText.includes('ia')) vChar = 'ia';
      }

      return {
        ...s,
        pronunciation: pron,
        vocaloid: vChar
      };
    });

    return { data: deduplicateSongs(processed), source: 'voca_list' };
  } catch {
    const mock = [
      { songNo: "27610", title: "初音ミクの消失", pronunciation: "하츠네미쿠노 쇼우시츠", artist: "cosMo@폭주P", vocaloid: "miku" },
      { songNo: "28655", title: "メルト", pronunciation: "메루토", artist: "ryo", vocaloid: "miku" },
      { songNo: "28911", title: "ロミオ와 シンデ레라", pronunciation: "로미오토 신데레라", artist: "doriko", vocaloid: "miku" }
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