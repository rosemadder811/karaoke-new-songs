/**
 * app.js — TJ노래방 대시보드 메인 애플리케이션
 * ES Modules 방식
 */

import {
  getJPopChart,
  getJPopNewSongs,
  getVocaloidSongs,
  getVocaloidClass,
  getRelativeDateLabel,
  getRankChangeText,
} from './api.js';

// ── 전역 상태 ─────────────────────────────────────────────────
const state = {
  activeTab: 'newsong',
  jpopChart: [],
  newSongs: [],
  vocaloidSongs: [],
  bookmarks: [], // 즐겨찾기 목록 저장용 배열
  filteredJpop: [],
  filteredNew: [],
  filteredVoca: [],
  isLoading: { newsong: false, jpopchart: false, vocaloid: false },
  source: { newsong: null, jpopchart: null, vocaloid: null },
  filters: {
    newKeyword: '',
    newSort: 'date',
    vocaChar: 'all',
    vocaKeyword: '',
  },
  // 모달 검색 시스템 전역 인덱싱용
  search: {
    results: [],
    selectedIndex: -1,
  }
};

// ── DOM 참조 ─────────────────────────────────────────────────
const els = {
  tabs: document.querySelectorAll('.tab-btn'),
  sections: document.querySelectorAll('.tab-section'),
  // New Songs
  newSongGrid: document.getElementById('newsong-grid'),
  newSource: document.getElementById('newsong-source'),
  newCount: document.getElementById('newsong-count'),
  newKeyword: document.getElementById('new-keyword'),
  newSort: document.getElementById('new-sort'),
  // J-POP Chart
  jpopGrid: document.getElementById('jpopchart-grid'),
  jpopSource: document.getElementById('jpopchart-source'),
  jpopCount: document.getElementById('jpopchart-count'),
  // Vocaloid
  vocaGrid: document.getElementById('vocaloid-grid'),
  vocaCount: document.getElementById('vocaloid-count'),
  vocaKeyword: document.getElementById('voca-keyword'),
  vocaCharBtns: document.querySelectorAll('.char-chip'),
  // Bookmark (신규 추가 항목)
  bookmarkGrid: document.getElementById('bookmark-grid'),
  bookmarkCount: document.getElementById('bookmark-count'),
  statBookmark: document.getElementById('stat-bookmark'),
  // 모달 엘리먼트 셋
  openSearchBtn: document.getElementById('open-search-btn'),
  closeSearchBtn: document.getElementById('close-search-btn'),
  searchModal: document.getElementById('search-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalSearchInput: document.getElementById('modal-search-input'),
  modalResults: document.getElementById('modal-search-results'),
  searchInitial: document.getElementById('search-initial-state'),
  searchEmpty: document.getElementById('search-empty-state'),
  // 공통 UI
  scrollTopBtn: document.getElementById('scroll-top'),
  lastUpdated: document.getElementById('last-updated'),
};

// ── 즐겨찾기 (LocalStorage) 핵심 제어문 ──────────────────────────

function loadBookmarks() {
  try {
    const data = localStorage.getItem('tj_dashboard_bookmarks');
    state.bookmarks = data ? JSON.parse(data) : [];
  } catch (e) {
    state.bookmarks = [];
  }
  updateBookmarkBadges();
}

function saveBookmarks() {
  localStorage.setItem('tj_dashboard_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkBadges();
}

function isBookmarked(songNo) {
  return state.bookmarks.some(s => s.songNo === songNo);
}

function toggleBookmark(song) {
  if (isBookmarked(song.songNo)) {
    state.bookmarks = state.bookmarks.filter(s => s.songNo !== song.songNo);
  } else {
    // 탭 구별 및 연동 안정성을 위해 원본 객체 복제 후 타입 주입
    const clone = { ...song };
    if (!clone.type) {
      if (clone.rank !== undefined) clone.type = 'jpop';
      else if (clone.vocaloid !== undefined) clone.type = 'voca';
      else clone.type = 'new';
    }
    state.bookmarks.push(clone);
  }
  saveBookmarks();

  // 현재 보고있는 레이아웃 화면 새로고침하여 별 마킹 즉각 반영
  if (state.activeTab === 'bookmark') renderBookmarkTab();
  else if (state.activeTab === 'newsong') renderNewSongs(state.filteredNew);
  else if (state.activeTab === 'jpopchart') renderJPopChart(state.filteredJpop);
  else if (state.activeTab === 'vocaloid') renderVocaloid(state.filteredVoca);

  // 모달이 열려 있다면 모달 결과창도 실시간 별 동기화
  if (!els.searchModal.hasAttribute('hidden')) renderModalResults();
}

function updateBookmarkBadges() {
  const count = state.bookmarks.length;
  setTabCount('bookmark', count);
  if (els.bookmarkCount) els.bookmarkCount.textContent = `${count}곡`;
  if (els.statBookmark) els.statBookmark.textContent = count;
}

function getBookmarkBtnHtml(song) {
  const activeClass = isBookmarked(song.songNo) ? 'active' : '';
  return `<button class="card-bookmark-btn ${activeClass}" data-song-no="${song.songNo}" title="즐겨찾기">⭐</button>`;
}

// ── 탭 전환 시스템 ───────────────────────────────────────────

function switchTab(tabName) {
  state.activeTab = tabName;

  els.tabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  els.sections.forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${tabName}`);
  });

  history.replaceState(null, '', `#${tabName}`);

  if (tabName === 'bookmark') renderBookmarkTab();
  if (tabName === 'jpopchart' && state.jpopChart.length === 0) loadJPopChart();
  if (tabName === 'newsong' && state.newSongs.length === 0) loadNewSongs();
  if (tabName === 'vocaloid' && state.vocaloidSongs.length === 0) loadVocaloid();
}

// ── 스피너 및 정보 바인딩 공통 유틸 ────────────────────────────

function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">TJ미디어에서 데이터를 불러오는 중...</p>
    </div>`;
}

function setTabCount(tabName, count) {
  const btn = document.getElementById(`count-badge-${tabName}`);
  if (btn) btn.textContent = count;
}

function renderSourceBanner(el, source) {
  if (!el) return;
  el.style.display = 'flex';
  if (source === 'live') {
    el.className = 'data-source-banner live';
    el.innerHTML = '🟢 &nbsp;TJ미디어 실시간 데이터 연동 중';
  } else if (source === 'curated') {
    el.className = 'data-source-banner live';
    el.innerHTML = '📋 &nbsp;나무위키 기반 큐레이션 데이터';
  } else {
    el.className = 'data-source-banner fallback';
    el.innerHTML = '⚠️ &nbsp;오프라인 백업 데이터 (TJ 홈페이지 점검 중)';
  }
}

// ── J-POP 인기 차트 핸들러 ────────────────────────────────────

async function loadJPopChart() {
  if (els.jpopGrid) showLoading('jpopchart-grid');

  try {
    const { data, source } = await getJPopChart();
    state.jpopChart = data;
    state.filteredJpop = [...data];
    state.source.jpopchart = source;

    renderJPopChart(state.filteredJpop);
    renderSourceBanner(els.jpopSource, source);

    setTabCount('jpopchart', data.length);
    if (els.jpopCount) els.jpopCount.textContent = `${data.length}곡`;

    const statEl = document.getElementById('stat-jpopchart');
    if (statEl) statEl.textContent = `${data.length}곡`;
  } catch (e) {
    if (els.jpopGrid) {
      els.jpopGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>인기 차트를 로드할 수 없습니다.</p></div>`;
    }
  }
}

