/**
 * app.js — TJ노래방 대시보드 메인 애플리케이션
 * ES Modules 방식 (index.html에서 type="module"로 로드)
 */

import {
  getJPopChart,
  getJPopNewSongs,
  getVocaloidSongs,
  getVocaloidClass,
  getRelativeDateLabel,
} from './api.js';

// ── 전역 상태 ─────────────────────────────────────────────────
const state = {
  activeTab: 'newsong',
  jpopChart: [], // J-POP 차트 상태 배열 추가
  newSongs: [],
  vocaloidSongs: [],
  filteredJpop: [], // 필터링 결과 배열 추가
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

  // URL hash 동기화
  history.replaceState(null, '', `#${tabName}`);

  // 해당 탭 데이터 로드 (아직 없을 때만 비동기 로드)
  if (tabName === 'jpopchart' && state.jpopChart.length === 0) loadJPopChart();
  if (tabName === 'newsong' && state.newSongs.length === 0) loadNewSongs();
  if (tabName === 'vocaloid' && state.vocaloidSongs.length === 0) loadVocaloid();
}

// ── 로딩 상태 표시 ───────────────────────────────────────────

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

// ── 데이터 소스 배너 ─────────────────────────────────────────

function renderSourceBanner(el, source) {
  if (!el) return;
  el.style.display = 'flex';
  if (source === 'live') {
    el.className = 'data-source-banner live';
    el.innerHTML = '🟢 &nbsp;TJ미디어 실시간 데이터';
  } else if (source === 'curated') {
    el.className = 'data-source-banner fallback';
    el.innerHTML = '📋 &nbsp;나무위키 기반 큐레이션 데이터';
  } else {
    el.className = 'data-source-banner fallback';
    el.innerHTML = '⚠️ &nbsp;오프라인 데이터 (TJ 사이트 점검 중 — 저장된 백업 표시)';
  }
}

// ── J-POP 인기 차트 로드 및 렌더링 ───────────────────────────

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
    if (statEl) statEl.textContent = `${data.length}+`;
  } catch (e) {
    if (els.jpopGrid) {
      els.jpopGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>인기 차트를 불러올 수 없습니다.</p></div>`;
    }
  }
}

function renderJPopChart(data) {
  if (!els.jpopGrid) return;

  if (data.length === 0) {
    els.jpopGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎵</span>
        <p>차트 데이터가 존재하지 않습니다.</p>
      </div>`;
    return;
  }

  els.jpopGrid.innerHTML = data.map(song => {
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    return `
      <div class="song-card fade-in-up">
        <div class="card-badges">
          <span class="badge badge-new" style="background:var(--grad-jpop); color:#fff; font-weight:bold;">🏆 TOP ${song.rank}</span>
          <span class="badge badge-genre">인기곡</span>
        </div>
        <div class="card-title">${escHtml(song.title)}</div>
        <div class="card-artist">${escHtml(song.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">
            <span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}
          </div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">
            TJ검색 ↗
          </a>
        </div>
      </div>`;
  }).join('');
}

// ── 신곡 로드 및 렌더링 ──────────────────────────────────────

