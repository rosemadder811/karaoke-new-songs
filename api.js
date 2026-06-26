/**
 * api.js — 데이터 통합 파싱 및 정제 계층 (메이코 및 예외 문자열 완전 매칭)
 */

const FALLBACK = {
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json'
};

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
  'ば': '바', 'び': '비', 'ぶ': '부', 'べ': '베', 'ぼ': '보', 'バ': '바', 'ビ': '비', 'ブ': '부', 'ベ': '베', '放': '보',
  'ぱ': '파', 'ぴ': '피', 'ぷ': '푸', 'ぺ': '페', 'ぽ': '포', 'パ': '파', 'ピ': '피', 'プ': '푸', 'ペ': '페', 'ポ': '포'
};

const complexKanaMap = {
  'きゃ': '캬', 'きゅ': '큐', 'きょ': '쿄', 'キャ': '캬', 'キュ': '큐', 'キョ': '쿄',
  'しゃ': '샤', 'しゅ': '슈', 'しょ': '쇼', 'シャ': '샤', 'シュ': '슈', 'ショ': '쇼',
  'ちゃ': '차', 'ちゅ': '추', 'ちょ': '초', 'チャ': '차', 'チュ': '추', 'チョ': '초',
  'ぎゃ': '갸', 'ぎゅ': '규', 'ぎょ': '교', 'ギャ': '갸', 'ギュ': '규', 'ギョ': '교',
  'じゃ': '자', 'じゅ': '주', 'じょ': '조', 'ジャ': '자', 'ジュ': '주', 'ジョ': '조'
};

const kanjiToHangulMap = {
  '桜': '사쿠라', '悪魔': '아쿠마', '踊': '오도', '方': '가타', '神様': '카미사마', '神': '카미',
  '名残': '나고리', '初音': '하츠네', '消失': '쇼우시츠', '夜': '요루', '駆': '카케', '恋': '코이'
};

const englishToHangulMap = {
  'hitchcock': '히치코크', 'believer': '빌리버', 'lemon': '레몬', 'pretender': '프리텐더', 'kick back': '킥백'
};

function convertJapaneseToHangul(text) {
  if (!text) return "";
  let processed = String(text).trim();
  let lowercaseText = processed.toLowerCase();

  for (const [eng, kor] of Object.entries(englishToHangulMap)) {
    if (lowercaseText.includes(eng)) processed = processed.replace(new RegExp(eng, 'gi'), kor);
  }
  for (const [kanji, hangul] of Object.entries(kanjiToHangulMap)) {
    processed = processed.split(kanji).join(hangul);
  }
  for (const [doubleKana, hangul] of Object.entries(complexKanaMap)) {
    processed = processed.split(doubleKana).join(hangul);
  }

  processed = processed.replace(/[ー〜]/g, '');

  let finalResult = "";
  for (let i = 0; i < processed.length; i++) {
    const char = processed[i];
    const nextChar = processed[i + 1];
    if (char === 'ッ' || char === 'っ') {
      if (nextChar && kanaToHangulMap[nextChar]) {
        const nextHangul = kanaToHangulMap[nextChar];
        if (nextHangul.startsWith('카') || nextHangul.startsWith('코') || nextHangul.startsWith('키')) finalResult += 'ㄱ';
        else if (nextHangul.startsWith('파') || nextHangul.startsWith('포')) finalResult += 'ㅂ';
        else finalResult += 'ㅅ';
        continue;
      }
    }
    finalResult += kanaToHangulMap[char] || char;
  }
  return finalResult.replace(/히ㄱ치/g, "히치").replace(/비리바/g, "빌리버");
}