function renderJPopChart(data) {
  if (!els.jpopGrid) return;

  if (data.length === 0) {
    els.jpopGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">🎵</span><p>차트 데이터가 없습니다.</p></div>`;
    return;
  }

  els.jpopGrid.innerHTML = data.map(song => {
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    const changeMeta = getRankChangeText(song.rankChange);

    return `
      <div class="song-card fade-in-up">
        ${getBookmarkBtnHtml({ ...song, type: 'jpop' })}
        <div class="card-badges">
          <span class="badge badge-new" style="background:var(--grad-jpop); color:#fff; font-weight:700;">🏆 TOP ${song.rank}</span>
          <span class="badge ${changeMeta.cls}">${changeMeta.text}</span>
        </div>
        <div class="card-title" title="${escHtml(song.title)}">${escHtml(song.title)}</div>
        <div class="card-artist" title="${escHtml(song.artist)}">${escHtml(song.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">
            <span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}
          </div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
}

// ── 최신 신곡 핸들러 ──────────────────────────────────────────

async function loadNewSongs() {
  if (els.newSongGrid) showLoading('newsong-grid');

  try {
    const { data, source } = await getJPopNewSongs();
    const uniqueData = Array.from(new Map(data.map(item => [item.songNo, item])).values());

    state.newSongs = uniqueData;
    state.filteredNew = [...uniqueData];
    state.source.newsong = source;

    renderNewSongs(state.filteredNew);
    renderSourceBanner(els.newSource, source);

    setTabCount('newsong', uniqueData.length);
    if (els.newCount) els.newCount.textContent = `${uniqueData.length}곡`;

    const statEl = document.getElementById('stat-newsong');
    if (statEl) statEl.textContent = `${uniqueData.length}곡`;
  } catch (e) {
    if (els.newSongGrid) {
      els.newSongGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>최신 신곡 데이터를 가져올 수 없습니다.</p></div>`;
    }
  }
}

