const Api = {
  searchSongs: async (keyword) => {
    try {
      const response = await fetch(`/api/songs/search?q=${encodeURIComponent(keyword)}`);
      return await response.json();
    } catch (error) {
      console.error('검색 API 통신 실패:', error);
      return [];
    }
  },

  getSongsByCategory: async (type) => {
    try {
      const response = await fetch(`/api/songs/category/${type}`);
      return await response.json();
    } catch (error) {
      console.error('카테고리 API 통신 실패:', error);
      return [];
    }
  },

  renderSongList: (songs, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (songs.length === 0) {
      container.innerHTML = '<div class="no-result">해당 조건의 곡이 검색되지 않습니다. 😓</div>';
      return;
    }

    songs.forEach(song => {
      const songCard = document.createElement('div');
      songCard.className = `song-card ${song.type}`;

      // 가수 원문 결합 표시
      const displayArtist = song.artist === song.artistOrig
        ? song.artist
        : `${song.artist} (${song.artistOrig})`;

      // ★ 작곡가 표기 디자인 태그 생성 (작곡가 데이터가 존재할 때만 작동)
      const composerHtml = song.composer
        ? `<span class="song-composer">⌨️ 작곡: ${song.composer}</span>`
        : '';

      // 카테고리별 우측 상단 뱃지 분기
      let badgeHtml = '';
      if (song.type === 'vocaloid') {
        badgeHtml = `<span class="badge vocaloid-badge">🤖 VOCALOID</span>`;
      } else if (song.tieUp) {
        badgeHtml = `<span class="badge tieup-badge">🎬 ${song.tieUp}</span>`;
      }

      songCard.innerHTML = `
                <div class="song-id">${song.id}</div>
                <div class="song-info">
                    <div class="song-title-row">
                        <span class="song-title">${song.title}</span>
                        ${badgeHtml}
                    </div>
                    <div class="song-meta-row">
                        <span class="song-artist">${displayArtist}</span>
                        ${composerHtml}
                    </div>
                </div>
                <button class="fav-btn ${song.isStar ? 'active' : ''}" onclick="toggleFavorite(this, '${song.id}')">⭐</button>
            `;
      container.appendChild(songCard);
    });
  }
};