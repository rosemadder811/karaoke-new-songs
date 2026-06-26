/* ════════════════════════════════════════════════════════
   app.js — 개편된 대분류/소목록 및 한국어 발음 통합 검색 엔진
   ════════════════════════════════════════════════════════ */

(async () => {
  initParticles();

  let db = await MusicAPI.loadDatabase();
  if (db.length === 0) {
    document.getElementById('songsGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:50px;">데이터 로드에 실패했습니다. songs.json 파일 위치를 확인하세요.</div>';
    return;
  }

  /* ─── 상태 컨트롤러 ─── */
  const state = {
    category: 'animation',  // animation, jpop, vocaloid, BOOKMARK
    subGroup: 'ALL',        // 소목록 필터 타겟값
    query: '',
    sort: 'default',
    starOnly: false,
    page: 1,
    perPage: 30,
    bookmarks: JSON.parse(localStorage.getItem('tj_bm_v2') || '[]')
  };

  /* ─── DOM 참조 객체 ─── */
  const $grid = document.getElementById('songsGrid');
  const $search = document.getElementById('searchInput');
  const $clear = document.getElementById('searchClear');
  const $result = document.getElementById('resultCount');
  const $total = document.getElementById('totalCount');
  const $starCount = document.getElementById('starCount');
  const $bmCount = document.getElementById('bmCount');
  const $pagination = document.getElementById('pagination');
  const $sortSel = document.getElementById('sortSelect');
  const $starOnly = document.getElementById('starOnly');
  const $modal = document.getElementById('modalOverlay');
  const $modalBody = document.getElementById('modalContent');
  const $modalClose = document.getElementById('modalClose');
  const $subSidebar = document.getElementById('subSidebar');
  const $sidebarTitle = document.getElementById('sidebarTitle');
  const $subList = document.getElementById('subList');

  // 상단 스펙 통계 세팅
  $total.textContent = db.length.toLocaleString();
  $starCount.textContent = db.filter(s => s.isStar).length.toLocaleString();
  $bmCount.textContent = state.bookmarks.length.toLocaleString();

  // 최초 사이드바 유효성 트리거 초기화
  switchCategory(state.category);

  /* ─── 대분류 탭 이벤트 위임 ─── */
  document.getElementById('categoryNav').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.category = btn.dataset.cat;
    state.subGroup = 'ALL';
    state.page = 1;
    switchCategory(state.category);
  });

  function switchCategory(cat) {
    if (cat === 'jpop' || cat === 'vocaloid') {
      $subSidebar.style.display = 'flex';
      $sidebarTitle.textContent = cat === 'jpop' ? '가수별 소목록' : '보컬로이드 기종';
      buildSubSidebar(cat);
    } else {
      $subSidebar.style.display = 'none';
    }
    render();
  }

  /* ─── 소목록(아코디언) 빌더 ─── */
  function buildSubSidebar(cat) {
    $subList.innerHTML = '';
    const filtered = db.filter(s => s.type === cat);

    const groups = {};
    filtered.forEach(s => {
      if (s.subGroup) groups[s.subGroup] = (groups[s.subGroup] || 0) + 1;
    });

    // 전체보기 기본 생성
    const allLi = document.createElement('li');
    allLi.className = `sub-item ${state.subGroup === 'ALL' ? 'active' : ''}`;
    allLi.textContent = `전체보기 (${filtered.length})`;
    allLi.addEventListener('click', () => {
      document.querySelectorAll('.sub-item').forEach(li => li.classList.remove('active'));
      allLi.classList.add('active');
      state.subGroup = 'ALL';
      state.page = 1;
      render();
    });
    $subList.appendChild(allLi);

    // 내부 가수명 기준 가나다/알파벳 순 정렬 출력
    Object.keys(groups).sort().forEach(g => {
      const li = document.createElement('li');
      li.className = `sub-item ${state.subGroup === g ? 'active' : ''}`;
      li.textContent = `${g} (${groups[g]})`;
      li.addEventListener('click', () => {
        document.querySelectorAll('.sub-item').forEach(li => li.classList.remove('active'));
        li.classList.add('active');
        state.subGroup = g;
        state.page = 1;
        render();
      });
      $subList.appendChild(li);
    });
  }

  /* ─── 실시간 인풋 제어 핸들러 ─── */
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
    render();
  });

  $sortSel.addEventListener('change', () => { state.sort = $sortSel.value; state.page = 1; render(); });
  $starOnly.addEventListener('change', () => { state.starOnly = $starOnly.checked; state.page = 1; render(); });
  $modalClose.addEventListener('click', closeModal);
  $modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });

  /* ─── 다차원 필터 및 정렬 연산 처리 ─── */
  function getFiltered() {
    let arr = db;

    if (state.category === 'BOOKMARK') {
      arr = arr.filter(s => state.bookmarks.includes(s.id));
    } else {
      arr = arr.filter(s => s.type === state.category);
      if ((state.category === 'jpop' || state.category === 'vocaloid') && state.subGroup !== 'ALL') {
        arr = arr.filter(s => s.subGroup === state.subGroup);
      }
    }

    if (state.starOnly) arr = arr.filter(s => s.isStar);

    /* 한국어 발음 표기(titleYomi, artistYomi) 연동 실시간 다차원 필터링 */
    if (state.query) {
      const q = state.query;
      arr = arr.filter(s =>
        s.id.includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.titleKana && s.titleKana.toLowerCase().includes(q)) ||
        (s.titleYomi && s.titleYomi.includes(q)) || // 한국어 발음 매칭 규칙
        s.artist.toLowerCase().includes(q) ||
        (s.artistYomi && s.artistYomi.includes(q)) || // 아티스트 한국어 발음 매칭
        (s.tieUp && s.tieUp.toLowerCase().includes(q))
      );
    }

    if (state.sort === 'id-asc') arr = [...arr].sort((a, b) => Number(a.id) - Number(b.id));
    if (state.sort === 'id-desc') arr = [...arr].sort((a, b) => Number(b.id) - Number(a.id));
    if (state.sort === 'title-asc') arr = [...arr].sort((a, b) => a.title.localeCompare(b.title, 'ko'));

    return arr;
  }

  /* ─── 메인 UI 렌더링 ─── */
  function render() {
    const filtered = getFiltered();
    const total = filtered.length;
    const pages = Math.ceil(total / state.perPage);

    if (state.page > pages && pages > 0) state.page = pages;
    $result.textContent = total.toLocaleString();

    const start = (state.page - 1) * state.perPage;
    const slice = filtered.slice(start, start + state.perPage);

    $grid.innerHTML = '';

    if (total === 0) {
      $grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:6px;color:var(--text-secondary);margin-top:40px;">조건에 일치하는 데이터가 존재하지 않습니다.</div>`;
      $pagination.innerHTML = '';
      return;
    }

    slice.forEach((song) => {
      const isBm = state.bookmarks.includes(song.id);
      const card = document.createElement('div');
      card.className = `song-card`;

      const starBadge = song.isStar ? `<span class="badge-star">★ 전용곡</span>` : '';
      const yomiLine = song.titleYomi ? `<div class="song-yomi">[발음: ${escHtml(song.titleYomi)}]</div>` : '';
      const tieupLine = song.tieUp ? `<div class="card-tieup">📺 ${escHtml(song.tieUp)}</div>` : '';
      const artistYomi = song.artistYomi ? ` (${escHtml(song.artistYomi)})` : '';

      card.innerHTML = `
        <div class="card-top">
          <span class="card-id">TJ ${escHtml(song.id)}</span>
          <div>${starBadge}</div>
        </div>
        <div class="song-title">${escHtml(song.title)}</div>
        ${yomiLine}
        ${tieupLine}
        <div class="card-bottom">
          <div class="card-artist">가수: <span>${escHtml(song.artist)}${artistYomi}</span></div>
          <button class="bm-btn ${isBm ? 'active' : ''}">${isBm ? '⭐' : '☆'}</button>
        </div>
      `;

      card.addEventListener('click', e => {
        if (!e.target.closest('.bm-btn')) openModal(song);
      });

      card.querySelector('.bm-btn').addEventListener('click', e => {
        e.stopPropagation();
        toggleBm(song.id);
      });

      $grid.appendChild(card);
    });

    renderPagination(pages);
  }

  function renderPagination(pages) {
    $pagination.innerHTML = '';
    if (pages <= 1) return;
    const cur = state.page;

    const addBtn = (label, targetPage, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.className = `page-btn ${active ? 'active' : ''}`;
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled && !active) {
        btn.addEventListener('click', () => { state.page = targetPage; render(); });
      }
      $pagination.appendChild(btn);
    };

    addBtn('‹', cur - 1, cur === 1);
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || (i >= cur - 2 && i <= cur + 2)) {
        addBtn(i, i, false, i === cur);
      } else if (i === cur - 3 || i === cur + 3) {
        const span = document.createElement('span');
        span.textContent = '…';
        span.style.padding = '0 5px';
        $pagination.appendChild(span);
      }
    }
    addBtn('›', cur + 1, cur === pages);
  }

  function toggleBm(id) {
    const idx = state.bookmarks.indexOf(id);
    if (idx === -1) state.bookmarks.push(id);
    else state.bookmarks.splice(idx, 1);

    localStorage.setItem('tj_bm_v2', JSON.stringify(state.bookmarks));
    $bmCount.textContent = state.bookmarks.length.toLocaleString();
    if (state.category === 'BOOKMARK') render();
    else render();
  }

  function openModal(song) {
    const isBm = state.bookmarks.includes(song.id);
    $modalBody.innerHTML = `
      <div class="modal-id">TJ ${escHtml(song.id)}</div>
      <div class="modal-title">${escHtml(song.title)}</div>
      <div class="modal-row"><span class="modal-label">🎤 가수</span><span>${escHtml(song.artist)}</span></div>
      <div class="modal-row"><span class="modal-label">📺 타이업</span><span>${escHtml(song.tieUp || '없음')}</span></div>
      <div class="modal-actions">
        <a class="btn-youtube" href="https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' ' + song.artist)}" target="_blank">▶ YouTube 검색</a>
        <button class="btn-bm-modal" id="modalBmBtn">${isBm ? '⭐ 해제' : '☆ 추가'}</button>
      </div>
    `;
    $modal.classList.add('open');
    document.getElementById('modalBmBtn').addEventListener('click', () => { toggleBm(song.id); closeModal(); });
  }

  function closeModal() { $modal.classList.remove('open'); }
  function escHtml(str) { return str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''; }

  /* ─── 파티클 백그라운드 엔진 ─── */
  function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth, H = canvas.height = window.innerHeight;
    let pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2, a: Math.random() * 0.5
    }));
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(157, 78, 221, ${p.a})`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
      });
      requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener('resize', () => { if (canvas) { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; } });
  }
})();