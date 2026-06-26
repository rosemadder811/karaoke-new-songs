// 외부 JSON 리소스 비동기 호출 인터페이스 객체 정의
const MusicAPI = {
  async loadDatabase() {
    try {
      const response = await fetch('songs.json');
      if (!response.ok) {
        throw new Error('데이터 원격 패치 실패');
      }
      return await response.json();
    } catch (error) {
      console.error('API 로드 에러:', error);
      return [];
    }
  }
};