function extractPronunciation(s) {
  const rawPron = s.pronunciation || s.subTitle || s.japanese_title || s.subtitle;
  if (rawPron && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(rawPron)) return rawPron;
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
    const processed = orig.map(s => ({ ...s, pronunciation: extractPronunciation(s), addedDate: s.addedDate || "2026-06-20" }));
    return { data: deduplicateSongs(processed) };
  } catch {
    const mock = [
      { songNo: "68992", title: "アイドル", pronunciation: "아이도루", artist: "YOASOBI", addedDate: "2026-06-25" },
      { songNo: "68341", title: "Lemon", pronunciation: "레몬", artist: "Yonezu Kenshi", addedDate: "2026-05-10" },
      { songNo: "28744", title: "丸の内サディスティック", pronunciation: "마루노우치 사디스팃쿠", artist: "Shiina Ringo", addedDate: "2026-04-15" }
    ];
    return { data: deduplicateSongs(mock) };
  }
}

export async function getVocaloidSongs() {
  try {
    const res = await fetchWithTimeout(FALLBACK.vocaloid);
    const data = await res.json();
    const orig = data.songs || data || [];

    const processed = orig.map(s => {
      const pron = extractPronunciation(s);

      // 검색 범위 극대화를 위해 공백 및 하이픈 등 기호를 제거하고 전부 소문자 처리
      const fullText = (String(s.title) + " " + String(s.artist) + " " + String(s.vocaloid || "")).toLowerCase().replace(/[\s\-_]+/g, '');
      let vChar = "miku";

      // 보컬로이드 캐릭터 세부 식별 알고리즘 (메이코 완벽 보정)
      if (fullText.includes('미쿠') || fullText.includes('miku') || fullText.includes('初音') || fullText.includes('ミク')) {
        vChar = 'miku';
      } else if (fullText.includes('린') || fullText.includes('rin') || fullText.includes('鏡音リン') || fullText.includes('リン')) {
        vChar = 'rin';
      } else if (fullText.includes('렌') || fullText.includes('len') || fullText.includes('鏡音レン') || fullText.includes('レン')) {
        vChar = 'len';
      } else if (fullText.includes('루카') || fullText.includes('luka') || fullText.includes('巡音ルカ') || fullText.includes('ルカ')) {
        vChar = 'luka';
      } else if (fullText.includes('카이토') || fullText.includes('kaito') || fullText.includes('カイト')) {
        vChar = 'kaito';
      } else if (fullText.includes('메이코') || fullText.includes('meiko') || fullText.includes('メイコ')) {
        vChar = 'meiko';
      } else if (fullText.includes('구미') || fullText.includes('gumi') || fullText.includes('グミ') || fullText.includes('megpoid')) {
        vChar = 'gumi';
      } else if (fullText.includes('ia') || fullText.includes('이아') || fullText.includes('イア')) {
        vChar = 'ia';
      }

      return { ...s, pronunciation: pron, vocaloid: vChar, addedDate: s.addedDate || "2026-06-15" };
    });
    return { data: deduplicateSongs(processed) };
  } catch {
    const mock = [
      { songNo: "27610", title: "初音ミクの消失", pronunciation: "하츠네미쿠노 쇼우시츠", artist: "cosMo@폭주P", vocaloid: "miku", addedDate: "2026-06-24" },
      { songNo: "28655", title: "メルト", pronunciation: "메루토", artist: "ryo", vocaloid: "miku", addedDate: "2026-03-01" },
      // 메이코 예시 데이터 (테스트용)
      { songNo: "30512", title: "悪食娘コンチタ", pronunciation: "아쿠지키무스메 콘치타", artist: "mothy", vocaloid: "meiko", addedDate: "2026-06-14" }
    ];
    return { data: deduplicateSongs(mock) };
  }
}

export async function getJPopFullLibrary() {
  const { data: newSongs } = await getJPopNewSongs();
  const baseLib = [
    { songNo: "68551", title: "ドライフラワー", artist: "Yuuri", addedDate: "2025-11-20" },
    { songNo: "68400", title: "夜に駆ける", artist: "YOASOBI", addedDate: "2025-08-14" },
    { songNo: "68102", title: "Pretender", artist: "Official髭男dism", addedDate: "2025-05-01" }
  ];
  const mappedBase = baseLib.map(s => ({ ...s, pronunciation: extractPronunciation(s) }));
  return deduplicateSongs([...newSongs, ...mappedBase]);
}