function renderNewSongs(data) {
  if (!els.newSongGrid) return;

  if (data.length === 0) {
    els.newSongGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">🎵</span><p>결과 결과가 존재하지 않습니다.</p></div>`;
    return;
  }

  els.newSongGrid.innerHTML = data.map(song => {
    const label = getRelativeDateLabel(song.addedDate);
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    return `
      <div class="song-card fade-in-up">
        ${getBookmarkBtnHtml({ ...song, type: 'new' })}
        <div class="card-badges">
          ${song.isNew ? '<span class="badge badge-new">✨ NEW</span>' : ''}
          <span class="badge badge-date">📅 ${label}</span>
          <span class="badge badge-genre">J-POP</span>
        </div>
        <div class="card-title" title="${escHtml(song.title)}">${escHtml(song.title)}</div>
        <div class="card-artist" title="${escHtml(song.artist)}">${escHtml(song.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">
            <span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}
          </div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
}

function filterNewSongs() {
  let songs = [...state.newSongs];
  const kw = state.filters.newKeyword.toLowerCase().trim();

  if (kw) {
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw) ||
      s.songNo.includes(kw)
    );
  }

  const sort = state.filters.newSort;
  if (sort === 'date') songs.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
  if (sort === 'title') songs.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'songno') songs.sort((a, b) => parseInt(a.songNo) - parseInt(b.songNo));

  state.filteredNew = songs;
  renderNewSongs(songs);
  if (els.newCount) els.newCount.textContent = `${songs.length}곡`;
}

// ── 보컬로이드 수록곡 핸들러 ───────────────────────────────────

async function loadVocaloid() {
  if (els.vocaGrid) showLoading('vocaloid-grid');

  try {
    const { data, source } = await getVocaloidSongs();
    state.vocaloidSongs = data;
    state.filteredVoca = [...data];
    renderVocaloid(data);
    renderSourceBanner(document.getElementById('vocaloid-source'), source);

    setTabCount('vocaloid', data.length);
    if (els.vocaCount) els.vocaCount.textContent = `${data.length}곡`;

    const statEl = document.getElementById('stat-voca');
    if (statEl) statEl.textContent = `${data.length}곡`;
  } catch (e) {
    if (els.vocaGrid) {
      els.vocaGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>보컬로이드 DB 목록을 로드하지 못했습니다.</p></div>`;
    }
  }
}

