/**
 * app.js — TJ노래방 대시보드 메인 애플리케이션
 * ES Modules 방식 (index.html에서 type="module"로 로드)
 */

import {
  getJPopChart,
  getJPopNewSongs,
  getVocaloidSongs,
  getVocaloidClass,
  getRankChangeText,
  getRelativeDateLabel,
} from './api.js';

// ── 전역 상태 ─────────────────────────────────────────────────
const state = {
  activeTab:      'chart',
  chartData:      [],
  newSongs:       [],
  vocaloidSongs:  [],
  filteredNew:    [],
  filteredVoca:   [],
  isLoading:      { chart: false, newsong: false, vocaloid: false },
  source:         { chart: null, newsong: null, vocaloid: null },
  filters: {
    newKeyword:   '',
    newSort:      'date',
    vocaChar:     'all',
    vocaKeyword:  '',
  },
};

// ── DOM 참조 ─────────────────────────────────────────────────
const els = {
  tabs:         document.querySelectorAll('.tab-btn'),
  sections:     document.querySelectorAll('.tab-section'),
  // Chart
  chartTop3:    document.getElementById('chart-top3'),
  chartList:    document.getElementById('chart-list'),
  chartSource:  document.getElementById('chart-source'),
  chartCount:   document.getElementById('chart-count'),
  // New Songs
  newSongGrid:  document.getElementById('newsong-grid'),
  newSource:    document.getElementById('newsong-source'),
  newCount:     document.getElementById('newsong-count'),
  newKeyword:   document.getElementById('new-keyword'),
  newSort:      document.getElementById('new-sort'),
  // Vocaloid
  vocaGrid:     document.getElementById('vocaloid-grid'),
  vocaCount:    document.getElementById('vocaloid-count'),
  vocaKeyword:  document.getElementById('voca-keyword'),
  vocaCharBtns: document.querySelectorAll('.char-chip'),
  // Misc
  scrollTopBtn: document.getElementById('scroll-top'),
  lastUpdated:  document.getElementById('last-updated'),
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

  // 해당 탭 데이터 로드 (아직 없을 때만)
  if (tabName === 'chart'   && state.chartData.length === 0)   loadChart();
  if (tabName === 'newsong' && state.newSongs.length === 0)     loadNewSongs();
  if (tabName === 'vocaloid'&& state.vocaloidSongs.length === 0)loadVocaloid();
}

// ── 로딩 상태 ─────────────────────────────────────────────────

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
  const btn = document.querySelector(`[data-tab="${tabName}"] .tab-count`);
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
    el.innerHTML = '📋 &nbsp;나무위키 기반 큐레이션 데이터 (TJ 전체 보카로 수록곡 목록)';
  } else {
    el.className = 'data-source-banner fallback';
    el.innerHTML = '⚠️ &nbsp;오프라인 데이터 (TJ 사이트 점검 중 — 저장된 최신 데이터 표시)';
  }
}

// ── 인기차트 렌더링 ──────────────────────────────────────────

