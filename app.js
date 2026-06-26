/* ════════════════════════════════════════════════════════
   app.js — TJ 일본노래 검색기 메인 로직 (정밀 분류 & 레이아웃 겹침 수정판)
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

  /* ─── 상태 관리 ─── */
  const state = {
    category: 'ALL', // ALL, animation, vocaloid, jpop
    query: '',
    sort: 'default',
    starOnly: false,
    page: 1,
    perPage: 60,
    bookmarks: JSON.parse(localStorage.getItem('tj_bm_v2') || '[]'),
    selectedSong: null,
  };

  /* ─── DOM 엘리먼트 참조 ─── */
  const $grid = document.getElementById('songsGrid');
  const $search = document.getElementById('searchInput');
  const $clear = document.getElementById('searchClear');
  const $result = document.getElementById('resultCount');
  const $total = document.getElementById('totalCount');
  const $pagination = document.getElementById('pagination');
  const $sort = document.getElementById('sortSelect');
  const $starOnly = document.getElementById('starOnly');
  const $tabs = document.querySelectorAll('.tab-btn');

  /* ─── 초기 설정 및 이벤트 등록 ─── */
  $total.textContent = db.length.toLocaleString();

  $search.addEventListener('input', (e) => {
    state.query = e.target.value;
    state.page = 1;
    render();
  });

  $clear.addEventListener('click', () => {
    $search.value = '';
    state.query = '';
    state.page = 1;
    render();
  });

  $sort.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  $starOnly.addEventListener('change', (e) => {
    state.starOnly = e.target.checked;
    state.page = 1;
    render();
  });

  $tabs.forEach($tab => {
    $tab.addEventListener('click', () => {
      $tabs.forEach(t => t.classList.remove('active'));
      $tab.classList.add('active');
      state.category = $tab.dataset.tab;
      state.page = 1;
      render();
    });
  });

  // 최초 렌더링
  render();

  /* ─── 핵심 필터링 및 렌더링 함수 ─── */
  function render() {
    // 1. 카테고리 / 타입 필터링 (jpop, vocaloid, animation 분별 연동)
    let filtered = db.filter(song => {
      if (state.category !== 'ALL' && song.type !== state.category) return false;
      if (state.starOnly && !song.isStar) return false;

      if (state.query.trim() !== '') {
        const q = state.query.toLowerCase().trim();
        return (
          song.id.includes(q) ||
          song.title.toLowerCase().includes(q) ||
          song.titleYomi.toLowerCase().includes(q) ||
          song.artist.toLowerCase().includes(q) ||
          song.artistYomi.toLowerCase().includes(q) ||
          (song.tieUp && song.tieUp.toLowerCase().includes(q))
        );
      }
      return true;
    });

    // 2. 데이터 정렬
    if (state.sort === 'id-asc') {
      filtered.sort((a, b) => a.id.localeCompare(b.id));
    } else if (state.sort === 'id-desc') {
      filtered.sort((a, b) => b.id.localeCompare(a.id));
    } else if (state.sort === 'title-asc') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (state.sort === 'title-desc') {
      filtered.sort((a, b) => b.title.localeCompare(a.title));
    }

    $result.textContent = filtered.length.toLocaleString();

    // 3. 페이지네이션 계산
    const totalPages = Math.ceil(filtered.length / state.perPage) || 1;
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.perPage;
    const pagedData = filtered.slice(start, start + state.perPage);

    // 4. 그리드 뷰 빌드
    if (pagedData.length === 0) {
      $grid.innerHTML = `<div class="empty-state"><p>검색 조건에 맞는 곡이 없습니다.</p></div>`;
      $pagination.innerHTML = '';
      return;
    }

    $grid.innerHTML = pagedData.map(song => {
      const isBm = state.bookmarks.includes(song.id);

      // 🚨 보컬로이드 기종 과다로 인한 텍스트 깨짐 방어 코드 적용
      // 부가 수식어나 피처링 정보가 너무 길면 UI 가독성을 위해 간소화 표시
      let displaySubGroup = song.subGroup || "기타 아티스트";
      if (displaySubGroup.length > 14) {
        displaySubGroup = displaySubGroup.substring(0, 13) + '...';
      }

      return `
        <div class="song-card ${song.isStar ? 'star-premium' : ''}" data-id="${song.id}">
          <div class="card-header">
            <span class="song-id-badge">${song.id}</span>
            <button class="btn-bookmark ${isBm ? 'active' : ''}" data-id="${song.id}">
              ${isBm ? '★' : '☆'}
            </button>
          </div>
          <div class="card-body">
            <h3 class="song-title" title="${song.title}">${song.title}</h3>
            <p class="song-yomi">${song.titleYomi !== song.title ? song.titleYomi : ''}</p>
            
            <div class="meta-info-row">
              <span class="info-label">가수</span>
              <span class="info-value text-ellipsis" title="${song.artist}">${song.artist}</span>
            </div>
            
            ${song.tieUp ? `
            <div class="meta-info-row">
              <span class="info-label">타이업</span>
              <span class="info-value text-ellipsis" title="${song.tieUp}">${song.tieUp}</span>
            </div>` : ''}
          </div>
          <div class="card-footer">
            <span class="badge-type type-${song.type}">${song.type.toUpperCase()}</span>
            <span class="badge-subgroup" title="${song.subGroup}">${displaySubGroup}</span>
          </div>
        </div>
      `;
    }).join('');

    setupCardEvents();
    renderPagination(totalPages);
  }

  /* ─── 부가 인터페이스 제어 ─── */
  function setupCardEvents() {
    // 북마크 제어 토글 이벤트
    $grid.querySelectorAll('.btn-bookmark').forEach($btn => {
      $btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = $btn.dataset.id;
        let bms = [...state.bookmarks];
        if (bms.includes(id)) {
          bms = bms.filter(x => x !== id);
          $btn.classList.remove('active');
          $btn.textContent = '☆';
        } else {
          bms.push(id);
          $btn.classList.add('active');
          $btn.textContent = '★';
        }
        state.bookmarks = bms;
        localStorage.setItem('tj_bm_v2', JSON.stringify(bms));
      });
    });
  }

  function renderPagination(total) {
    if (total <= 1) {
      $pagination.innerHTML = '';
      return;
    }
    let html = '';
    const maxView = 5;
    let startPage = Math.max(1, state.page - Math.floor(maxView / 2));
    let endPage = Math.min(total, startPage + maxView - 1);

    if (endPage - startPage + 1 < maxView) {
      startPage = Math.max(1, endPage - maxView + 1);
    }

    if (state.page > 1) html += `<button class="page-btn" data-page="${state.page - 1}">이전</button>`;
    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === state.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (state.page < total) html += `<button class="page-btn" data-page="${state.page + 1}">다음</button>`;

    $pagination.innerHTML = html;

    $pagination.querySelectorAll('.page-btn').forEach($btn => {
      $btn.addEventListener('click', () => {
        state.page = parseInt($btn.dataset.page);
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function showFatalError(msg) {
    $grid.innerHTML = `<div class="fatal-error-box"><p>${msg}</p></div>`;
  }

  /* ─── BACKGROUND PARTICLES ─── */
  function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function mkParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        a: Math.random() * 0.55 + 0.05,
        hue: Math.random() < 0.7 ? 270 : Math.random() < 0.5 ? 220 : 300,
      };
    }

    function init() {
      resize();
      const count = Math.min(Math.floor((W * H) / 9000), 140);
      particles = Array.from({ length: count }, mkParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.a})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();
  }
})();