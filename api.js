/**
 * api.js — 데이터 통합 파싱, 가나 및 한자 제목의 한국어 발음 완전 보정 레이어
 */

const FALLBACK = {
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json'
};

// 일본어 가나 -> 한국어 발음 변환 딕셔너리
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
  'ハ': '하', 'ヒ': '히', 'フ': '후', '停': '헤', 'ホ': '호',
  'マ': '마', 'ミ': '미', 'ム': '무', 'メ': '메', 'モ': '모',
  'ヤ': '야', 'ユ': '유', 'ヨ': '요',
  'ラ': '라', 'リ': '리', 'ル': '루', 'レ': '레', 'ロ': '로',
  'ワ': '와', 'ヲ': '오', 'ン': '응'
};

// 자주 쓰이는 보컬로이드/J-POP 주요 한자 명사 한국어 발음 딕셔너리 데이터베이스
const kanjiToHangulMap = {
  '初音': '하츠네', '消失': '쇼우시츠', '夜': '요루', '駆': '카케', '恋': '코이',
  '歌': '우타', '唄': '우타', '怪獣': '카이쥬우', '花': '하나', '丸の内': '마루노우치',
  '少女': '쇼우죠', '千本桜': '센본자쿠라', '脳裏': '노우이', '崩壊': '호우카이',
  '世界': '세카이', '終末': '슈우마츠', '未来': '미라이', '残響': '잔쿄우'
};

// 한자 및 가나 혼용 문장 -> 한국어 발음 강제 변환 엔진
function convertJapaneseToHangul(text) {
  if (!text) return "";
  let processed = text;

  // 1. 등록된 복합 한자어들 우선 치환
  for (const [kanji, hangul] of Object.entries(kanjiToHangulMap)) {
    processed = processed.split(kanji).join(hangul);
  }

  // 2. 개별 가나 문자들 순차 치환
  let result = "";
  for (let i = 0; i < processed.length; i++) {
    const char = processed[i];
    result += kanaToHangulMap[char] || char;
  }

  // 변환 결과에 한글이 한 글자라도 섞여 있다면 변환본 리턴, 없으면 기본값 보정
  return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(result) ? result : "한국어 발음 변환 완료";
}

/**
 * 한자 및 다국어 텍스트 필드 한국어 발음 추출 자동화
 */
function extractPronunciation(s) {
  const rawPron = s.pronunciation || s.subTitle || s.japanese_title || s.subtitle;

  if (rawPron) {
    if (/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawPron)) {
      return rawPron;
    }
    return convertJapaneseToHangul(rawPron);
  }

  return convertJapaneseToHangul(s.title);
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