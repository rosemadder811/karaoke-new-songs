/**
 * app.js — TJ노래방 대시보드 메인 애플리케이션
 */

import {
  getJPopSongs,
  getJPopNewSongs,
  getVocaloidSongs,
  getVocaloidClass,
  getRelativeDateLabel,
} from './api.js';

// ── 전역 상태 ─────────────────────────────────────────────────
const state = {
  activeTab: 'jpop',
  jpopSongs: [],
  newSongs: [],
  vocaloidSongs: [],
  filteredJpop: [],
  filteredNew: [],
  filteredVoca: [],
  source: { jpop: null, newsong: null, vocaloid: null },
  filters: {
    jpopKeyword: '',
    newKeyword: '',
    newSort: 'date',
    vocaChar: 'all',
    vocaKeyword: '',
  },
};

// ── DOM 참조 ─────────────────────────────────────────────────
const els = {
  tabs: document.querySelectorAll('.tab-btn'),
  sections: document.querySelectorAll('.tab-section'),
  // J-POP 가수별 목록
  jpopContainer: document.getElementById('jpop-list-container'),
  jpopSource: document.getElementById('jpop-source'),
  jpopCount: document.getElementById('jpop-count'),
  jpopKeyword: document.getElementById('jpop-keyword'),
  // New Songs
  newSongGrid: document.getElementById('newsong-grid'),
  newSource: document.getElementById('newsong-source'),
  newCount: document.getElementById('newsong-count'),
  newKeyword: document.getElementById('new-keyword'),
  newSort: document.getElementById('new-sort'),
  // Vocaloid
  vocaGrid: document.getElementById('vocaloid-grid'),
  vocaCount: document.getElementById('vocaloid-count'),
  vocaKeyword: document.getElementById('voca-keyword'),
  vocaCharBtns: document.querySelectorAll('.char-chip'),
  // Misc
  scrollTopBtn: document.getElementById('scroll-top'),
  lastUpdated: document.getElementById('last-updated'),
};

// ── 탭 전환 ─────────────────────────────────────────────────
function switchTab(tabName) {
  state.activeTab = tabName;

  els.tabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  els.sections.forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${tabName}`);
  });

  if (tabName === 'jpop' && state.jpopSongs.length === 0) loadJpopLibrary();
  if (tabName === 'newsong' && state.newSongs.length === 0) loadNewSongs();
  if (tabName === 'vocaloid' && state.vocaloidSongs.length === 0) loadVocaloid();
}

function showLoading(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-container" style="text-align:center; padding:20px;">
      <div class="loading-spinner" style="margin:0 auto 8px; width:24px; height:24px; border:2.5px solid rgba(255,255,255,0.1); border-top-color:var(--accent-cyan); border-radius:50%; animation: spin 1s linear infinite;"></div>
      <p style="color:var(--text-secondary); font-size:12px;">데이터 라이브러리를 가공 중입니다...</p>
    </div>`;
}

function setTabCount(tabName, count) {
  const btn = document.querySelector(`[data-tab="${tabName}"] .tab-count`);
  if (btn) btn.textContent = count;
}

function renderSourceBanner(el, source) {
  if (!el) return;
  el.style.display = 'flex';
  el.className = 'data-source-banner fallback';
  if (source === 'offline_library') {
    el.innerHTML = '📋 &nbsp;오프라인 J-POP 라이브러리 목록 최적화 활성화 완료';
  } else {
    el.innerHTML = '⚡ &nbsp;보관 데이터 기반 로컬 대시보드 구동 중';
  }
}

// ── 1) J-POP 가수별 목록 렌더링 ────────────────────
async function loadJpopLibrary() {
  showLoading(els.jpopContainer);
  try {
    const { data, source } = await getJPopSongs();
    state.jpopSongs = data;
    state.filteredJpop = [...data];
    state.source.jpop = source;

    renderJpopGroups(state.filteredJpop);
    renderSourceBanner(els.jpopSource, source);
    setTabCount('jpop', data.length);
    if (els.jpopCount) els.jpopCount.textContent = `${data.length}곡`;

    const heroStat = document.getElementById('stat-jpop');
    if (heroStat) heroStat.textContent = `${data.length}곡`;
  } catch (e) {
    if (els.jpopContainer) {
      els.jpopContainer.innerHTML = `<p style="color:red; text-align:center; font-size:13px;">J-POP 목록 로드 실패</p>`;
    }
  }
}

