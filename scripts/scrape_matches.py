import os
import sys
import logging
from playwright.sync_api import sync_playwright
try:
    from supabase import create_client, Client
except ImportError:
    pass

logging.basicConfig(level=logging.INFO)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_KEY and 'create_client' in globals():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    try:
        season_response = supabase.table("seasons").select("id").order("created_at", desc=True).limit(1).execute()
        if season_response.data:
            SEASON_ID = season_response.data[0]['id']
        else:
            logging.error("No hay temporadas (seasons) creadas en Supabase.")
            sys.exit(1)
    except Exception as e:
        logging.error(f"Error obteniendo season_id: {e}")
        sys.exit(1)
else:
    logging.warning("No se encontraron claves de Supabase. El script se ejecutará en modo PRUEBA (solo imprimirá resultados).")
    supabase = None
    SEASON_ID = "dry_run_season"

TEAM_URLS = [
    "https://www.flashscore.es/equipo/ac-milan/rFdOAiKG/partidos/",
    "https://www.flashscore.es/equipo/ac-milan/rFdOAiKG/resultados/"
]

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            timezone_id="Europe/Madrid"
        )
        
        for url in TEAM_URLS:
            page = context.new_page()
            logging.info(f"Abriendo URL de Flashscore: {url}")
            page.goto(url, wait_until="domcontentloaded")
            
            try:
                page.locator('#onetrust-accept-btn-handler').click(timeout=5000)
            except:
                pass

            logging.info("Esperando a que carguen los partidos...")
            try:
                page.wait_for_selector('.eventRowLink', timeout=15000)
            except:
                logging.info(f"No se encontraron partidos en {url}")
                page.close()
                continue
            
            match_links = page.locator('.eventRowLink').all()
            logging.info(f"Se han encontrado {len(match_links)} partidos en esta página. Extrayendo datos...")
            
            for i, link_locator in enumerate(match_links[:15]): # Analizar los últimos 15 partidos
                href = link_locator.get_attribute('href')
                if not href:
                    continue
                    
                match_url = f"https://www.flashscore.es{href}" if href.startswith('/') else href
                if "flashscore.es" not in match_url:
                    match_url = f"https://www.flashscore.es{href}"
                    
                logging.info(f"Analizando partido: {match_url}")
                
                match_page = context.new_page()
                try:
                    match_page.goto(match_url, wait_until="domcontentloaded")
                    
                    # Esperar a que carguen los nombres de los equipos
                    match_page.wait_for_selector('.participant__participantName', timeout=10000)
                    try:
                        match_page.wait_for_selector('span[data-testid="wcl-scores-simple-text-01"]', timeout=3000)
                    except:
                        pass
                    
                    data = match_page.evaluate('''() => {
                        const cleanTeamName = (name) => {
                            if (!name) return "";
                            let cleaned = name.replace(/\\s*\\([A-Za-z0-9\\-]+\\)\\s*$/g, "").trim();
                            if (cleaned.toLowerCase().includes("milan")) {
                                return "Milan Futuro";
                            }
                            return cleaned;
                        };

                        const teams = Array.from(document.querySelectorAll('.participant__participantNameWrapper')).map(el => cleanTeamName(el.textContent.trim()));
                        const logos = Array.from(document.querySelectorAll('.participant__image')).map(el => el.src);
                        
                        let dateStr = "";
                        const divs = document.querySelectorAll('div');
                        for (let d of divs) {
                            const txt = d.textContent.trim();
                            // Format: DD.MM.YYYY HH:MM
                            if (/^\\d{2}\\.\\d{2}\\.\\d{4}\\s+\\d{2}:\\d{2}$/.test(txt)) {
                                dateStr = txt;
                                break;
                            }
                        }
                        
                        let stadiumStr = "";
                        const stadiumSpan = document.querySelector('span[data-testid="wcl-scores-simple-text-01"]');
                        if (stadiumSpan) {
                            stadiumStr = stadiumSpan.textContent.trim();
                        }
                        
                        let compStr = "";
                        let compSpans = document.querySelectorAll('span[data-testid="wcl-scores-overline-03"]');
                        if (compSpans.length === 0) {
                            compSpans = document.querySelectorAll('.wcl-breadcrumbItem_8btmf span[itemprop="name"]');
                        }
                        if (compSpans.length > 0) {
                            compStr = compSpans[compSpans.length - 1].textContent.trim();
                            if (compStr.includes("Amistosos de Clubs") || compStr.includes("Amistoso")) {
                                compStr = "Amistoso";
                            } else if (compStr.toLowerCase().includes("jornada") || compStr.toLowerCase().includes("round") || compStr.toLowerCase().includes("liga") || compStr.toLowerCase().includes("serie d")) {
                                compStr = "Liga - " + compStr;
                            }
                        }

                        let resultHome = null;
                        let resultAway = null;
                        const scoreSpans = document.querySelectorAll('.detailScore__wrapper span');
                        if (scoreSpans.length > 0) {
                            const scores = Array.from(scoreSpans)
                                                .map(el => parseInt(el.textContent.trim()))
                                                .filter(n => !isNaN(n));
                            if (scores.length >= 2) {
                                resultHome = scores[0];
                                resultAway = scores[1];
                            }
                        }

                        return {
                            homeTeam: teams[0] || "",
                            awayTeam: teams[1] || "",
                            homeLogo: logos[0] || "",
                            awayLogo: logos[1] || "",
                            date: dateStr,
                            stadium: stadiumStr,
                            competition: compStr,
                            resultHome: resultHome,
                            resultAway: resultAway
                        };
                    }''')
                    
                    if data['homeTeam']:
                        date_part, time_part = "", ""
                        if data['date']:
                            parts = data['date'].split(' ')
                            if len(parts) == 2:
                                d, m, y = parts[0].split('.')
                                date_part = f"{y}-{m}-{d}"
                                time_part = parts[1]
                        
                        if not date_part:
                            logging.warning("No se pudo extraer la fecha correcta, omitiendo partido.")
                            continue
                        
                        home_lower = data['homeTeam'].lower()
                        is_home = "milan" in home_lower or "milán" in home_lower or "futuro" in home_lower
                        opponent = data['awayTeam'] if is_home else data['homeTeam']
                        
                        MILAN_LOGO = "https://b2-content.tuttocampo.it/Teams/80/1234787.png"
                        home_logo = MILAN_LOGO if is_home else data['homeLogo']
                        away_logo = MILAN_LOGO if not is_home else data['awayLogo']
                        
                        existing = supabase.table("matches").select("id").eq("date", date_part).eq("opponent", opponent).execute() if supabase else None
                        
                        status = "Finished" if data['resultHome'] is not None else "Scheduled"
                        
                        match_data = {
                            "season_id": SEASON_ID,
                            "date": date_part,
                            "time": time_part,
                            "opponent": opponent,
                            "is_home": is_home,
                            "home_logo": home_logo,
                            "away_logo": away_logo,
                            "stadium": data['stadium'],
                            "competition": data['competition'],
                            "result_home": data['resultHome'],
                            "result_away": data['resultAway'],
                            "status": status 
                        }
                        
                        if supabase:
                            if existing and existing.data and len(existing.data) > 0:
                                supabase.table("matches").update(match_data).eq("id", existing.data[0]['id']).execute()
                                logging.info(f"Actualizado: {opponent} el {date_part}")
                            else:
                                supabase.table("matches").insert(match_data).execute()
                                logging.info(f"Insertado: {opponent} el {date_part}")
                        else:
                            logging.info(f"[DRY RUN] Partido extraído: {match_data}")
                            
                except Exception as e:
                    logging.error(f"Error procesando {match_url}: {e}")
                finally:
                    match_page.close()
            page.close()
                
        browser.close()
        logging.info("Scraping finalizado.")

if __name__ == "__main__":
    run()
