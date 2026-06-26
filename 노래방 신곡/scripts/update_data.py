import requests
import json
import re
from datetime import datetime
import os

def contains_japanese(text):
    if not text: return False
    return bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', text))

def is_vocaloid(artist):
    if not artist: return False
    # IA 같은 짧은 이름은 다른 영단어(예: MarIA)에 포함되어 오작동할 수 있으므로 단독 단어일 때만 허용
    if re.search(r'\bIA\b', artist, re.IGNORECASE) or "IA(" in artist:
        return True
        
    vocaloids = [
        "初音ミク", "鏡音", "巡音", "GUMI", "flower", "하츠네", "카가미네", 
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
    
    # 최근 50페이지 (약 1000곡) 탐색 (JPOP이 가끔 한 달에 한 번 업데이트되므로 깊게 탐색)
    for page in range(1, 51):
        url = f"https://api.manana.kr/karaoke/song.json?brand=tj&page={page}"
        try:
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
        except Exception as e:
            print(f"API 접속 에러 (페이지 {page}):", e)
            continue
            
        for item in data:
            raw_title = item.get("title", "")
            singer = item.get("singer", "")
            song_no = item.get("no", "")
            release_date = item.get("release", "")
            
            # 괄호 안의 한국어 발음 분리 (예: "アイドル(아이돌)" -> title:"アイドル", titleKo:"아이돌")
            title = raw_title
            titleKo = raw_title
            match = re.search(r'^(.*?)\((.*?)\)$', raw_title)
            if match:
                title = match.group(1).strip()
                titleKo = match.group(2).strip()
            
            # 일본어 포함 여부 확인
            is_jp = contains_japanese(raw_title) or contains_japanese(singer)
            is_voc = is_vocaloid(singer)
            
            song_obj = {
                "songNo": song_no,
                "title": title,
                "titleKo": titleKo, 
                "artist": singer,
                "addedDate": release_date,
                "genre": "J-POP" if not is_voc else "VOCALOID",
                "isNew": True
            }
            
            if is_voc:
                vocaloid_songs.append(song_obj)
            elif is_jp:
                jpop_songs.append(song_obj)

    print(f"탐색 완료: 새로운 JPOP {len(jpop_songs)}곡, 보컬로이드 {len(vocaloid_songs)}곡 발견.")

    # 1. 기존 J-POP 데이터 로드 및 병합
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
            
    # 2. 기존 보컬로이드 데이터 로드 및 병합
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

    now_str = datetime.now().strftime("%Y-%m-%d")
    os.makedirs("data", exist_ok=True)
    
    with open(jpop_path, "w", encoding="utf-8") as f:
        json.dump({"lastUpdated": now_str, "type": "JPOP_NEW", "songs": jpop_songs}, f, ensure_ascii=False, indent=2)
        
    with open(voc_path, "w", encoding="utf-8") as f:
        json.dump({"lastUpdated": now_str, "type": "VOCALOID", "songs": vocaloid_songs}, f, ensure_ascii=False, indent=2)
        
    print(f"업데이트 완료! 총 JPOP {len(jpop_songs)}곡, 보컬로이드 {len(vocaloid_songs)}곡 저장됨.")

if __name__ == "__main__":
    update_new_songs()