async function loadNewSongs() {
  if (els.newSongGrid) showLoading('newsong-grid');

  try {
    const { data, source } = await getJPopNewSongs();

    // 2차 안전장치: 곡 번호(songNo) 기준으로 클라이언트 단에서 중복 완전 제거
    const uniqueData = Array.from(new Map(data.map(song => [song.songNo, song])).values());

    state.newSongs = uniqueData;
    state.filteredNew = [...uniqueData];
    state.source.newsong = source;

    renderNewSongs(state.filteredNew);
    renderSourceBanner(els.newSource, source);

    setTabCount('newsong', uniqueData.length);
    if (els.newCount) els.newCount.textContent = `${uniqueData.length}곡`;

    const statEl = document.getElementById('stat-newsong');
    if (statEl) statEl.textContent = `${uniqueData.length}+`;
  } catch (e) {
    if (els.newSongGrid) {
      els.newSongGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>데이터를 불러올 수 없습니다.</p></div>`;
    }
  }
}

function renderNewSongs(data) {
  if (!els.newSongGrid) return;

  if (data.length === 0) {
    els.newSongGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎵</span>
        <p>검색 결과가 없습니다.</p>
      </div>`;
    return;
  }

  els.newSongGrid.innerHTML = data.map(song => {
    const label = getRelativeDateLabel(song.addedDate);
    const isNew = song.isNew;
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    return `
      <div class="song-card fade-in-up">
        <div class="card-badges">
          ${isNew ? '<span class="badge badge-new">✨ NEW</span>' : ''}
          <span class="badge badge-date">📅 ${label}</span>
          <span class="badge badge-genre">J-POP</span>
        </div>
        <div class="card-title">${escHtml(song.title)}</div>
        <div class="card-artist">${escHtml(song.artist)}</div>
        <div class="card-footer">
          <div class="card-songno">
            <span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}
          </div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">
            TJ검색 ↗
          </a>
        </div>
      </div>`;
  }).join('');
}

function filterNewSongs() {
  let songs = [...state.newSongs];
  const kw = state.filters.newKeyword.toLowerCase();

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

// ── 보컬로이드 로드 및 렌더링 ─────────────────────────────────

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
    if (statEl) statEl.textContent = `${data.length}+`;
  } catch (e) {
    if (els.vocaGrid) {
      els.vocaGrid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>데이터를 불러올 수 없습니다.</p></div>`;
    }
  }
}

function renderVocaloid(data) {
  if (!els.vocaGrid) return;

  if (data.length === 0) {
    els.vocaGrid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎵</span>
        <p>검색 결과가 없습니다.</p>
      </div>`;
    return;
  }

  els.vocaGrid.innerHTML = data.map(song => {
    const cls = getVocaloidClass(song.vocaloid);
    const charCls = cls.split(' ')[1] || 'char-miku';
    const cardCls = cls.split(' ')[0] || 'voca-miku';
    const charName = getCharDisplayName(song.vocaloid);
    const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;

    return `
      <div class="voca-card ${cardCls} fade-in-up">
        <div class="voca-card-header">
          <span class="voca-char-badge ${charCls}">${charName}</span>
          ${song.isNew ? '<span class="voca-new-badge">✨ 신곡</span>' : ''}
        </div>
        <div class="voca-title">${escHtml(song.title)}</div>
        <div class="voca-producer">${escHtml(song.producer || song.artist)}</div>
        <div class="voca-footer">
          <div class="voca-songno">
            <span class="no-label">🎤 NO.</span>&nbsp;${escHtml(song.songNo)}
          </div>
          <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">
            TJ검색 ↗
          </a>
        </div>
      </div>`;
  }).join('');
}

function filterVocaloid() {
  let songs = [...state.vocaloidSongs];
  const kw = state.filters.vocaKeyword.toLowerCase();
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

// ── 유틸리티 함수 ─────────────────────────────────────────────

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

// ── 파티클 애니메이션 배경 효과 ──────────────────────────────────

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
  const particles = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: Math.random() * 0.4 + 0.1,
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

// ── 이벤트 바인딩 ─────────────────────────────────────────────

function bindEvents() {
  els.tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

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

// ── 초기화 실행 ───────────────────────────────────────────────

async function init() {
  if (els.lastUpdated) {
    const now = new Date();
    els.lastUpdated.textContent =
      `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} 기준`;
  }

  const hash = location.hash.slice(1);
  const initialTab = ['newsong', 'jpopchart', 'vocaloid'].includes(hash) ? hash : 'newsong';

  bindEvents();
  initParticles();
  switchTab(initialTab);
}

document.addEventListener('DOMContentLoaded', init);
