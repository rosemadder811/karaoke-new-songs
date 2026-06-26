document.addEventListener('DOMContentLoaded', async () => {
  let db = await MusicAPI.loadDatabase();
  let currentTab = 'animation';
  let selectedSubGroup = 'ALL';
  let bookmarks = JSON.parse(localStorage.getItem('tj_bookmarks')) || [];

  const tabs = document.querySelectorAll('.tab-btn');
  const subSidebar = document.getElementById('subSidebar');
  const sidebarTitle = document.getElementById('sidebarTitle');
  const subList = document.getElementById('subList');
  const gridView = document.getElementById('gridView');
  const mainSearch = document.getElementById('mainSearch');

  // 초기 상태 구동
  switchEngine(currentTab);

  // 탭 전환 이벤트 리스너
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.getAttribute('data-type');
      selectedSubGroup = 'ALL';
      switchEngine(currentTab);
    });
  });

  // 실시간 검색 인풋 리스너
  mainSearch.addEventListener('input', () => {
    renderSongs();
  });

  function switchEngine(tab) {
    if (tab === 'jpop' || tab === 'vocaloid') {
      subSidebar.style.display = 'flex';
      sidebarTitle.textContent = tab === 'jpop' ? '가수 목록' : '보컬로이드 기종';
      buildSubSidebar(tab);
    } else {
      subSidebar.style.display = 'none';
    }
    renderSongs();
  }

  function buildSubSidebar(tab) {
    subList.innerHTML = '';

    // 해당 카테고리에 속한 그룹명 추출 및 집계
    const filtered = db.filter(s => s.type === tab);
    const groups = {};
    filtered.forEach(s => {
      if (s.subGroup) groups[s.subGroup] = (groups[s.subGroup] || 0) + 1;
    });

    // '전체보기' 아이템 생성
    const allLi = document.createElement('li');
    allLi.className = `sub-item ${selectedSubGroup === 'ALL' ? 'active' : ''}`;
    allLi.textContent = `전체보기 (${filtered.length})`;
    allLi.addEventListener('click', () => {
      document.querySelectorAll('.sub-item').forEach(li => li.classList.remove('active'));
      allLi.classList.add('active');
      selectedSubGroup = 'ALL';
      renderSongs();
    });
    subList.appendChild(allLi);

    // 정렬 정 전개
    Object.keys(groups).sort().forEach(g => {
      const li = document.createElement('li');
      li.className = `sub-item ${selectedSubGroup === g ? 'active' : ''}`;
      li.textContent = `${g} (${groups[g]})`;
      li.addEventListener('click', () => {
        document.querySelectorAll('.sub-item').forEach(li => li.classList.remove('active'));
        li.classList.add('active');
        selectedSubGroup = g;
        renderSongs();
      });
      subList.appendChild(li);
    });
  }

  function renderSongs() {
    gridView.innerHTML = '';
    const query = mainSearch.value.toLowerCase().trim();

    const filtered = db.filter(song => {
      // 1단계: 대분류 / 북마크 필터링
      if (currentTab === 'bookmark') {
        if (!bookmarks.includes(song.id)) return false;
      } else {
        if (song.type !== currentTab) return false;
        // 2단계: 소목록 필터링
        if ((currentTab === 'jpop' || currentTab === 'vocaloid') && selectedSubGroup !== 'ALL') {
          if (song.subGroup !== selectedSubGroup) return false;
        }
      }

      // 3단계: 검색어 다중 결합 필터링
      if (query) {
        return song.id.includes(query) ||
          song.title.toLowerCase().includes(query) ||
          (song.titleYomi && song.titleYomi.includes(query)) ||
          song.artist.toLowerCase().includes(query) ||
          (song.artistYomi && song.artistYomi.includes(query)) ||
          (song.tieUp && song.tieUp.toLowerCase().includes(query));
      }
      return true;
    });

    if (filtered.length === 0) {
      gridView.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--text-secondary);">매칭되는 수록곡 데이터가 없습니다.</div>`;
      return;
    }

    filtered.forEach(song => {
      const isBookmarked = bookmarks.includes(song.id);
      const card = document.createElement('div');
      card.className = 'song-card';

      // 한국어 발음 표기가 있으면 추가, 영어 발음은 강제 필터링 제외 처리 규칙 적용
      const yomiElement = song.titleYomi ? `<div class="song-yomi">[발음: ${song.titleYomi}]</div>` : '';
      const artistYomi = song.artistYomi ? ` (${song.artistYomi})` : '';
      const starBadge = song.isStar ? `<span class="star-tag">★ 전용곡</span>` : '';
      const tieUpElement = song.tieUp ? `<div style="font-size:12px; color:#e0aaff;">타이업: ${song.tieUp}</div>` : '';

      card.innerHTML = `
                <div class="card-header">
                    <span>TJ ${song.id}</span>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${starBadge}
                        <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" data-id="${song.id}">
                            <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                        </button>
                    </div>
                </div>
                <div class="song-title">${song.title}</div>
                ${yomiElement}
                ${tieUpElement}
                <div class="song-artist">가수: <span>${song.artist}${artistYomi}</span></div>
            `;

      // 북마크 클릭 핸들러 배치
      const bBtn = card.querySelector('.bookmark-btn');
      bBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(song.id);
      });

      gridView.appendChild(card);
    });
  }

  function toggleBookmark(id) {
    if (bookmarks.includes(id)) {
      bookmarks = bookmarks.filter(b => b !== id);
    } else {
      bookmarks.push(id);
    }
    localStorage.setItem('tj_bookmarks', JSON.stringify(bookmarks));
    renderSongs();
  }
});