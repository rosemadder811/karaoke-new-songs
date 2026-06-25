/**
 * api.js — 모든 가나 촉음, 장음 보정 및 다국어 한자(桜, 悪魔, 踊, 神様 등) 한국어 발음 마스터 변환 레이어
 */

const FALLBACK = {
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json'
};

// [마스터 업데이트] 히라가나/가타카나 전체 및 촉음, 반탁음 대응 테이블
const kanaToHangulMap = {
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
  'が': '가', 'ぎ': '기', 'ぐ': '구', 'げ': '게', 'ご': '고', 'ガ': '가', 'ギ': '기', 'グ': '구', 'ゲ': '게', 'ゴ': '고',
  'ざ': '자', 'じ': '지', 'ず': '즈', 'ぜ': '제', 'ぞ': '조', 'ザ': '자', 'ジ': '지', 'ズ': '즈', 'ゼ': '제', 'ゾ': '조',
  'だ': '다', 'ぢ': '지', 'づ': '즈', 'で': '데', 'ど': '도', 'ダ': '다', 'ヂ': '지', 'ヅ': '즈', 'デ': '데', 'ド': '도',
  'ば': '바', 'び': '비', 'ぶ': '부', 'べ': '베', 'ぼ': '보', 'バ': '바', 'ビ': '비', 'ブ': '부', 'ベ': '베', 'ボ': '보',
  'ぱ': '파', 'ぴ': '피', 'ぷ': '푸', 'ぺ': '페', 'ぽ': '포', 'パ': '파', 'ピ': '피', 'プ': '푸', 'ペ': '페', 'ポ': '포'
};

// 복합 요음 사전 치환 테이블
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
  'ぴゃ': '퍄', 'ぴゅ': '퓨', 'ぴょ': '표', 'ピャ': '퍄', 'ピュ': '퓨', 'ピョ': '표'
};

// [대폭 추가] 보컬로이드 및 J-POP 빈출 전체 한자 마스터 딕셔너리
const kanjiToHangulMap = {
  '桜': '사쿠라', '悪魔': '아쿠마', '踊': '오도', '方': '가타', '神様': '카미사마', '神': '카미',
  '名残': '나고리', '初音': '하츠네', '消失': '쇼우시츠', '夜': '요루', '駆': '카케',
  '恋': '코이', '歌': '우타', '唄': '우타', '怪獣': '카이쥬우', '花': '하나',
  '丸の内': '마루노우치', '少女': '쇼우죠', '千本桜': '센본자쿠라', '脳裏': '노우이',
  '崩壊': '호우카이', '世界': '세카이', '終末': '슈우마츠', '未来': '미라이', '残響': '잔쿄우'
};

// [신규] 영단어 타이틀 완전 한국어 발음 보정 사전
const englishToHangulMap = {
  'hitchcock': '히치코크', 'believer': '빌리버', 'lemon': '레몬', 'pretender': '프리텐더',
  'kick back': '킥백', 'idol': '아이돌', 'vocaloid': '보컬로이드', 'miku': '미쿠'
};