function renderJpopGroups(songs) {
  if (!els.jpopContainer) return;
  if (songs.length === 0) {
    els.jpopContainer.innerHTML = `<div class="empty-state" style="text-align:center;padding:20px;"><p style="color:var(--text-muted); font-size:13px;">검색 결과가 없습니다.</p></div>`;
    return;
  }

  const groups = {};
  songs.forEach(song => {
    const artist = song.artist || '기타/미분류';
    if (!groups[artist]) groups[artist] = [];
    groups[artist].push(song);
  });

  let html = '';
  Object.keys(groups).sort().forEach(artist => {
    const artistSongs = groups[artist];
    html += `
      <div class="artist-card" style="background:var(--bg-card); border-radius:8px; padding:12px; margin-bottom:10px; border:1px solid var(--border-subtle)">
        <h3 class="artist-title" style="font-size:14px; font-weight:700; color:var(--accent-cyan); margin-bottom:8px; display:flex; justify-content:between; align-items:center;">
          👨‍🎤 ${escHtml(artist)} 
          <span style="font-size:11px; background:rgba(0,229,255,0.08); padding:1px 6px; border-radius:8px; margin-left:6px;">${artistSongs.length}곡</span>
        </h3>
        <div class="artist-songs-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:6px;">
          ${artistSongs.map(s => `
            <div class="jpop-song-item" style="background:rgba(255,255,255,0.015); padding:6px 8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(255,255,255,0.03);">
              <div style="min-width:0; padding-right:6px;">
                <div class="card-title" style="font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-primary);" title="${escHtml(s.title)}">${escHtml(s.title)}</div>
                ${s.titleKo ? `<div class="card-title-ko" style="font-size:11px; color:var(--text-muted); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escHtml(s.titleKo)}</div>` : ''}
              </div>
              <span style="font-family:monospace; font-size:11px; font-weight:700; color:var(--accent-gold); background:rgba(255,215,64,0.06); padding:1px 4px; border-radius:3px; flex-shrink:0;">🎤 ${escHtml(s.songNo)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  els.jpopContainer.innerHTML = html;
}

function filterJpopSongs() {
  const kw = state.filters.jpopKeyword.toLowerCase().trim();
  if (!kw) {
    state.filteredJpop = [...state.jpopSongs];
  } else {
    state.filteredJpop = state.jpopSongs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      (s.titleKo || '').toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw) ||
      s.songNo.includes(kw)
    );
  }
  renderJpopGroups(state.filteredJpop);
  if (els.jpopCount) els.jpopCount.textContent = `${state.filteredJpop.length}곡`;
}

// ── 2) 신곡 업데이트 렌더링 ────────────────────────────────────
async function loadNewSongs() {
  if (els.newSongGrid) showLoading(els.newSongGrid);
  try {
    const { data, source } = await getJPopNewSongs();
    state.newSongs = data;
    state.filteredNew = [...data];
    state.source.newsong = source;
    renderNewSongs(state.filteredNew);
    renderSourceBanner(els.newSource, source);
    setTabCount('newsong', data.length);
    if (els.newCount) els.newCount.textContent = `${data.length}곡`;

    const statEl = document.getElementById('stat-newsong');
    if (statEl) statEl.textContent = `${data.length}+`;
  } catch (e) {
    if (els.newSongGrid) els.newSongGrid.innerHTML = `<p style="font-size:12px;">신곡 로드 실패</p>`;
  }
}

function renderNewSongs(data) {
  if (!els.newSongGrid) return;
  if (data.length === 0) {
    els.newSongGrid.innerHTML = `<div class="empty-state"><p style="font-size:12px;">검색 결과가 없습니다.</p></div>`;
    return;
  }
  els.newSongGrid.innerHTML = data.map(song => {
    const label = getRelativeDateLabel(song.addedDate);
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    return `
      <div class="song-card compact">
        <div class="card-badges">
          <span class="badge badge-date">📅 ${label}</span>
        </div>
        <div class="card-title">${escHtml(song.title)}</div>
        ${song.titleKo ? `<div class="card-title-ko">${escHtml(song.titleKo)}</div>` : ''}
        <div class="card-artist">${escHtml(song.artist)}</div>
        <div class="card-footer" style="display:flex; justify-content:space-between; margin-top:6px; align-items:center;">
          <div class="card-songno" style="color:var(--accent-green); font-size:11px; font-weight:700;">🎤 ${escHtml(song.songNo)}</div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link" style="color:var(--accent-cyan); font-size:11px;">검색 ↗</a>
        </div>
      </div>`;
  }).join('');
}

function filterNewSongs() {
  let songs = [...state.newSongs];
  const kw = state.filters.newKeyword.toLowerCase();
  if (kw) {
    songs = songs.filter(s => s.title.toLowerCase().includes(kw) || (s.titleKo || '').toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw) || s.songNo.includes(kw));
  }
  if (state.filters.newSort === 'title') songs.sort((a, b) => a.title.localeCompare(b.title));
  if (state.filters.newSort === 'songno') songs.sort((a, b) => a.songNo.localeCompare(b.songNo));
  renderNewSongs(songs);
}

