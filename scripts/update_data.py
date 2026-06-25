import requests
import json
import re
from datetime import datetime
import os

def contains_japanese(text):
    if not text: return False
    # 히라가나, 가타카나, 한자 포함 여부 확인
    return bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', text))

def is_vocaloid(artist):
    if not artist: return False
    vocaloids = [
        "初音ミク", "鏡音", "巡音", "GUMI", "IA", "flower", "하츠네", "카가미네", 
        "메구포이드", "카산", "유즈키 유카리", "보컬로이드", "Vocaloid"
    ]
    for v in vocaloids:
        if v.lower() in artist.lower():
            return True
    return False

def update_new_songs():
    print("Manana API를 통해 TJ 미디어 최신곡 수집 시작...")
    
    jpop_songs = []
    vocaloid_songs = []
    
    # 최근 신곡 데이터 200곡(10페이지) 탐색
    for page in range(1, 11):
        url = f"https://api.manana.kr/karaoke/song.json?brand=tj&page={page}"
        try:
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
        except Exception as e:
            print(f"API 접속 에러 (페이지 {page}):", e)
            continue
            
        for item in data:
            title = item.get("title", "")
            singer = item.get("singer", "")
            song_no = item.get("no", "")
            release_date = item.get("release", "")
            
            # 일본어 포함 여부 확인
            is_jp = contains_japanese(title) or contains_japanese(singer)
            is_voc = is_vocaloid(singer)
            
            song_obj = {
                "songNo": song_no,
                "title": title,
                "titleKo": title, 
                "artist": singer,
                "addedDate": release_date,
                "genre": "J-POP" if not is_voc else "VOCALOID",
                "isNew": True
            }
            
            # 보컬로이드 우선, 그다음 일반 JPOP 분류
            if is_voc:
                vocaloid_songs.append(song_obj)
            elif is_jp:
                jpop_songs.append(song_obj)

    print(f"탐색 완료: 새로운 JPOP {len(jpop_songs)}곡, 보컬로이드 {len(vocaloid_songs)}곡 발견.")

    # 1. 기존 J-POP 신곡 데이터 병합 (중복 방지)
    jpop_path = "data/jpop_new.json"
    if os.path.exists(jpop_path):
        with open(jpop_path, "r", encoding="utf-8") as f:
            old_jpop = json.load(f).get("songs", [])
    else:
        old_jpop = []
        
    existing_nos = {s["songNo"] for s in jpop_songs}
    for s in old_jpop:
        if s["songNo"] not in existing_nos:
            s["isNew"] = False
            jpop_songs.append(s)
            existing_nos.add(s["songNo"])
            
    # 2. 기존 보컬로이드 신곡 데이터 병합
    voc_path = "data/vocaloid_new.json"
    if os.path.exists(voc_path):
        with open(voc_path, "r", encoding="utf-8") as f:
            old_voc = json.load(f).get("songs", [])
    else:
        old_voc = []

    existing_voc_nos = {s["songNo"] for s in vocaloid_songs}
    for s in old_voc:
        if s["songNo"] not in existing_voc_nos:
            s["isNew"] = False
            vocaloid_songs.append(s)
            existing_voc_nos.add(s["songNo"])

    # 3. 파일 저장
    now_str = datetime.now().strftime("%Y-%m-%d")
    os.makedirs("data", exist_ok=True)
    
    with open(jpop_path, "w", encoding="utf-8") as f:
        json.dump({"lastUpdated": now_str, "type": "JPOP_NEW", "songs": jpop_songs}, f, ensure_ascii=False, indent=2)
        
    with open(voc_path, "w", encoding="utf-8") as f:
        json.dump({"lastUpdated": now_str, "type": "VOCALOID", "songs": vocaloid_songs}, f, ensure_ascii=False, indent=2)
        
    print(f"업데이트 완료! 총 JPOP {len(jpop_songs)}곡, 보컬로이드 {len(vocaloid_songs)}곡 저장됨.")

if __name__ == "__main__":
    update_new_songs()

