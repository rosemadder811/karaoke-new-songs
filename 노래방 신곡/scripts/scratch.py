import requests
from bs4 import BeautifulSoup

def test_tj():
    url = "https://www.tjmedia.com/tjsong/song_monthPopular.asp"
    # Try POST with SYLType=3 (JPOP usually)
    res = requests.post(url, data={"SYLType": "3"})
    soup = BeautifulSoup(res.text, 'html.parser')
    
    # Let's find tables
    table = soup.find("table", {"class": "board_type1"})
    if not table:
        print("Table not found")
        return
        
    rows = table.find_all("tr")[1:5] # Get first few rows
    for row in rows:
        cols = row.find_all("td")
        if len(cols) >= 4:
            print("Rank:", cols[0].text.strip())
            print("Song No:", cols[1].text.strip())
            print("Title:", cols[2].text.strip())
            print("Artist:", cols[3].text.strip())
            print("---")

if __name__ == "__main__":
    test_tj()
