/**
 * app.js — TJ노래방 대시보드 메인 애플리케이션
 */

import {
  getJPopNewSongs,
  getVocaloidSongs,
  getVocaloidClass,
  getRelativeDateLabel,
  getRankChangeText
} from './api.js';

const state = {
  activeTab: 'chart',
  chartSongs: [],
  newSongs: [],
  vocaloidSongs: [],
  bookmarks: JSON.parse(localStorage.getItem('tj_bookmarks')) || [],
  filteredNew: [],
  filteredVoca: [],
  filters: {
    newKeyword: '',
    newSort: 'date',
    vocaChar: 'all',
    vocaKeyword: '',
  },
};

const els = {
  tabs: document.querySelectorAll('.tab-btn'),
  sections: document.querySelectorAll('.tab-section'),
  chartGrid: document.getElementById('chart-list-grid'),
  chartCount: document.getElementById('chart-count'),
  chartSource: document.getElementById('chart-source'),
  newSongGrid: document.getElementById('newsong-grid'),
  newSource: document.getElementById('newsong-source'),
  newCount: document.getElementById('newsong-count'),
  newKeyword: document.getElementById('new-keyword'),
  newSort: document.getElementById('new-sort'),
  vocaGrid: document.getElementById('vocaloid-grid'),
  vocaCount: document.getElementById('vocaloid-count'),
  vocaKeyword: document.getElementById('voca-keyword'),
  vocaCharBtns: document.querySelectorAll('.char-chip'),
  vocaSource: document.getElementById('vocaloid-source'),
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

// ── 검색 모달 제어 함수 ──
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
        <p class="search-empty-title">곡 제목 · 가수 · 곡번호로 실시간 검색하세요</p>
      </div>`;
  }
}

function performGlobalSearch(query) {
  if (!els.modalResults) return;
  const kw = query.toLowerCase().trim();
  if (!kw) {
    els.modalResults.innerHTML = `<div class="search-initial"><p class="search-empty-title">곡 제목 · 가수 · 곡번호로 검색하세요</p></div>`;
    return;
  }

  const pool = [...state.chartSongs, ...state.newSongs, ...state.vocaloidSongs];
  const unique = [];
  const seen = new Set();
  pool.forEach(s => {
    if (!seen.has(s.songNo)) { seen.add(s.songNo); unique.push(s); }
  });

  const matches = unique.filter(s =>
    s.title.toLowerCase().includes(kw) || (s.artist || '').toLowerCase().includes(kw) || s.songNo.includes(kw)
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
          <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(s.artist)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-family:monospace; font-size:12px; font-weight:700; color:var(--accent-cyan); background:rgba(0,229,255,0.1); padding:3px 8px; border-radius:4px;">🎤 ${escHtml(s.songNo)}</span>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link" style="font-size:11px; padding:3px 6px;">TJ검색</a>
        </div>
      </div>`;
  }).join('');
}

// ── 탭 시스템 ──
function switchTab(tabName) {
  state.activeTab = tabName;
  els.tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  els.sections.forEach(sec => sec.classList.toggle('active', sec.id === `section-${tabName}`));

  if (tabName === 'chart' && state.chartSongs.length === 0) loadChartSongs();
  if (tabName === 'newsong' && state.newSongs.length === 0) loadNewSongs();
  if (tabName === 'vocaloid' && state.vocaloidSongs.length === 0) loadVocaloid();
  if (tabName === 'bookmark') renderBookmarks();
}

function updateBookmarkBadge() {
  const btn = document.querySelector('[data-tab="bookmark"] .tab-count');
  if (btn) btn.textContent = state.bookmarks.length;
}