async function loadChart() {
  showLoading('chart-top3');
  if (els.chartList) els.chartList.innerHTML = '';

  try {
    const { data, source } = await getJPopChart();
    state.chartData = data;
    state.source.chart = source;
    renderChart(data);
    renderSourceBanner(els.chartSource, source);
    setTabCount('chart', data.length);
  } catch (e) {
    if (els.chartTop3) {
      els.chartTop3.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>데이터를 불러올 수 없습니다.</p></div>`;
    }
  }
}

function renderChart(data) {
  const top3   = data.slice(0, 3);
  const rest   = data.slice(3);

  // TOP 3 포디움
  if (els.chartTop3) {
    els.chartTop3.innerHTML = top3.map((song, i) => {
      const medals = ['🥇', '🥈', '🥉'];
      const { text: changeText, cls: changeCls } = getRankChangeText(song.rankChange);
      return `
        <div class="chart-podium rank-${i + 1} fade-in-up fade-in-up-delay-${i + 1}">
          <div class="podium-rank">${medals[i]}</div>
          <div class="podium-title">${escHtml(song.title)}</div>
          <div class="podium-artist">${escHtml(song.artist)}</div>
          <div class="podium-songno">
            🎤 번호&nbsp;<span>${escHtml(song.songNo)}</span>
          </div>
          <div class="rank-change ${changeCls}" style="margin-top:8px;font-size:11px">${changeText}</div>
        </div>`;
    }).join('');
  }

  // 4위 이하 리스트
  if (els.chartList) {
    els.chartList.innerHTML = rest.map(song => {
      const { text: changeText, cls: changeCls } = getRankChangeText(song.rankChange);
      const tjLink = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
      return `
        <li class="chart-item fade-in-up">
          <div class="item-rank">
            <span class="rank-num">${song.rank}</span>
            <span class="rank-change ${changeCls}">${changeText}</span>
          </div>
          <div class="item-info">
            <div class="item-title">${escHtml(song.title)}</div>
            <div class="item-meta">
              <span class="item-artist">${escHtml(song.artist)}</span>
              <span class="song-no-badge">
                <span class="no-label">NO.</span>${escHtml(song.songNo)}
              </span>
            </div>
          </div>
          <div class="item-actions">
            <a href="${tjLink}" target="_blank" rel="noopener" class="btn-tj-link">
              TJ검색 ↗
            </a>
          </div>
        </li>`;
    }).join('');
  }
}

// ── 신곡 렌더링 ──────────────────────────────────────────────

async function loadNewSongs() {
  if (els.newSongGrid) showLoading('newsong-grid');

  try {
    const { data, source } = await getJPopNewSongs();
    state.newSongs = data;
    state.filteredNew = [...data];
    state.source.newsong = source;
    renderNewSongs(state.filteredNew);
    renderSourceBanner(els.newSource, source);
    setTabCount('newsong', data.length);
    if (els.newCount) els.newCount.textContent = `${data.length}곡`;
    // Update hero stat
    const statEl = document.getElementById('stat-newsong');
    if (statEl) statEl.textContent = `${data.length}+`;
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
    const label    = getRelativeDateLabel(song.addedDate);
    const isNew    = song.isNew;
    const tjLink   = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    return `
      <div class="song-card fade-in-up">
        <div class="card-badges">
          ${isNew ? '<span class="badge badge-new">✨ NEW</span>' : ''}
          <span class="badge badge-date">📅 ${label}</span>
          <span class="badge badge-genre">J-POP</span>
        </div>
        <div class="card-title">${escHtml(song.title)}</div>
        <div class="card-title-ko">${escHtml(song.titleKo || '')}</div>
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
  const kw  = state.filters.newKeyword.toLowerCase();

  if (kw) {
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      (s.titleKo || '').toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw) ||
      s.songNo.includes(kw)
    );
  }

  const sort = state.filters.newSort;
  if (sort === 'date')   songs.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
  if (sort === 'title')  songs.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'songno') songs.sort((a, b) => parseInt(a.songNo) - parseInt(b.songNo));

  state.filteredNew = songs;
  renderNewSongs(songs);
  if (els.newCount) els.newCount.textContent = songs.length;
}

// ── 보컬로이드 렌더링 ─────────────────────────────────────────