// ── 3) 보컬로이드 렌더링 ──────────────────────────────────────
async function loadVocaloid() {
  if (els.vocaGrid) showLoading(els.vocaGrid);
  try {
    const { data, source } = await getVocaloidSongs();
    state.vocaloidSongs = data;
    state.filteredVoca = [...data];
    state.source.vocaloid = source;
    renderVocaloid(state.filteredVoca);
    renderSourceBanner(document.getElementById('vocaloid-source'), source);
    setTabCount('vocaloid', data.length);
    if (els.vocaCount) els.vocaCount.textContent = `${data.length}곡`;

    const statEl = document.getElementById('stat-voca');
    if (statEl) statEl.textContent = `${data.length}곡`;
  } catch (e) {
    if (els.vocaGrid) els.vocaGrid.innerHTML = `<p style="font-size:12px;">보컬로이드 로드 실패</p>`;
  }
}

function renderVocaloid(data) {
  if (!els.vocaGrid) return;
  if (data.length === 0) {
    els.vocaGrid.innerHTML = `<div class="empty-state"><p style="font-size:12px;">결과 없음</p></div>`;
    return;
  }
  els.vocaGrid.innerHTML = data.map(song => {
    const cls = getVocaloidClass(song.vocaloid || song.artist);
    return `
      <div class="song-card compact ${cls}">
        <div class="card-title">${escHtml(song.title)}</div>
        ${song.titleKo ? `<div class="card-title-ko" style="font-size:11px; opacity:0.6; margin-bottom:2px;">${escHtml(song.titleKo)}</div>` : ''}
        <div class="card-artist">${escHtml(song.artist || '보컬로이드')}</div>
        <div style="font-size:11px; color:var(--accent-pink); margin-top:5px; font-weight:700;">🎤 NO. ${escHtml(song.songNo)}</div>
      </div>`;
  }).join('');
}

function filterVocaloid() {
  let songs = [...state.vocaloidSongs];
  const kw = state.filters.vocaKeyword.toLowerCase();
  const chip = state.filters.vocaChar;

  if (kw) {
    songs = songs.filter(s => s.title.toLowerCase().includes(kw) || (s.titleKo || '').toLowerCase().includes(kw) || (s.artist || '').toLowerCase().includes(kw) || s.songNo.includes(kw));
  }
  if (chip !== 'all') {
    songs = songs.filter(s => {
      const target = (s.vocaloid || s.artist || '').toLowerCase();
      if (chip === 'kaito') return target.includes('kaito') || target.includes('meiko');
      return target.includes(chip);
    });
  }
  renderVocaloid(songs);
  if (els.vocaCount) els.vocaCount.textContent = `${songs.length}곡`;
}

// ── 유틸 및 이벤트 바인딩 ─────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function bindEvents() {
  els.tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  if (els.jpopKeyword) {
    els.jpopKeyword.addEventListener('input', e => {
      state.filters.jpopKeyword = e.target.value;
      filterJpopSongs();
    });
  }

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

  if (els.scrollTopBtn) {
    window.addEventListener('scroll', () => {
      els.scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
    els.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

async function init() {
  if (els.lastUpdated) {
    const now = new Date();
    els.lastUpdated.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  }
  bindEvents();
  loadJpopLibrary();
}

document.addEventListener('DOMContentLoaded', init);