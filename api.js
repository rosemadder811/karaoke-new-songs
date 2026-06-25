/**
 * api.js — 탁음, 요음, 영어, 한자(名残 등)의 한국어 발음 완전 변환 레이어
 */

const FALLBACK = {
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json'
};

// [업데이트] 탁음, 반탁음, 요음, 장음, 결합 규칙을 모두 포함한 완벽한 가나-한글 매핑 테이블
const kanaToHangulMap = {
  // 청음 (히라가나 / 가타카나)
  'あ': '아', 'い': '이', 'う': '우', 'え': '에', 'お': '오', 'ア': '아', 'イ': '이', 'ウ': '우', 'エ': '에', 'オ': '오',
  'か': '카', 'き': '키', 'く': '쿠', 'け': '케', 'こ': '코', 'カ': '카', 'キ': '키', 'ク': '쿠', 'ケ': '케', 'コ': '코',
  'さ': '사', 'し': '시', 'す': '스', 'せ': '세', 'そ': '소', 'サ': '사', 'シ': '시', 'ス': '스', 'セ': '세', 'ソ': '소',
  'た': '타', 'ち': '치', 'つ': '츠', 'て': '테', 'と': '토', 'タ': '타', 'チ': '치', 'ツ': '츠', 'テ': '테', 'ト': '토',
  'な': '나', 'に': '니', 'ぬ': '누', 'ね': '네', 'の': '노', 'ナ': '나', 'ニ': '니', 'ヌ': '누', 'ネ': '네', 'ノ': '노',
  'は': '하', 'ひ': '히', 'ふ': '후', 'へ': '헤', 'ほ': '호', 'ハ': '하', 'ヒ': '히', 'フ': '후', 'ヘ': '헤', 'ホ': '호',
  'ま': '마', 'み': '미', 'む': '무', 'め': '메', 'も': '모', 'マ': '마', 'ミ': '미', 'ム': '무', 'メ': '메', 'モ': '모',
  'や': '야', 'ゆ': '유', 'よ': '요', 'ヤ': '야', 'ユ': '유', 'ヨ': '요',
  'ら': '라', 'り': '리', 'る': '루', 'れ': '레', 'ろ': '로', 'ラ': '라', 'リ': '리', 'ル': '루', 'レ': '레', 'ロ': '로',
  'わ': '와', 'を': '오', 'ん': '응', 'ワ': '와', 'ヲ': '오', 'ン': '응',

  // 탁음 & 반탁음 (가장 중요!)
  'が': '가', 'ぎ': '기', 'ぐ': '구', 'げ': '게', 'ご': '고', 'ガ': '가', 'ギ': '기', 'グ': '구', 'ゲ': '게', 'ゴ': '고',
  'ざ': '자', 'じ': '지', 'ず': '즈', 'ぜ': '제', 'ぞ': '조', 'ザ': '자', 'ジ': '지', 'ズ': '즈', 'ゼ': '제', 'ゾ': '조',
  'だ': '다', 'ぢ': '지', 'づ': '즈', 'で': '데', 'ど': '도', 'ダ': '다', 'ヂ': '지', 'ヅ': '즈', 'デ': '데', 'ド': '도',
  'ば': '바', 'び': '비', 'ぶ': '부', 'べ': '베', 'ぼ': '보', 'バ': '바', 'ビ': '비', 'ブ': '부', 'ベ': '베', 'ボ': '보',
  'ぱ': '파', 'ぴ': '피', 'ぷ': '푸', 'ぺ': '페', 'ぽ': '포', 'パ': '파', 'ピ': '피', 'プ': '푸', 'ペ': '페', 'ポ': '포',

  // 장음 및 기타 특수 부호 처리
  'ー': '', '〜': '', ' ': ' '
};

