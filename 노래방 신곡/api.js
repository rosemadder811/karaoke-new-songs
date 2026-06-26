/* ────────────────────────────────────────
   api.js — songs.json 비동기 로더
   ──────────────────────────────────────── */
const MusicAPI = {
  async loadDatabase() {
    try {
      const res = await fetch('songs.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[MusicAPI] 로드 실패:', err);
      return [];
    }
  }
};