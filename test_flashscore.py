import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto('https://www.flashscore.es/partido/futbol/ac-milan-rFdOAiKG/piacenza-MLgfe3Oi/?mid=febZkZtB', wait_until='domcontentloaded')
    
    try:
        page.wait_for_selector('.participant__participantName', timeout=10000)
    except:
        pass
        
    teams = page.evaluate('''() => {
        return Array.from(document.querySelectorAll('.participant__participantName')).map(el => el.textContent.trim());
    }''')
    print("TEAMS class participant__participantName:", teams)
    
    wrapper = page.evaluate('''() => {
        const els = Array.from(document.querySelectorAll('.participant__participantNameWrapper'));
        return els.map(el => el.textContent.trim());
    }''')
    print("TEAMS wrapper:", wrapper)

    header = page.evaluate('''() => {
        const el = document.querySelector('.duelParticipant');
        return el ? el.innerText : 'NO DUEL PARTICIPANT';
    }''')
    print("HEADER TEXT:", header)
    
    browser.close()
