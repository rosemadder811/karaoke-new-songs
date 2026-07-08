const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let songs = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'songs.json'), 'utf8');
  songs = JSON.parse(data);
  console.log(`📦 DB 연동 완료: 총 ${songs.length}곡의 일본곡 데이터 서빙 중.`);
} catch (err) {
  console.error('❌ songs.json 로드 에러:', err);
}

// 🔍 통합 검색 라우터 (번호, 제목, 가수, 한자명, 작곡가, 애니명 완벽 커버)
app.get('/api/songs/search', (req, res) => {
  const keyword = req.query.q ? req.query.q.toLowerCase().trim() : '';

  if (!keyword) {
    return res.json(songs.slice(0, 50)); // 검색어 없을 때 브라우저 과부하 방지용 상위 50개만 반환
  }

  const filtered = songs.filter(song => {
    return (
      song.id.toLowerCase().includes(keyword) ||
      song.title.toLowerCase().includes(keyword) ||
      song.artist.toLowerCase().includes(keyword) ||
      song.artistOrig.toLowerCase().includes(keyword) ||
      (song.composer && song.composer.toLowerCase().includes(keyword)) || // ★작곡가 검색 조건 추가
      (song.tieUp && song.tieUp.toLowerCase().includes(keyword))
    );
  });

  res.json(filtered);
});

app.get('/api/songs/category/:type', (req, res) => {
  const type = req.params.type;
  const filtered = songs.filter(song => song.type === type);
  res.json(filtered);
});

app.listen(PORT, () => {
  console.log(`🚀 서버 구동 중: http://localhost:${PORT}`);
});