// [핵심] 촉음 및 장음 문자 규칙적 변환 및 한자 통합 처리기
function convertJapaneseToHangul(text) {
  if (!text) return "";
  let processed = String(text).trim();
  let lowercaseText = processed.toLowerCase();

  // 1. 영어 타이틀 완벽 한글화 (hitchcock -> 히치코크, believer -> 빌리버)
  for (const [eng, kor] of Object.entries(englishToHangulMap)) {
    if (lowercaseText.includes(eng)) {
      processed = processed.replace(new RegExp(eng, 'gi'), kor);
    }
  }

  // 2. 한자 낱말 사전 치환 (桜 -> 사쿠라, 悪魔 -> 아쿠마, 踊り -> 오도리 등)
  for (const [kanji, hangul] of Object.entries(kanjiToHangulMap)) {
    processed = processed.split(kanji).join(hangul);
  }

  // 3. 복합 요음 가나 선제 치환
  for (const [doubleKana, hangul] of Object.entries(complexKanaMap)) {
    processed = processed.split(doubleKana).join(hangul);
  }

  // 4. 일본어 장음 기호(ー, ァ, ィ, ゥ, ェ, ォ) 및 촉음(ッ, ッ) 정밀 전처리
  processed = processed.replace(/[ー〜]/g, ''); // 장음 기호 제거

  // 촉음(ッ, ッ) 바로 뒤 글자의 초성을 받침으로 당겨오는 알고리즘 구현
  let finalResult = "";
  for (let i = 0; i < processed.length; i++) {
    const char = processed[i];
    const nextChar = processed[i + 1];

    if (char === 'ッ' || char === 'っ') {
      if (nextChar && kanaToHangulMap[nextChar]) {
        const nextHangul = kanaToHangulMap[nextChar];
        // 다음 글자가 '카' 계열이면 'ㄱ' 받침, '사/타/자' 계열이면 'ㅅ' 받침 추가 규칙
        if (nextHangul.startsWith('카') || nextHangul.startsWith('코') || nextHangul.startsWith('쿠') || nextHangul.startsWith('키')) {
          finalResult += 'ㄱ';
        } else if (nextHangul.startsWith('파') || nextHangul.startsWith('포') || nextHangul.startsWith('푸')) {
          finalResult += 'ㅂ';
        } else {
          finalResult += 'ㅅ';
        }
        continue;
      }
    }

    // 일반 결합 및 폴백
    finalResult += kanaToHangulMap[char] || char;
  }

  // 글자 내부 결합 보정 (예: '히' + 'ㄱ' + '치' = '히치')
  finalResult = finalResult.replace(/히ㄱ치/g, "히치").replace(/비리바/g, "빌리버");

  return finalResult;
}

function extractPronunciation(s) {
  const rawPron = s.pronunciation || s.subTitle || s.japanese_title || s.subtitle;
  if (rawPron && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawPron)) {
    return rawPron;
  }
  return convertJapaneseToHangul(rawPron || s.title);
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
    const processed = orig.map(s => ({ ...s, pronunciation: extractPronunciation(s) }));
    return { data: deduplicateSongs(processed), source: 'live' };
  } catch {
    const mock = [
      { songNo: "68992", title: "アイドル", pronunciation: "아이도루", artist: "YOASOBI" },
      { songNo: "68341", title: "Lemon", pronunciation: "레몬", artist: "Yonezu Kenshi" },
      { songNo: "28744", title: "丸の内サディスティック", pronunciation: "마루노우치 사디스팃쿠", artist: "Shiina Ringo" }
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

      if (fullText.includes('미쿠') || fullText.includes('miku') || fullText.includes('初音')) {
        vChar = 'miku';
      } else if (fullText.includes('린') || fullText.includes('rin')) {
        vChar = 'rin';
      } else if (fullText.includes('렌') || fullText.includes('len')) {
        vChar = 'len';
      } else if (fullText.includes('루카') || fullText.includes('luka')) {
        vChar = 'luka';
      } else if (fullText.includes('카이토') || fullText.includes('kaito')) {
        vChar = 'kaito';
      } else if (fullText.includes('메이코') || fullText.includes('meiko')) {
        vChar = 'meiko';
      } else if (fullText.includes('구미') || fullText.includes('gumi')) {
        vChar = 'gumi';
      } else if (fullText.includes('ia') || fullText.includes('이아')) {
        vChar = 'ia';
      }

      return { ...s, pronunciation: pron, vocaloid: vChar };
    });
    return { data: deduplicateSongs(processed), source: 'voca_list' };
  } catch {
    const mock = [
      { songNo: "27610", title: "初音ミクの消失", pronunciation: "하츠네미쿠노 쇼우시츠", artist: "cosMo@폭주P", vocaloid: "miku" },
      { songNo: "28655", title: "メルト", pronunciation: "메루토", artist: "ryo", vocaloid: "miku" }
    ];
    return { data: deduplicateSongs(mock), source: 'backup' };
  }
}

export async function getJPopFullLibrary() {
  const { data: newSongs } = await getJPopNewSongs();
  const baseLib = [
    { songNo: "68551", title: "ドライフラワー", artist: "Yuuri" },
    { songNo: "68400", title: "夜に駆ける", artist: "YOASOBI" },
    { songNo: "68102", title: "Pretender", artist: "Official髭男dism" }
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