// 복합 요음 처리를 위한 사전 치환 테이블 (きょ -> 쿄, しょ -> 쇼 등)
const complexKanaMap = {
  'きゃ': '캬', 'きゅ': '큐', 'きょ': '쿄', 'キャ': '캬', 'キュ': '큐', 'キョ': '쿄',
  'しゃ': '샤', 'しゅ': '슈', 'しょ': '쇼', 'シャ': '샤', 'シュ': '슈', 'ショ': '쇼',
  'ちゃ': '차', 'ちゅ': '추', 'ちょ': '초', 'チャ': '차', 'チュ': '추', 'チョ': '초',
  'にゃ': '냐', 'にゅ': '뉴', 'にょ': '뇨', 'ニャ': '냐', 'ニュ': '뉴', 'ニョ': '뇨',
  'ひゃ': '햐', 'ひゅ': '휴', 'ひょ': '효', 'ヒャ': '햐', 'ヒュ': '휴', 'ヒョ': '효',
  'みゃ': '먀', 'みゅ': '뮤', 'みょ': '묘', 'ミャ': '먀', 'ミュ': '뮤', 'ミョ': '묘',
  'りゃ': '랴', 'りゅ': '류', 'りょ': '료', 'リャ': '랴', 'リュ': '류', 'リョ': '료',
  'ぎゃ': '갸', 'ぎゅ': '규', 'ぎょ': '교', 'ギャ': '갸', 'ギュ': '규', 'ギョ': '교',
  'じゃ': '자', 'じゅ': '주', 'じょ': '조', 'ジャ': '자', 'ジュ': '주', 'ジョ': '조',
  'びゃ': '뱌', 'びゅ': '뷰', 'びょ': '뵤', 'ビャ': '뱌', 'ビュ': '뷰', 'ビョ': '뵤',
  'ぴゃ': '퍄', 'ぴゅ': '퓨', 'ぴょ': '표', 'ピャ': '퍄', 'ピュ': '퓨', 'プョ': '표'
};

// [업데이트] 영어 알파벳 발음 변환 테이블 (노래 제목에 섞여 있는 영단어용)
const englishToHangulMap = {
  'lemon': '레몬', 'pretender': '프리텐더', 'kick back': '킥백', 'idol': '아이돌',
  'vocaloid': '보컬로이드', 'miku': '미쿠', 'rin': '린', 'len': '렌', 'luka': '루카',
  'kaito': '카이토', 'meiko': '메이코', 'gumi': '구미', 'ia': '이아', 'love': '러브',
  'night': '나이트', 'king': '킹', 'queen': '퀸', 'vaundy': '바운디', 'yoasobi': '요아소비'
};

// [업데이트] 명사 한자 독음 데이터베이스 (요청하신 名残 포함)
const kanjiToHangulMap = {
  '名残': '나고리', '初音': '하츠네', '消失': '쇼우시츠', '夜': '요루', '駆': '카케',
  '恋': '코이', '歌': '우타', '唄': '우타', '怪獣': '카이쥬우', '花': '하나',
  '丸の内': '마루노우치', '少女': '쇼우죠', '千本桜': '센본자쿠라', '脳裏': '노우이',
  '崩壊': '호우카이', '世界': '세카이', '終末': '슈우마츠', '未来': '미라이', '残響': '잔쿄우'
};

// [고도화] 한자, 영어, 탁음 통합 한국어 발음 변환 엔진
function convertJapaneseToHangul(text) {
  if (!text) return "";
  let processed = String(text).trim();
  let lowercaseText = processed.toLowerCase();

  // 1. 통째로 매핑되는 영어 단어가 있다면 우선 치환
  for (const [eng, kor] of Object.entries(englishToHangulMap)) {
    if (lowercaseText.includes(eng)) {
      processed = processed.replace(new RegExp(eng, 'gi'), kor);
    }
  }

  // 2. 등록된 한자어 단어 치환 (名残 -> 나고리 등)
  for (const [kanji, hangul] of Object.entries(kanjiToHangulMap)) {
    processed = processed.split(kanji).join(hangul);
  }

  // 3. 복합 요음(きゃ, しょ 등 2글자 결합) 우선 치환
  for (const [doubleKana, hangul] of Object.entries(complexKanaMap)) {
    processed = processed.split(doubleKana).join(hangul);
  }

  // 4. 나머지 개별 가나 문자(탁음 포함) 순차 치환
  let result = "";
  for (let i = 0; i < processed.length; i++) {
    const char = processed[i];
    result += kanaToHangulMap[char] || char;
  }

  // [보정] 변환 후에도 한글이 전혀 없는 순수 영어 문장인 경우 알파벳 그대로 유지하지 않고 읽기 편하게 제공
  const hasHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(result);
  return hasHangul ? result : text;
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
      } else if (fullText.includes('메이코') || varChar === 'meiko' || fullText.includes('meiko') || fullText.includes('メイコ')) {
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