function renderVocaloid(data) {
  if (!els.vocaGrid) return;

  if (data.length === 0) {
    els.vocaGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">🎵</span><p>매칭되는 보컬로이드 곡이 없습니다.</p></div>`;
    return;
  }

  els.vocaGrid.innerHTML = data.map(song => {
    const cls = getVocaloidClass(song.vocaloid);
    const cardCls = cls.split(' ')[0] || 'voca-miku';
    const charCls = cls.split(' ')[1] || 'char-miku';
    const charName = getCharDisplayName(song.vocaloid);
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;

    return `
      <div class="voca-card ${cardCls} fade-in-up">
        ${getBookmarkBtnHtml({ ...song, type: 'voca' })}
        <div class="voca-card-header">
          <span class="voca-char-badge ${charCls}">${charName}</span>
          ${song.isNew ? '<span class="voca-new-badge">✨ 신곡</span>' : ''}
        </div>
        <div class="voca-title" title="${escHtml(song.title)}">${escHtml(song.title)}</div>
        <div class="voca-producer" title="${escHtml(song.producer || song.artist)}">${escHtml(song.producer || song.artist)}</div>
        <div class="voca-footer">
          <div class="voca-songno">
            <span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}
          </div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
}

function filterVocaloid() {
  let songs = [...state.vocaloidSongs];
  const kw = state.filters.vocaKeyword.toLowerCase().trim();
  const chr = state.filters.vocaChar;

  if (kw) {
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw) ||
      (s.producer || '').toLowerCase().includes(kw) ||
      s.songNo.includes(kw)
    );
  }

  if (chr !== 'all') {
    songs = songs.filter(s => {
      const v = (s.vocaloid || '').toLowerCase();
      if (chr === 'miku') return v.includes('初音') || v.includes('miku');
      if (chr === 'rin') return v.includes('鏡音リン') || v.includes('rin');
      if (chr === 'len') return v.includes('鏡音レン') || v.includes('len');
      if (chr === 'luka') return v.includes('巡音') || v.includes('luka');
      if (chr === 'kaito') return v.includes('kaito');
      if (chr === 'meiko') return v.includes('meiko');
      if (chr === 'gumi') return v.includes('gumi');
      return true;
    });
  }

  state.filteredVoca = songs;
  renderVocaloid(songs);
  if (els.vocaCount) els.vocaCount.textContent = `${songs.length}곡`;
}

// ── 내 즐겨찾기 전용 섹션 렌더러 ────────────────────────────────

function renderBookmarkTab() {
  if (!els.bookmarkGrid) return;
  const data = state.bookmarks;

  if (data.length === 0) {
    els.bookmarkGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" style="color:var(--accent-gold);">⭐</span>
        <p>나만의 애창곡 목록이 비어 있습니다.</p>
        <p style="font-size:13px; color:var(--text-muted); margin-top:5px;">곡 카드의 상단 별 아이콘을 눌러 실시간 보관해 보세요!</p>
      </div>`;
    return;
  }

  els.bookmarkGrid.innerHTML = data.map(song => {
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;

    // 원래 데이터 성격에 연동한 전용 카드 분기 출력
    if (song.type === 'voca') {
      const cls = getVocaloidClass(song.vocaloid);
      const cardCls = cls.split(' ')[0] || 'voca-miku';
      const charCls = cls.split(' ')[1] || 'char-miku';
      const charName = getCharDisplayName(song.vocaloid);
      return `
        <div class="voca-card ${cardCls} fade-in-up">
          ${getBookmarkBtnHtml(song)}
          <div class="voca-card-header">
            <span class="voca-char-badge ${charCls}">${charName}</span>
          </div>
          <div class="voca-title">${escHtml(song.title)}</div>
          <div class="voca-producer">${escHtml(song.producer || song.artist)}</div>
          <div class="voca-footer">
            <div class="voca-songno"><span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}</div>
            <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
          </div>
        </div>`;
    }

    return `
      <div class="song-card fade-in-up">
        ${getBookmarkBtnHtml(song)}
        <div class="card-badges">
          <span class="badge" style="background:rgba(255,215,64,0.1); color:var(--accent-gold); border:1px solid rgba(255,215,64,0.2)">My 애창곡</span>
          ${song.rank ? `<span class="badge">차트인 TOP ${song.rank}</span>` : ''}
        </div>
        <div class="card-title">${escHtml(song.title)}</div>
        <div class="card-artist">${escHtml(song.artist)}</div>
        <div class="card-footer">
          <div class="card-songno"><span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}</div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
}

// ── 전역 모달 통합 검색 엔진 로직 (기존 방향키 연동 전량 보존) ──

function openSearchModal() {
  if (!els.searchModal) return;
  els.searchModal.removeAttribute('hidden');
  els.searchModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (els.modalSearchInput) {
    els.modalSearchInput.value = '';
    els.modalSearchInput.focus();
  }

  state.search.results = [];
  state.search.selectedIndex = -1;

  els.modalResults.innerHTML = '';
  els.searchInitial.removeAttribute('hidden');
  els.searchEmpty.setAttribute('hidden', 'true');
}

function closeSearchModal() {
  if (!els.searchModal) return;
  els.searchModal.setAttribute('hidden', 'true');
  els.searchModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function handleModalSearch(e) {
  const query = e.target.value.toLowerCase().trim();

  if (!query) {
    state.search.results = [];
    state.search.selectedIndex = -1;
    els.modalResults.innerHTML = '';
    els.searchInitial.removeAttribute('hidden');
    els.searchEmpty.setAttribute('hidden', 'true');
    return;
  }

  els.searchInitial.setAttribute('hidden', 'true');

  // 중복 조회 제거 맵 준비
  const uniqueMap = new Map();

  const searchInArr = (arr, categoryClass, catLabel) => {
    arr.forEach(s => {
      if (uniqueMap.has(s.songNo)) return;
      const t = s.title.toLowerCase();
      const a = (s.artist || s.producer || '').toLowerCase();
      if (t.includes(query) || a.includes(query) || s.songNo.includes(query)) {
        uniqueMap.set(s.songNo, { ...s, catClass: categoryClass, catLabel });
      }
    });
  };

  searchInArr(state.jpopChart, 'cat-chart', '인기차트');
  searchInArr(state.newSongs, 'cat-newsong', '최신신곡');
  searchInArr(state.vocaloidSongs, 'cat-vocaloid', '보컬로이드');

  state.search.results = Array.from(uniqueMap.values());
  state.search.selectedIndex = -1;

  if (state.search.results.length === 0) {
    els.modalResults.innerHTML = '';
    els.searchEmpty.removeAttribute('hidden');
  } else {
    els.searchEmpty.setAttribute('hidden', 'true');
    renderModalResults();
  }
}

function renderModalResults() {
  els.modalResults.innerHTML = state.search.results.map((song, i) => {
    const isSel = i === state.search.selectedIndex ? 'selected' : '';
    const activeStar = isBookmarked(song.songNo) ? 'active' : '';
    const artistText = song.producer || song.artist || '';

    return `
      <div class="search-result-item ${isSel}" data-index="${i}">
        <div class="result-left-block">
          <button class="card-bookmark-btn ${activeStar}" data-song-no="${song.songNo}" style="position:static; margin-right:8px; filter:grayscale(1) opacity(0.3)">⭐</button>
          <div class="result-info">
            <div class="result-title">${escHtml(song.title)}</div>
            <div class="result-artist">${escHtml(artistText)}</div>
          </div>
        </div>
        <div class="result-right-block">
          <div class="result-songno">${escHtml(song.songNo)}</div>
          <span class="result-tab-badge ${song.catClass}">${song.catLabel}</span>
        </div>
      </div>`;
  }).join('');

  // 별도의 외부 스크롤 추적 대응 자동 스크롤 연동
  const selEl = els.modalResults.querySelector('.search-result-item.selected');
  if (selEl) {
    selEl.scrollIntoView({ block: 'nearest' });
  }
}

function handleModalKeyDown(e) {
  const max = state.search.results.length;
  if (max === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    state.search.selectedIndex = (state.search.selectedIndex + 1) % max;
    renderModalResults();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    state.search.selectedIndex = (state.search.selectedIndex - 1 + max) % max;
    renderModalResults();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (state.search.selectedIndex >= 0 && state.search.selectedIndex < max) {
      const target = state.search.results[state.search.selectedIndex];
      const link = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(target.title)}`;
      window.open(link, '_blank', 'noopener');
    }
  }
}

// ── 에스케이프 안전 처리 유틸리티 함수군 ───────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCharDisplayName(vocaloid = '') {
  if (vocaloid.includes('初音') || vocaloid.toLowerCase().includes('miku')) return '初音미쿠';
  if (vocaloid.includes('鏡音リン')) return '鏡音린';
  if (vocaloid.includes('鏡音レン')) return '鏡音렌';
  if (vocaloid.includes('巡音')) return '巡音루카';
  if (vocaloid.includes('KAITO')) return 'KAITO';
  if (vocaloid.includes('MEIKO')) return 'MEIKO';
  if (vocaloid.includes('GUMI')) return 'GUMI';
  if (vocaloid.includes('IA')) return 'IA';
  return vocaloid;
}

