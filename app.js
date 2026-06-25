/**
 * app.js — 대시보드 렌더링 및 핵심 비즈니스 로직 제어 헤드
 */

import {
  getJPopNewSongs,
  getVocaloidSongs,
  getJPopFullLibrary,
  getVocaloidClass
} from './api.js';

const state = {
  activeTab: 'newsong',
  newSongs: [],
  jpopLibSongs: [],
  vocaloidSongs: [],
  bookmarks: JSON.parse(localStorage.getItem('tj_bookmarks')) || [],
  filteredNew: [],
  filteredJpop: [],
  filteredVoca: [],
  filters: {
    newKeyword: '',
    newSort: 'date',
    jpopKeyword: '',
    vocaChar: 'all',
    vocaKeyword: '',
  },
};

const els = {
  tabs: document.querySelectorAll('.tab-btn'),
  sections: document.querySelectorAll('.tab-section'),
  newSongGrid: document.getElementById('newsong-grid'),
  newCount: document.getElementById('newsong-count'),
  newKeyword: document.getElementById('new-keyword'),
  newSort: document.getElementById('new-sort'),
  jpopGrid: document.getElementById('jpoplib-grid'),
  jpopCount: document.getElementById('jpoplib-count'),
  jpopKeyword: document.getElementById('jpop-keyword'),
  vocaGrid: document.getElementById('vocaloid-grid'),
  vocaCount: document.getElementById('vocaloid-count'),
  vocaKeyword: document.getElementById('voca-keyword'),
  vocaCharBtns: document.querySelectorAll('.char-chip'),
  bookmarkGrid: document.getElementById('bookmark-grid'),
  searchBtn: document.getElementById('global-search-btn'),
  searchModal: document.getElementById('global-search-modal'),
  modalOverlay: document.getElementById('modal-overlay-bg'),
  modalClose: document.getElementById('modal-close-btn'),
  modalInput: document.getElementById('modal-search-input'),
  modalResults: document.getElementById('modal-results-container'),
  scrollTopBtn: document.getElementById('scroll-top'),
  lastUpdated: document.getElementById('last-updated'),
};

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getUniqueList(array) {
  const seen = new Set();
  return array.filter(s => {
    if (!s || !s.songNo) return false;
    if (seen.has(s.songNo)) return false;
    seen.add(s.songNo);
    return true;
  });
}

// 실시간 통합 검색 엔진 모달
function openSearchModal() {
  if (!els.searchModal) return;
  els.searchModal.removeAttribute('hidden');
  els.searchModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => { if (els.modalInput) els.modalInput.focus(); }, 50);
}

function closeSearchModal() {
  if (!els.searchModal) return;
  els.searchModal.setAttribute('hidden', '');
  els.searchModal.style.display = 'none';
  document.body.style.overflow = '';
  if (els.modalInput) els.modalInput.value = '';
  if (els.modalResults) {
    els.modalResults.innerHTML = `
      <div class="search-initial">
        <span class="search-empty-icon">🎵</span>
        <p class="search-empty-title">곡 제목 · 한국어 발음 · 가수명으로 통합 실시간 검색</p>
      </div>`;
  }
}

