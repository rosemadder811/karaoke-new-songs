/**
 * api.js — TJ노래방 데이터 레이어
 * 하이브리드 전략: TJ 공식 API 호출 시도 → 실패 시 정적 JSON fallback
 */

// ── 상수 ─────────────────────────────────────────────────────
const TJ_BASE = 'https://www.tjmedia.com';
const PROXY_LIST = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/get?url=',
];

const TJ_URLS = {
  chartJpop: `${TJ_BASE}/tjsong/song_monthPopular.asp?strType=4`,
  chartVoca: `${TJ_BASE}/tjsong/song_monthPopular.asp?strType=4`,
  newSong: `${TJ_BASE}/tjsong/song_monthNew.asp?strType=4`, // 실시간 신곡 주소
};

const FALLBACK = {
  jpopChart: './data/jpop_chart.json',
  jpopNew: './data/jpop_new.json',
  vocaloid: './data/vocaloid_new.json',
};

const FETCH_TIMEOUT_MS = 6000;

// ── 유틸 ─────────────────────────────────────────────────────

/**
 * timeout이 있는 fetch 래퍼
 */
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT_MS) {
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

/**
 * 프록시 순서대로 시도하고 성공한 응답 텍스트 반환
 */
async function fetchViaProxy(targetUrl) {
  for (const proxy of PROXY_LIST) {
    try {
      const proxyUrl = proxy + encodeURIComponent(targetUrl);
      const res = await fetchWithTimeout(proxyUrl);
      const text = await res.text();

      if (proxy.includes('allorigins')) {
        const json = JSON.parse(text);
        return json.contents;
      }
      return text;
    } catch {
      // 다음 프록시로 계속
    }
  }
  throw new Error('모든 프록시 실패');
}

// ── HTML 파싱 ─────────────────────────────────────────────────

/**
 * TJ 인기차트 HTML → 곡 배열 파싱
 */
function parseChartHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('#BoardType1 tr, .chartList tr, table.chart tr');
  const songs = [];

  rows.forEach((row, idx) => {
    if (idx === 0) return; // 헤더 스킵
    const cols = row.querySelectorAll('td');
    if (cols.length < 3) return;

    const rankText = cols[0]?.textContent.trim();
    const songNo = cols[1]?.textContent.trim();
    const title = cols[2]?.textContent.trim();
    const artist = cols[3]?.textContent.trim() || '';

    const rank = parseInt(rankText, 10);
    if (!rank || !title) return;

    songs.push({
      rank,
      songNo,
      title,
      titleKo: title,
      artist,
      rankChange: 0,
    });
  });

  return songs;
}

/**
 * TJ 신곡 HTML → 곡 배열 파싱 (중복 제거 적용)
 */
function parseNewSongHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows = doc.querySelectorAll('#BoardType1 tr, table tr');
  const songs = [];
  const seenSongNumbers = new Set(); // 중복 곡 번호 체크용 변수 생성

  rows.forEach((row, idx) => {
    if (idx === 0) return;
    const cols = row.querySelectorAll('td');
    if (cols.length < 3) return;

    const songNo = cols[0]?.textContent.trim();
    const title = cols[1]?.textContent.trim();
    const artist = cols[2]?.textContent.trim() || '';
    const dateRaw = cols[3]?.textContent.trim() || '';

    if (!songNo || !title) return;

    // 이미 추가된 곡 번호라면 배열에 넣지 않고 패스
    if (seenSongNumbers.has(songNo)) return;
    seenSongNumbers.add(songNo);

    songs.push({
      songNo,
      title,
      titleKo: title,
      artist,
      addedDate: dateRaw || new Date().toISOString().slice(0, 10),
      genre: 'J-POP',
      isNew: true,
    });
  });

  return songs;
}

// ── 공개 API ─────────────────────────────────────────────────

export async function getJPopChart() {
  try {
    const html = await fetchViaProxy(TJ_URLS.chartJpop);
    const songs = parseChartHTML(html);
    if (songs.length > 0) {
      return { data: songs, source: 'live' };
    }
    throw new Error('파싱 결과 없음');
  } catch (err) {
    console.warn('[api] 실시간 차트 로드 실패, fallback 사용:', err.message);
  }

  const res = await fetch(FALLBACK.jpopChart);
  const json = await res.json();
  return { data: json.songs, source: 'fallback', meta: json };
}

export async function getJPopNewSongs() {
  try {
    const html = await fetchViaProxy(TJ_URLS.newSong);
    const songs = parseNewSongHTML(html);
    if (songs.length > 0) {
      return { data: songs, source: 'live' };
    }
    throw new Error('파싱 결과 없음');
  } catch (err) {
    console.warn('[api] 신곡 실시간 로드 실패, fallback 사용:', err.message);
  }

  const res = await fetch(FALLBACK.jpopNew);
  const json = await res.json();
  return { data: json.songs, source: 'fallback', meta: json };
}

export async function getVocaloidSongs() {
  const res = await fetch(FALLBACK.vocaloid);
  const json = await res.json();
  return { data: json.songs, source: 'curated', meta: json };
}

export function getVocaloidClass(vocaloidStr = '') {
  const v = vocaloidStr.toLowerCase();
  if (v.includes('初音') || v.includes('miku')) return 'voca-miku char-miku';
  if (v.includes('鏡音リン') || v.includes('rin')) return 'voca-rin char-rin';
  if (v.includes('鏡音レン') || v.includes('len')) return 'voca-len char-len';
  if (v.includes('巡音') || v.includes('luka')) return 'voca-luka char-luka';
  if (v.includes('kaito') || v.includes('KAITO')) return 'voca-kaito char-kaito';
  if (v.includes('meiko') || v.includes('MEIKO')) return 'voca-meiko char-meiko';
  if (v.includes('gumi') || v.includes('GUMI')) return 'voca-gumi char-gumi';
  if (v.includes('ia') || v.includes('IA')) return 'voca-ia char-ia';
  return 'voca-miku char-miku';
}

/**
 * 순위 변동 표시 텍스트 반환
 */
export function getRankChangeText(change) {
  if (change > 0) return { text: `▲${change}`, cls: 'up' };
  if (change < 0) return { text: `▼${Math.abs(change)}`, cls: 'down' };
  return { text: '—', cls: 'same' };
}

export function getRelativeDateLabel(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffM = (now.getFullYear() - date.getFullYear()) * 12
    + (now.getMonth() - date.getMonth());

  if (diffM === 0) return '이번 달';
  if (diffM === 1) return '지난 달';
  if (diffM <= 3) return `${diffM}달 전`;
  return dateStr.slice(0, 7).replace('-', '년 ') + '월';
}