async function loadVocaloid() {
  if (els.vocaGrid) showLoading('vocaloid-grid');

  try {
    const { data, source } = await getVocaloidSongs();
    state.vocaloidSongs = data;
    state.filteredVoca  = [...data];
    renderVocaloid(data);
    setTabCount('vocaloid', data.length);
    if (els.vocaCount) els.vocaCount.textContent = `${data.length}곡`;
    // Update hero stat
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
    const cls      = getVocaloidClass(song.vocaloid);
    const charCls  = cls.split(' ')[1] || 'char-miku';
    const cardCls  = cls.split(' ')[0] || 'voca-miku';
    const charName = getCharDisplayName(song.vocaloid);
    const tjLink   = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=4&strText=${encodeURIComponent(song.title)}`;
    const dateLabel = getRelativeDateLabel(song.addedDate);

    return `
      <div class="voca-card ${cardCls} fade-in-up">
        <div class="voca-card-header">
          <span class="voca-char-badge ${charCls}">${charName}</span>
          ${song.isNew ? '<span class="voca-new-badge">✨ 신곡</span>' : ''}
        </div>
        <div class="voca-title">${escHtml(song.title)}</div>
        <div class="voca-title-ko">${escHtml(song.titleKo || '')}</div>
        <div class="voca-producer">${escHtml(song.producer || song.artist)}</div>
        <div class="voca-footer">
          <div class="voca-songno">
            <span class="no-label ${charCls.replace('char-','').includes('miku') ? '' : ''}">🎤 NO.</span>
            &nbsp;${escHtml(song.songNo)}
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
  const kw  = state.filters.vocaKeyword.toLowerCase();
  const chr = state.filters.vocaChar;

  if (kw) {
    songs = songs.filter(s =>
      s.title.toLowerCase().includes(kw) ||
      (s.titleKo || '').toLowerCase().includes(kw) ||
      s.artist.toLowerCase().includes(kw) ||
      (s.producer || '').toLowerCase().includes(kw) ||
      s.songNo.includes(kw)
    );
  }

  if (chr !== 'all') {
    songs = songs.filter(s => {
      const v = (s.vocaloid || '').toLowerCase();
      const a = (s.artist || '').toLowerCase();
      if (chr === 'miku')  return v.includes('初音') || v.includes('miku');
      if (chr === 'rin')   return v.includes('鏡音リン') || v.includes('rin');
      if (chr === 'len')   return v.includes('鏡音レン') || v.includes('len');
      if (chr === 'luka')  return v.includes('巡音') || v.includes('luka');
      if (chr === 'kaito') return v.includes('kaito');
      if (chr === 'meiko') return v.includes('meiko');
      if (chr === 'gumi')  return v.includes('gumi');
      return true;
    });
  }

  state.filteredVoca = songs;
  renderVocaloid(songs);
  if (els.vocaCount) els.vocaCount.textContent = songs.length;
}

// ── 유틸 ─────────────────────────────────────────────────────

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCharDisplayName(vocaloid = '') {
  if (vocaloid.includes('初音') || vocaloid.toLowerCase().includes('miku'))  return '初音ミク';
  if (vocaloid.includes('鏡音リン'))  return '鏡音リン';
  if (vocaloid.includes('鏡音レン'))  return '鏡音レン';
  if (vocaloid.includes('巡音'))      return '巡音ルカ';
  if (vocaloid.includes('KAITO'))     return 'KAITO';
  if (vocaloid.includes('MEIKO'))     return 'MEIKO';
  if (vocaloid.includes('GUMI'))      return 'GUMI';
  if (vocaloid.includes('IA'))        return 'IA';
  return vocaloid;
}

// ── 파티클 애니메이션 ─────────────────────────────────────────

function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#00e5ff', '#e040fb', '#7c4dff', '#69ff47'];
  const particles = Array.from({ length: 60 }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    r:  Math.random() * 2 + 0.5,
    dx: (Math.random() - 0.5) * 0.4,
    dy: (Math.random() - 0.5) * 0.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: Math.random() * 0.5 + 0.15,
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
      if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── 이벤트 바인딩 ─────────────────────────────────────────────

function bindEvents() {
  // 탭 전환
  els.tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 신곡 키워드 필터
  if (els.newKeyword) {
    els.newKeyword.addEventListener('input', e => {
      state.filters.newKeyword = e.target.value;
      filterNewSongs();
    });
  }

  // 신곡 정렬
  if (els.newSort) {
    els.newSort.addEventListener('change', e => {
      state.filters.newSort = e.target.value;
      filterNewSongs();
    });
  }

  // 보컬로이드 키워드 필터
  if (els.vocaKeyword) {
    els.vocaKeyword.addEventListener('input', e => {
      state.filters.vocaKeyword = e.target.value;
      filterVocaloid();
    });
  }

  // 보컬로이드 캐릭터 필터 칩
  els.vocaCharBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      els.vocaCharBtns.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filters.vocaChar = chip.dataset.char;
      filterVocaloid();
    });
  });

  // 스크롤 상단 버튼
  if (els.scrollTopBtn) {
    window.addEventListener('scroll', () => {
      els.scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
    els.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// ── 초기화 ───────────────────────────────────────────────────

async function init() {
  // 현재 시간 표시
  if (els.lastUpdated) {
    const now = new Date();
    els.lastUpdated.textContent =
      `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} 기준`;
  }

  // URL hash로 초기 탭 결정
  const hash = location.hash.slice(1);
  const initialTab = ['chart','newsong','vocaloid'].includes(hash) ? hash : 'chart';

  bindEvents();
  initParticles();
  switchTab(initialTab);
}

document.addEventListener('DOMContentLoaded', init);