function performGlobalSearch(query) {
  if (!els.modalResults) return;
  const kw = query.toLowerCase().trim();
  if (!kw) {
    els.modalResults.innerHTML = `<div class="search-initial"><p class="search-empty-title">검색어를 입력해 주세요.</p></div>`;
    return;
  }

  const pool = getUniqueList([...state.newSongs, ...state.jpopLibSongs, ...state.vocaloidSongs]);
  const matches = pool.filter(s =>
    s.title.toLowerCase().includes(kw) ||
    (s.pronunciation || '').toLowerCase().includes(kw) ||
    (s.artist || '').toLowerCase().includes(kw) ||
    s.songNo.includes(kw)
  );

  if (matches.length === 0) {
    els.modalResults.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">🔍 검색 결과가 없습니다.</div>`;
    return;
  }

  els.modalResults.innerHTML = matches.map(s => {
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="global-search-row" style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-subtle);">
        <div style="min-width:0; padding-right:8px;">
          <div style="font-size:14px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(s.title)}</div>
          <div style="font-size:11px; color:var(--accent-pink); margin-bottom: 2px;">[${escHtml(s.pronunciation)}]</div>
          <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(s.artist)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <span style="font-family:monospace; font-size:12px; font-weight:700; color:var(--accent-cyan); background:rgba(0,229,255,0.1); padding:3px 8px; border-radius:4px;">🎤 ${escHtml(s.songNo)}</span>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link" style="font-size:11px; padding:3px 6px;">TJ검색</a>
        </div>
      </div>`;
  }).join('');
}

// 대형 메인 차트 탭 스위치
function switchTab(tabName) {
  state.activeTab = tabName;
  els.tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  els.sections.forEach(sec => sec.classList.toggle('active', sec.id === `section-${tabName}`));

  if (tabName === 'newsong' && state.newSongs.length === 0) loadNewSongs();
  if (tabName === 'jpoplib' && state.jpopLibSongs.length === 0) loadJpopLibrary();
  if (tabName === 'vocaloid' && state.vocaloidSongs.length === 0) loadVocaloid();
  if (tabName === 'bookmark') renderBookmarks();
}

function updateBookmarkBadge() {
  const btn = document.querySelector('[data-tab="bookmark"] .tab-count');
  if (btn) btn.textContent = getUniqueList(state.bookmarks).length;
}

function toggleBookmark(song) {
  let list = getUniqueList(state.bookmarks);
  const idx = list.findIndex(b => b.songNo === song.songNo);
  if (idx > -1) { list.splice(idx, 1); }
  else { list.push(song); }
  state.bookmarks = list;
  localStorage.setItem('tj_bookmarks', JSON.stringify(list));
  updateBookmarkBadge();

  if (state.activeTab === 'newsong') renderNewSongs(state.filteredNew);
  if (state.activeTab === 'jpoplib') renderJpopLibrary(state.filteredJpop);
  if (state.activeTab === 'vocaloid') renderVocaloid(state.filteredVoca);
  if (state.activeTab === 'bookmark') renderBookmarks();
}

// 마이 북마크 히스토리 차트 렌더링
function renderBookmarks() {
  if (!els.bookmarkGrid) return;
  const list = getUniqueList(state.bookmarks);
  if (list.length === 0) {
    els.bookmarkGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">북마크된 곡이 없습니다. 별(★)을 눌러 나만의 북마크 차트를 채워보세요.</div>`;
    return;
  }
  els.bookmarkGrid.innerHTML = list.map(s => {
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card">
        <button class="btn-bookmark active" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
        <div class="card-pronunciation">[ ${escHtml(s.pronunciation)} ]</div>
        <div class="card-artist">${escHtml(s.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">🎤 NO. ${escHtml(s.songNo)}</div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');

  els.bookmarkGrid.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const song = state.bookmarks.find(b => b.songNo === e.target.dataset.no);
      if (song) toggleBookmark(song);
    });
  });
}

async function loadNewSongs() {
  const { data } = await getJPopNewSongs();
  const clean = getUniqueList(data);
  state.newSongs = clean; state.filteredNew = [...clean];
  renderNewSongs(clean);
  const btn = document.querySelector('[data-tab="newsong"] .tab-count');
  if (btn) btn.textContent = clean.length;
  if (els.newCount) els.newCount.textContent = `${clean.length}곡`;
}

function renderNewSongs(data) {
  if (!els.newSongGrid) return;
  const clean = getUniqueList(data);
  els.newSongGrid.innerHTML = clean.map(s => {
    const isActive = state.bookmarks.some(b => b.songNo === s.songNo) ? 'active' : '';
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card">
        <button class="btn-bookmark ${isActive}" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
        <div class="card-pronunciation">[ ${escHtml(s.pronunciation)} ]</div>
        <div class="card-artist">${escHtml(s.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">🎤 NO. ${escHtml(s.songNo)}</div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
  els.newSongGrid.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const song = state.newSongs.find(s => s.songNo === e.target.dataset.no);
      if (song) toggleBookmark(song);
    });
  });
}

function filterNewSongs() {
  let songs = [...state.newSongs];
  const kw = state.filters.newKeyword.toLowerCase().trim();
  if (kw) songs = songs.filter(s => s.title.toLowerCase().includes(kw) || s.pronunciation.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw) || s.songNo.includes(kw));
  if (state.filters.newSort === 'title') songs.sort((a, b) => a.title.localeCompare(b.title));
  if (state.filters.newSort === 'songno') songs.sort((a, b) => a.songNo.localeCompare(b.songNo));
  state.filteredNew = getUniqueList(songs);
  renderNewSongs(state.filteredNew);
}

async function loadJpopLibrary() {
  const data = await getJPopFullLibrary();
  const clean = getUniqueList(data);
  state.jpopLibSongs = clean; state.filteredJpop = [...clean];
  renderJpopLibrary(clean);
  const btn = document.querySelector('[data-tab="jpoplib"] .tab-count');
  if (btn) btn.textContent = clean.length;
  if (els.jpopCount) els.jpopCount.textContent = `${clean.length}곡`;
}