function toggleBookmark(song) {
  const idx = state.bookmarks.findIndex(b => b.songNo === song.songNo);
  if (idx > -1) { state.bookmarks.splice(idx, 1); }
  else { state.bookmarks.push(song); }
  localStorage.setItem('tj_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkBadge();

  if (state.activeTab === 'chart') renderChartSongs(state.chartSongs);
  if (state.activeTab === 'newsong') renderNewSongs(state.filteredNew);
  if (state.activeTab === 'vocaloid') renderVocaloid(state.filteredVoca);
  if (state.activeTab === 'bookmark') renderBookmarks();
}

function renderBookmarks() {
  if (!els.bookmarkGrid) return;
  if (state.bookmarks.length === 0) {
    els.bookmarkGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">북마크된 곡이 없습니다. 별(★)을 눌러 추가해보세요!</div>`;
    return;
  }
  els.bookmarkGrid.innerHTML = state.bookmarks.map(s => {
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card">
        <button class="btn-bookmark active" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
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

// ── 데이터 연동 레이어 ──
async function loadChartSongs() {
  const mockChart = Array.from({ length: 25 }, (_, i) => ({
    rank: i + 1, title: `인기 J-POP 순위 트랙 명곡 ${i + 1}`, artist: `J-POP 아티스트`, songNo: String(76000 + i), change: i % 3 === 0 ? 1 : (i % 3 === 1 ? -1 : 0)
  }));
  state.chartSongs = mockChart;
  renderChartSongs(mockChart);
  if (els.chartCount) els.chartCount.textContent = `${mockChart.length}곡`;
  const btn = document.querySelector('[data-tab="chart"] .tab-count');
  if (btn) btn.textContent = mockChart.length;
}

function renderChartSongs(data) {
  if (!els.chartGrid) return;
  els.chartGrid.innerHTML = data.map((s, i) => {
    const ch = getRankChangeText(s.change);
    const isActive = state.bookmarks.some(b => b.songNo === s.songNo) ? 'active' : '';
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="chart-item">
        <div class="item-rank"><span class="rank-num">${s.rank}</span><span class="rank-change ${ch.cls}">${ch.text}</span></div>
        <div class="item-info">
          <div class="item-title">${escHtml(s.title)}</div>
          <div class="item-meta"><span class="item-artist">${escHtml(s.artist)}</span><span class="song-no-badge">🎤 NO. ${escHtml(s.songNo)}</span></div>
        </div>
        <div class="item-actions">
          <button class="btn-bookmark ${isActive}" data-idx="${i}">★</button>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">TJ검색 ↗</a>
        </div>
      </div>`;
  }).join('');
  els.chartGrid.querySelectorAll('.btn-bookmark').forEach(btn => {
    btn.addEventListener('click', (e) => toggleBookmark(state.chartSongs[e.target.dataset.idx]));
  });
}

async function loadNewSongs() {
  const { data } = await getJPopNewSongs();
  state.newSongs = data; state.filteredNew = [...data];
  renderNewSongs(data);
  const btn = document.querySelector('[data-tab="newsong"] .tab-count');
  if (btn) btn.textContent = data.length;
  if (els.newCount) els.newCount.textContent = `${data.length}곡`;
}

function renderNewSongs(data) {
  if (!els.newSongGrid) return;
  els.newSongGrid.innerHTML = data.map(s => {
    const isActive = state.bookmarks.some(b => b.songNo === s.songNo) ? 'active' : '';
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card">
        <button class="btn-bookmark ${isActive}" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
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
  const kw = state.filters.newKeyword.toLowerCase();
  if (kw) songs = songs.filter(s => s.title.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw) || s.songNo.includes(kw));
  if (state.filters.newSort === 'title') songs.sort((a, b) => a.title.localeCompare(b.title));
  if (state.filters.newSort === 'songno') songs.sort((a, b) => a.songNo.localeCompare(b.songNo));
  state.filteredNew = songs;
  renderNewSongs(songs);
}

async function loadVocaloid() {
  const { data } = await getVocaloidSongs();
  state.vocaloidSongs = data; state.filteredVoca = [...data];
  renderVocaloid(data);
  const btn = document.querySelector('[data-tab="vocaloid"] .tab-count');
  if (btn) btn.textContent = data.length;
  if (els.vocaCount) els.vocaCount.textContent = `${data.length}곡`;
}

function renderVocaloid(data) {
  if (!els.vocaGrid) return;
  els.vocaGrid.innerHTML = data.map(s => {
    const cls = getVocaloidClass(s.vocaloid || s.artist);
    const isActive = state.bookmarks.some(b => b.songNo === s.songNo) ? 'active' : '';
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(s.title)}`;
    return `
      <div class="song-card ${cls}">
        <button class="btn-bookmark ${isActive}" data-no="${s.songNo}">★</button>
        <div class="card-title">${escHtml(s.title)}</div>
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
  const kw = state.filters.vocaKeyword.toLowerCase();
  const chip = state.filters.vocaChar;
  if (kw) songs = songs.filter(s => s.title.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw));
  if (chip !== 'all') songs = songs.filter(s => (s.vocaloid || s.artist || '').toLowerCase().includes(chip));
  state.filteredVoca = songs;
  renderVocaloid(songs);
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
  switchTab('chart');
});