// ── 파티클 배경 엔진 효과 ──────────────────────────────────────

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#00e5ff', '#e040fb', '#7c4dff', '#69ff47'];
  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: Math.random() * 0.3 + 0.1,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();

      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── 이벤트 바인딩 총합 관리 구역 ───────────────────────────────

function bindEvents() {
  // 메인 네비게이션 탭 이벤트
  els.tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 이벤트 위임 패턴을 이용해 동적으로 로드되는 모든 별 버튼 클릭 감지 통합 처리
  document.body.addEventListener('click', e => {
    const starBtn = e.target.closest('.card-bookmark-btn');
    if (!starBtn) return;

    e.stopPropagation(); // 오동작 방지
    const songNo = starBtn.dataset.songNo;

    // 현재 메모리에 적재된 컬렉션에서 대상 레코드 완전 매칭 역추적
    let found = state.bookmarks.find(s => s.songNo === songNo);
    if (!found) found = state.newSongs.find(s => s.songNo === songNo);
    if (!found) found = state.jpopChart.find(s => s.songNo === songNo);
    if (!found) found = state.vocaloidSongs.find(s => s.songNo === songNo);

    if (found) toggleBookmark(found);
  });

  // 최신 신곡 인풋 제어
  if (els.newKeyword) {
    els.newKeyword.addEventListener('input', e => {
      state.filters.newKeyword = e.target.value;
      filterNewSongs();
    });
  }
  if (els.newSort) {
    els.newSort.addEventListener('change', e => {
      state.filters.newSort = e.target.value;
      filterNewSongs();
    });
  }

  // 보컬로이드 필터 및 칩 제어
  if (els.vocaKeyword) {
    els.vocaKeyword.addEventListener('input', e => {
      state.filters.vocaKeyword = e.target.value;
      filterVocaloid();
    });
  }
  els.vocaCharBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      els.vocaCharBtns.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.vocaChar = chip.dataset.char;
      filterVocaloid();
    });
  });

  // 모달 제어 전용 이벤트 바인딩 리스트
  if (els.openSearchBtn) els.openSearchBtn.addEventListener('click', openSearchModal);
  if (els.closeSearchBtn) els.closeSearchBtn.addEventListener('click', closeSearchModal);
  if (els.modalOverlay) els.modalOverlay.addEventListener('click', closeSearchModal);

  if (els.modalSearchInput) {
    els.modalSearchInput.addEventListener('input', handleModalSearch);
    els.modalSearchInput.addEventListener('keydown', handleModalKeyDown);
  }

  // 모달 안 리스트 클릭 이벤트 대응 위임 처리
  if (els.modalResults) {
    els.modalResults.addEventListener('click', e => {
      const item = e.target.closest('.search-result-item');
      if (!item || e.target.closest('.card-bookmark-btn')) return; // 별 클릭 시 스킵

      const idx = parseInt(item.dataset.index, 10);
      const song = state.search.results[idx];
      if (song) {
        const link = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
        window.open(link, '_blank', 'noopener');
      }
    });
  }

  // 글로벌 숏컷 키 바인딩 (Ctrl + K 및 Esc 모달 클로저)
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
    }
    if (e.key === 'Escape') {
      closeSearchModal();
    }
  });

  // 탑 스크롤 버튼
  if (els.scrollTopBtn) {
    window.addEventListener('scroll', () => {
      els.scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
    els.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// ── 시스템 이니셜라이저 ───────────────────────────────────────

async function init() {
  if (els.lastUpdated) {
    const now = new Date();
    els.lastUpdated.textContent =
      `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 기준`;
  }

  const hash = location.hash.slice(1);
  const initialTab = ['newsong', 'jpopchart', 'vocaloid', 'bookmark'].includes(hash) ? hash : 'newsong';

  loadBookmarks(); // 로컬 스토리지 애창곡 최우선 복원
  bindEvents();
  initParticles();

  // 데이터 프리로드 처리로 검색 정밀성 사전 확보
  await Promise.all([loadNewSongs(), loadJPopChart(), loadVocaloid()]);

  switchTab(initialTab);
}

document.addEventListener('DOMContentLoaded', init);