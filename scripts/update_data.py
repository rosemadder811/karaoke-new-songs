import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os

def update_tj_data():
    print("TJ 미디어 인기 차트 크롤링 시작...")
    url = "https://www.tjmedia.com/tjsong/song_monthPopular.asp"
    
    # SYLType: 1(가요), 2(POP), 3(일본곡)
    payload = {"SYLType": "3"}
    
    try:
        res = requests.post(url, data=payload, timeout=15)
        res.raise_for_status()
    except Exception as e:
        print("TJ 미디어 접속에 실패했습니다:", e)
        return
        
    soup = BeautifulSoup(res.text, 'html.parser')
    table = soup.find("table", {"class": "board_type1"})
    if not table:
        print("크롤링 오류: 테이블을 찾을 수 없습니다.")
        return
        
    rows = table.find_all("tr")[1:]
    
    songs = []
    for row in rows:
        cols = row.find_all("td")
        if len(cols) >= 4:
            rank = cols[0].text.strip()
            song_no = cols[1].text.strip()
            title = cols[2].text.strip()
            artist = cols[3].text.strip()
            
            try:
                rank_int = int(rank)
            except ValueError:
                continue
                
            songs.append({
                "rank": rank_int,
                "songNo": song_no,
                "title": title,
                "titleKo": title,
                "artist": artist,
                "rankChange": 0
            })
            
            if len(songs) >= 50:
                break

    if not songs:
        return

    now = datetime.now()
    chart_data = {
        "lastUpdated": now.strftime("%Y-%m-%d"),
        "month": f"{now.year}년 {now.month}월",
        "type": "JPOP",
        "songs": songs
    }
    
    os.makedirs("data", exist_ok=True)
    with open("data/jpop_chart.json", "w", encoding="utf-8") as f:
        json.dump(chart_data, f, ensure_ascii=False, indent=2)
        
    print(f"J-POP 차트 업데이트 완료! 총 {len(songs)}곡 갱신.")

if __name__ == "__main__":
    update_tj_data()
