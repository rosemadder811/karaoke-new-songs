// No server needed. This project is a static site that loads songs.json directly in the browser.


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
// Return all songs (no search, no pagination)
app.get('/api/songs', (req, res) => {
  res.json(songs);
});

app.get('/api/songs/category/:type', (req, res) => {
  const type = req.params.type;
  const filtered = songs.filter(song => song.type === type);
  res.json(filtered);
});

app.listen(PORT, () => {
  console.log(`🚀 서버 구동 중: http://localhost:${PORT}`);
});