/* ════════════════════════════════════════════════════════
   app.js — TJ 일본노래 검색기 메인 로직
   songs.json 구조: { id, title, artist, category, isStar, tieup }
   카테고리: "0-9/ENG" | "가~다" | "라~바" | "사~아" | "자~하" | "보컬로이드/기타"
   ════════════════════════════════════════════════════════ */

(async () => {
  /* ─── 배경 파티클 캔버스 ─── */
  initParticles();

  /* ─── 데이터 로드 ─── */
  let db = await MusicAPI.loadDatabase();
  if (db.length === 0) {
    showFatalError('songs.json 파일을 불러올 수 없습니다.<br>파일이 같은 폴더에 있는지 확인해주세요.');
    return;
  }

  /* ─── 상태 ─── */
  const state = {
    category: 'ALL',
    query: '',
    sort: 'default',
    starOnly: false,
    page: 1,
    perPage: 60,
    bookmarks: JSON.parse(localStorage.getItem('tj_bm_v2') || '[]'),
    selectedSong: null,
  };

  /* ─── DOM refs ─── */
  const $grid       = document.getElementById('songsGrid');
  const $search     = document.getElementById('searchInput');
  const $clear      = document.getElementById('searchClear');
  const $result     = document.getElementById('resultCount');
  const $total      = document.getElementById('totalCount');
  const $starCount  = document.getElementById('starCount');
  const $bmCount    = document.getElementById('bmCount');
  const $pagination = document.getElementById('pagination');
  const $sortSel    = document.getElementById('sortSelect');
  const $starOnly   = document.getElementById('starOnly');
  const $modal      = document.getElementById('modalOverlay');
  const $modalBody  = document.getElementById('modalContent');
  const $modalClose = document.getElementById('modalClose');
  const $catNav     = document.getElementById('categoryNav');

  /* ─── 초기 통계 설정 ─── */
  const totalStars = db.filter(s => s.isStar).length;
  $total.textContent = db.length.toLocaleString();
  $starCount.textContent = totalStars.toLocaleString();
  updateBmCount();

  /* ─── 카테고리 탭 동적 생성 ─── */
  buildCategoryTabs(db);

  /* ─── 카테고리 탭 이벤트 (event delegation) ─── */
  document.getElementById('categoryNav').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.category = btn.dataset.cat;
    state.page = 1;
    render();
  });

  /* ─── 검색 이벤트 ─── */
  $search.addEventListener('input', () => {
    state.query = $search.value.trim().toLowerCase();
    state.page = 1;
    $clear.classList.toggle('visible', state.query.length > 0);
    render();
  });

  $clear.addEventListener('click', () => {
    $search.value = '';
    state.query = '';
    state.page = 1;
    $clear.classList.remove('visible');
    $search.focus();
    render();
  });

  /* ─── 정렬 이벤트 ─── */
  $sortSel.addEventListener('change', () => {
    state.sort = $sortSel.value;
    state.page = 1;
    render();
  });

  /* ─── 전용곡 필터 ─── */
  $starOnly.addEventListener('change', () => {
    state.starOnly = $starOnly.checked;
    state.page = 1;
    render();
  });

  /* ─── 모달 닫기 ─── */
  $modalClose.addEventListener('click', closeModal);
  $modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ════════════════════════════════════
     FILTER + SORT
     ════════════════════════════════════ */
  function getFiltered() {
    let arr = db;

    /* 카테고리 필터 */
    if (state.category === 'BOOKMARK') {
      arr = arr.filter(s => state.bookmarks.includes(s.id));
    } else if (state.category !== 'ALL') {
      arr = arr.filter(s => s.category === state.category);
    }

    /* 전용곡 필터 */
    if (state.starOnly) arr = arr.filter(s => s.isStar);

    /* 검색어 필터 */
    if (state.query) {
      const q = state.query;
      arr = arr.filter(s =>
        s.id.includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.tieup && s.tieup.toLowerCase().includes(q))
      );
    }

    /* 정렬 */
    switch (state.sort) {
      case 'id-asc':    arr = [...arr].sort((a,b) => Number(a.id) - Number(b.id)); break;
      case 'id-desc':   arr = [...arr].sort((a,b) => Number(b.id) - Number(a.id)); break;
      case 'title-asc': arr = [...arr].sort((a,b) => a.title.localeCompare(b.title, 'ko')); break;
      case 'title-desc':arr = [...arr].sort((a,b) => b.title.localeCompare(a.title, 'ko')); break;
      default: break;
    }

    return arr;
  }

  /* ════════════════════════════════════
     MAIN RENDER
     ════════════════════════════════════ */
  function render() {
    const filtered = getFiltered();
    const total    = filtered.length;
    const pages    = Math.ceil(total / state.perPage);

    // 페이지 범위 보정
    if (state.page > pages && pages > 0) state.page = pages;

    $result.textContent = total.toLocaleString();

    // 슬라이스
    const start = (state.page - 1) * state.perPage;
    const slice = filtered.slice(start, start + state.perPage);

    // 그리드 렌더
    $grid.innerHTML = '';

    if (total === 0) {
      $grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <h3>${state.category === 'BOOKMARK' ? '즐겨찾기가 비어있어요!' : '검색 결과가 없습니다'}</h3>
          <p>${state.category === 'BOOKMARK'
            ? '카드의 ☆ 버튼을 눌러 즐겨찾기를 추가해보세요.'
            : '"' + (state.query || state.category) + '"에 해당하는 곡을 찾을 수 없습니다.'
          }</p>
        </div>`;
      $pagination.innerHTML = '';
      return;
    }

    const frag = document.createDocumentFragment();
    slice.forEach((song, i) => {
      const card = createCard(song, i);
      frag.appendChild(card);
    });
    $grid.appendChild(frag);

    // 페이지네이션
    renderPagination(pages);

    // 부드럽게 스크롤 (페이지 이동 시)
    if (state.page > 1) {
      $grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ════════════════════════════════════
     CARD FACTORY
     ════════════════════════════════════ */
  function createCard(song, animIdx) {
    const isBm = state.bookmarks.includes(song.id);
    const div  = document.createElement('div');
    div.className = `song-card${song.isStar ? ' star-card' : ''}`;
    div.style.animationDelay = `${Math.min(animIdx * 15, 400)}ms`;

    const starBadge = song.isStar
      ? `<span class="badge-star">★ 전용곡</span>`
      : '';
    const catBadge  = `<span class="badge-cat">${song.category}</span>`;

    const tieupLine = song.tieup && song.tieup !== song.title
      ? `<div class="card-tieup">📺 ${escHtml(song.tieup)}</div>`
      : '';

    div.innerHTML = `
      <div class="card-top">
        <span class="card-id">TJ ${escHtml(song.id)}</span>
        <div class="card-badges">${starBadge}${catBadge}</div>
      </div>
      <div class="card-title">${escHtml(song.title)}</div>
      ${tieupLine}
      <div class="card-bottom">
        <div class="card-artist">가수: <span>${escHtml(song.artist)}</span></div>
        <button class="bm-btn${isBm ? ' active' : ''}" data-id="${song.id}" title="${isBm ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
          ${isBm ? '⭐' : '☆'}
        </button>
      </div>`;

    /* 카드 클릭 → 모달 */
    div.addEventListener('click', e => {
      if (!e.target.closest('.bm-btn')) openModal(song);
    });

    /* 즐겨찾기 버튼 */
    div.querySelector('.bm-btn').addEventListener('click', e => {
      e.stopPropagation();
      toggleBm(song.id);
    });

    return div;
  }

  /* ════════════════════════════════════
     PAGINATION
     ════════════════════════════════════ */
  function renderPagination(pages) {
    $pagination.innerHTML = '';
    if (pages <= 1) return;

    const cur = state.page;

    const mkBtn = (label, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.className = `page-btn${active ? ' active' : ''}`;
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled && !active) {
        btn.addEventListener('click', () => { state.page = page; render(); });
      }
      return btn;
    };

    // 이전
    $pagination.appendChild(mkBtn('‹', cur - 1, cur === 1));

    // 페이지 번호 (최대 9개 표시)
    const range = buildPageRange(cur, pages);
    range.forEach(item => {
      if (item === '…') {
        const el = document.createElement('span');
        el.className = 'page-ellipsis';
        el.textContent = '…';
        $pagination.appendChild(el);
      } else {
        $pagination.appendChild(mkBtn(item, item, false, item === cur));
      }
    });

    // 다음
    $pagination.appendChild(mkBtn('›', cur + 1, cur === pages));
  }

  function buildPageRange(cur, total) {
    if (total <= 9) return Array.from({length: total}, (_, i) => i + 1);
    const pages = new Set([1, total]);
    for (let i = Math.max(2, cur - 2); i <= Math.min(total - 1, cur + 2); i++) pages.add(i);
    const sorted = [...pages].sort((a,b) => a - b);
    const result = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) result.push('…');
      result.push(p);
      prev = p;
    }
    return result;
  }

  /* ════════════════════════════════════
     MODAL
     ════════════════════════════════════ */
  function openModal(song) {
    state.selectedSong = song;
    renderModal(song);
    $modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $modal.classList.remove('open');
    document.body.style.overflow = '';
    state.selectedSong = null;
  }

  function renderModal(song) {
    const isBm = state.bookmarks.includes(song.id);
    const ytQ  = encodeURIComponent(`${song.title} ${song.artist}`);

    $modalBody.innerHTML = `
      <div class="modal-id">TJ ${escHtml(song.id)}</div>
      <div class="modal-title">${escHtml(song.title)}</div>
      <div class="modal-badges">
        ${song.isStar ? '<span class="badge-star">★ 전용곡</span>' : ''}
        <span class="badge-cat">${escHtml(song.category)}</span>
      </div>
      <div class="modal-divider"></div>
      <div class="modal-row">
        <span class="modal-label">🎤 가수</span>
        <span class="modal-value">${escHtml(song.artist)}</span>
      </div>
      <div class="modal-row">
        <span class="modal-label">📺 타이업</span>
        <span class="modal-value">${escHtml(song.tieup || '정보 없음')}</span>
      </div>
      <div class="modal-row">
        <span class="modal-label">📂 카테고리</span>
        <span class="modal-value">${escHtml(song.category)}</span>
      </div>
      <div class="modal-actions">
        <a class="btn-youtube" href="https://www.youtube.com/results?search_query=${ytQ}" target="_blank" rel="noopener">
          ▶ YouTube 검색
        </a>
        <button class="btn-bm-modal${isBm ? ' active' : ''}" id="modalBmBtn">
          ${isBm ? '⭐ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}
        </button>
      </div>`;

    document.getElementById('modalBmBtn').addEventListener('click', () => {
      toggleBm(song.id);
      renderModal(song); // 버튼 상태 새로고침
    });
  }

  /* ════════════════════════════════════
     BOOKMARK
     ════════════════════════════════════ */
  function toggleBm(id) {
    const idx = state.bookmarks.indexOf(id);
    if (idx === -1) {
      state.bookmarks.push(id);
    } else {
      state.bookmarks.splice(idx, 1);
    }
    localStorage.setItem('tj_bm_v2', JSON.stringify(state.bookmarks));
    updateBmCount();
    // 즐겨찾기 탭이라면 다시 렌더
    if (state.category === 'BOOKMARK') render();
    else {
      // 해당 카드 버튼만 업데이트
      const btn = $grid.querySelector(`.bm-btn[data-id="${id}"]`);
      if (btn) {
        const isBm = state.bookmarks.includes(id);
        btn.classList.toggle('active', isBm);
        btn.textContent = isBm ? '⭐' : '☆';
        btn.title = isBm ? '즐겨찾기 해제' : '즐겨찾기 추가';
      }
    }
  }

  function updateBmCount() {
    document.getElementById('bmCount').textContent = state.bookmarks.length.toLocaleString();
  }

  /* ════════════════════════════════════
     UTILITIES
     ════════════════════════════════════ */
  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ════════════════════════════════════
     DYNAMIC CATEGORY TABS
     ════════════════════════════════════ */
  function buildCategoryTabs(songs) {
    // 카테고리 목록 추출 (중복 제거, 정렬)
    const cats = [...new Set(songs.map(s => s.category))].sort((a, b) => {
      // "0-9/ENG" 맨 앞, "보컬로이드/기타" 맨 뒤
      if (a === '0-9/ENG') return -1;
      if (b === '0-9/ENG') return 1;
      if (a === '보컬로이드/기타') return 1;
      if (b === '보컬로이드/기타') return -1;
      return a.localeCompare(b, 'ko');
    });

    const catIcons = {
      '0-9/ENG': '🔤',
      '가~다': '가',
      '라~바': '라',
      '사~아': '사',
      '자~차': '자',
      '카~하': '카',
      '보컬로이드/기타': '🤖',
    };

    const $bookmarkBtn = $catNav.querySelector('[data-cat="BOOKMARK"]');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.dataset.cat = cat;
      const icon = catIcons[cat] || cat.charAt(0);
      const count = songs.filter(s => s.category === cat).length;
      btn.innerHTML = `<span class="cat-icon">${icon}</span> ${cat} <span class="cat-count">(${count.toLocaleString()})</span>`;
      $catNav.insertBefore(btn, $bookmarkBtn);
    });
  }

  function showFatalError(msg) {
    $grid.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><h3>데이터 로드 오류</h3><p>${msg}</p></div>`;
  }

  /* ─── 초기 렌더 ─── */
  render();

  /* ════════════════════════════════════
     BACKGROUND PARTICLES
     ════════════════════════════════════ */
  function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    const ctx    = canvas.getContext('2d');
    let W, H, particles;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function mkParticle() {
      return {
        x:  Math.random() * W,
        y:  Math.random() * H,
        r:  Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        a:  Math.random() * 0.55 + 0.05,
        hue: Math.random() < 0.7 ? 270 : Math.random() < 0.5 ? 220 : 300,
      };
    }

    function init() {
      resize();
      const count = Math.min(Math.floor((W * H) / 9000), 140);
      particles = Array.from({length: count}, mkParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${p.a})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -5) p.x = W + 5;
        if (p.x > W + 5) p.x = -5;
        if (p.y < -5) p.y = H + 5;
        if (p.y > H + 5) p.y = -5;
      }
      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', () => { resize(); });
  }

})();