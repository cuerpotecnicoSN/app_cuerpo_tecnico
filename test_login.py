import os
import sys
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            timezone_id="Europe/Madrid"
        )
        page = context.new_page()
        page.goto("https://www.tuttocampo.it/Italia/SerieD/GironeB/Squadra/MilanFuturo/1234787/Calendario", wait_until="domcontentloaded")
        
        # Try to call showLogin()
        try:
            page.evaluate("showLogin()")
            print("showLogin() works!")
        except Exception as e:
            print(f"Error calling showLogin(): {e}")
            
        browser.close()

if __name__ == "__main__":
    run()