function renderJpopLibrary(data) {
  if (!els.jpopGrid) return;
  const clean = getUniqueList(data);
  if (clean.length === 0) {
    els.jpopGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);">검색 조건에 맞는 J-POP 수록곡이 없습니다.</div>`;
    return;
  }
  els.jpopGrid.innerHTML = clean.map(s => {
    const isActive = state.bookmarks.some(b => b.songNo === s.songNo) ? 'active' : '';
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card">
        <button class="btn-bookmark ${isActive}" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
        <div class="card-pronunciation">[ ${escHtml(s.pronunciation)} ]</div>
        <div class="card-artist">${escHtml(s.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">🎤 NO. ${escHtml(s.songNo)}</div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
  els.jpopGrid.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const song = state.jpopLibSongs.find(s => s.songNo === e.target.dataset.no);
      if (song) toggleBookmark(song);
    });
  });
}

function filterJpopLibrary() {
  let songs = [...state.jpopLibSongs];
  const kw = state.filters.jpopKeyword.toLowerCase().trim();
  if (kw) {
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      s.pronunciation.toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw) ||
      s.songNo.includes(kw)
    );
  }
  state.filteredJpop = getUniqueList(songs);
  renderJpopLibrary(state.filteredJpop);
}

async function loadVocaloid() {
  const { data } = await getVocaloidSongs();
  const clean = getUniqueList(data);
  state.vocaloidSongs = clean; state.filteredVoca = [...clean];
  renderVocaloid(clean);
  const btn = document.querySelector('[data-tab="vocaloid"] .tab-count');
  if (btn) btn.textContent = clean.length;
  if (els.vocaCount) els.vocaCount.textContent = `${clean.length}곡`;
}

function renderVocaloid(data) {
  if (!els.vocaGrid) return;
  const clean = getUniqueList(data);
  if (clean.length === 0) {
    els.vocaGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);">선택하신 보컬로이드 종류에 매핑된 곡이 없습니다.</div>`;
    return;
  }
  els.vocaGrid.innerHTML = clean.map(s => {
    const cls = getVocaloidClass(s.vocaloid);
    const isActive = state.bookmarks.some(b => b.songNo === s.songNo) ? 'active' : '';
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card ${cls}">
        <button class="btn-bookmark ${isActive}" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
        <div class="card-pronunciation">[ ${escHtml(s.pronunciation)} ]</div>
        <div class="card-artist">${escHtml(s.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">🎤 NO. ${escHtml(s.songNo)}</div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
  els.vocaGrid.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const song = state.vocaloidSongs.find(s => s.songNo === e.target.dataset.no);
      if (song) toggleBookmark(song);
    });
  });
}

function filterVocaloid() {
  let songs = [...state.vocaloidSongs];
  const kw = state.filters.vocaKeyword.toLowerCase().trim();
  const chip = state.filters.vocaChar.toLowerCase().trim();

  if (kw) {
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      s.pronunciation.toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw)
    );
  }

  if (chip !== 'all') {
    // 규격화된 소문자 식별 매칭 규칙 엄수
    songs = songs.filter(s => s.vocaloid === chip);
  }

  state.filteredVoca = getUniqueList(songs);
  renderVocaloid(state.filteredVoca);
}

function bindEvents() {
  els.tabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  if (els.searchBtn) els.searchBtn.addEventListener('click', (e) => { e.preventDefault(); openSearchModal(); });
  if (els.modalClose) els.modalClose.addEventListener('click', closeSearchModal);
  if (els.modalOverlay) els.modalOverlay.addEventListener('click', closeSearchModal);

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (els.searchModal?.hasAttribute('hidden')) openSearchModal(); else closeSearchModal(); }
    if (e.key === 'Escape') closeSearchModal();
  });

  if (els.modalInput) els.modalInput.addEventListener('input', (e) => performGlobalSearch(e.target.value));
  if (els.newKeyword) els.newKeyword.addEventListener('input', e => { state.filters.newKeyword = e.target.value; filterNewSongs(); });
  if (els.newSort) els.newSort.addEventListener('change', e => { state.filters.newSort = e.target.value; filterNewSongs(); });
  if (els.jpopKeyword) els.jpopKeyword.addEventListener('input', e => { state.filters.jpopKeyword = e.target.value; filterJpopLibrary(); });
  if (els.vocaKeyword) els.vocaKeyword.addEventListener('input', e => { state.filters.vocaKeyword = e.target.value; filterVocaloid(); });

  els.vocaCharBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      els.vocaCharBtns.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.vocaChar = chip.dataset.char;
      filterVocaloid();
    });
  });

  if (els.scrollTopBtn) {
    window.addEventListener('scroll', () => { els.scrollTopBtn.classList.toggle('visible', window.scrollY > 400); });
    els.scrollTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (els.lastUpdated) { const now = new Date(); els.lastUpdated.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`; }
  bindEvents();
  updateBookmarkBadge();
  switchTab('newsong');
});