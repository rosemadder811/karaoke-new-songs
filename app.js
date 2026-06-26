/**
 * app.js — 메인 런타임 제어 및 인터랙션 스크립트
 */
import { getJPopNewSongs, getVocaloidSongs, getJPopFullLibrary } from './api.js';

const CHARACTER_META = {
  miku: { name: "하츠네 미쿠 (初音ミク)", desc: "대표곡: 멜트, 하츠네 미쿠의 소실 | 테마: 민트그린", emoji: "01" },
  rin: { name: "카가미네 린 (鏡音リン)", desc: "대표곡: 악의 하인, 로스트원의 호곡 | 테마: 오렌지옐로우", emoji: "🍊" },
  len: { name: "카가미네 렌 (鏡音レン)", desc: "대표곡: 파라디클로로벤젠, 파이어플라워 | 테마: 바나나옐로우", emoji: "🍌" },
  luka: { name: "메구리네 루카 (巡音ルカ)", desc: "대표곡: 더블 래리어트, 저스트 비 프렌즈 | 테마: 소프트핑크", emoji: "🌸" },
  kaito: { name: "카이토 (KAITO)", desc: "대표곡: 신들의 태엽장치, 죽으니 해봐라 | 테마: 딥블루", emoji: "🍦" },
  meiko: { name: "메이코 (MEIKO)", desc: "대표곡: 악식딸 콘치타, 망각주중 | 테마: 크림슨레드", emoji: "🍷" },
  gumi: { name: "구미 (GUMI / Megpoid)", desc: "대표곡: 겁쟁이 몽블랑, 에코 | 테마: 비비드그린", emoji: "🥕" },
  ia: { name: "이아 (IA)", desc: "대표곡: 육조년과 하룻밤 이야기, 아야노의 행복이론 | 테마: 메이릴리", emoji: "🎻" }
};

let currentTab = 'jpop-new';
let currentSubChar = 'all';
let allRawSongs = [];

const grid = document.getElementById('songs-grid');
const noDataMsg = document.getElementById('no-data-message');
const counter = document.getElementById('song-counter');
const sortSelect = document.getElementById('sort-select');
const vChipsContainer = document.getElementById('vocaloid-chips-container');
const profileZone = document.getElementById('character-profile-zone');

function isNewSong(dateStr) {
  if (!dateStr) return false;
  const songDate = new Date(dateStr);
  const today = new Date();
  const diffTime = Math.abs(today - songDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

function sortSongs(songs, criterion) {
  return [...songs].sort((a, b) => {
    if (criterion === 'latest') {
      return new Date(b.addedDate || 0) - new Date(a.addedDate || 0);
    } else if (criterion === 'songNo') {
      return Number(a.songNo) - Number(b.songNo);
    } else if (criterion === 'title') {
      return a.title.localeCompare(b.title, 'ko-KR');
    }
    return 0;
  });
}

function renderDashboard() {
  grid.innerHTML = '';

  let filtered = allRawSongs;
  if (currentTab === 'vocaloid' && currentSubChar !== 'all') {
    filtered = allRawSongs.filter(s => s.vocaloid === currentSubChar);
  }

  const sorted = sortSongs(filtered, sortSelect.value);
  counter.textContent = `총 ${sorted.length}곡 검색됨`;

  if (sorted.length === 0) {
    noDataMsg.classList.remove('hidden');
    return;
  }
  noDataMsg.classList.add('hidden');

  sorted.forEach(song => {
    const card = document.createElement('div');
    card.className = `song-card`;

    const isNew = isNewSong(song.addedDate);
    const ytQuery = encodeURIComponent(`${song.artist} ${song.title}`);

    card.innerHTML = `
      <div class="card-top">
        <span class="song-no">No. ${song.songNo}</span>
        ${isNew ? '<span class="new-badge">NEW</span>' : ''}
      </div>
      <div class="card-middle">
        <h3 class="song-title" title="${song.title}">${song.title}</h3>
        <span class="song-pronunciation">[ ${song.pronunciation} ]</span>
      </div>
      <div class="card-bottom">
        <span class="song-artist">${song.artist}</span>
        <a href="https://www.youtube.com/results?search_query=${ytQuery}" target="_blank" class="youtube-btn">
          ▶ YouTube
        </a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateCharacterTheme(char) {
  document.body.className = '';

  if (char === 'all' || currentTab !== 'vocaloid') {
    document.body.classList.add('theme-default');
    profileZone.classList.add('hidden');
    return;
  }

  document.body.classList.add(`theme-${char}`);
  const meta = CHARACTER_META[char];
  if (meta) {
    document.getElementById('profile-avatar').textContent = meta.emoji;
    document.getElementById('profile-name').textContent = meta.name;
    document.getElementById('profile-desc').textContent = meta.desc;
    profileZone.classList.remove('hidden');
  }
}

async function loadTabData(tab) {
  if (tab === 'jpop-new') {
    const res = await getJPopNewSongs();
    allRawSongs = res.data;
    vChipsContainer.classList.add('hidden');
  } else if (tab === 'jpop-full') {
    allRawSongs = await getJPopFullLibrary();
    vChipsContainer.classList.add('hidden');
  } else if (tab === 'vocaloid') {
    const res = await getVocaloidSongs();
    allRawSongs = res.data;
    vChipsContainer.classList.remove('hidden');
  }
  updateCharacterTheme(currentSubChar);
  renderDashboard();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentTab = e.target.dataset.tab;
    currentSubChar = 'all';
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
    document.querySelector(".chip-btn[data-char='all']").classList.add('active');
    loadTabData(currentTab);
  });
});

document.querySelectorAll('.chip-btn').forEach(chip => {
  chip.addEventListener('click', (e) => {
    // [버그 수정] 기존 코드의 .classList.remove('remove', 'active') 오타 해결
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentSubChar = e.target.dataset.char;
    updateCharacterTheme(currentSubChar);
    renderDashboard();
  });
});

sortSelect.addEventListener('change', renderDashboard);

// 백그라운드 파티클 엔진
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedY = Math.random() * -0.4 - 0.1;
    this.opacity = Math.random() * 0.5 + 0.2;
  }
  update() {
    this.y += this.speedY;
    if (this.y < 0) { this.y = canvas.height; this.x = Math.random() * canvas.width; }
  }
  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
  }
}
for (let i = 0; i < 45; i++) particles.push(new Particle());
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animate);
}
animate();

loadTabData('jpop-new');