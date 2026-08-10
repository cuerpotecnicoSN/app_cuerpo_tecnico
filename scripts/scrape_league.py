import os
import sys
import logging
from playwright.sync_api import sync_playwright
from datetime import datetime

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

CALENDAR_URL = "https://www.tuttocampo.it/Italia/SerieD/GironeB/Squadra/MilanFuturo/1234787/Calendario"
CURRENT_YEAR = 2026 # Como se indicó, sabiendo que estamos en 2026

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            timezone_id="Europe/Madrid",
            viewport={"width": 1920, "height": 1080}
        )
        page = context.new_page()
        logging.info("Abriendo URL de Tuttocampo...")
        page.goto(CALENDAR_URL, wait_until="domcontentloaded")
        try:
            page.wait_for_timeout(2000)
            clicked = False
            for frame in page.frames:
                btn = frame.get_by_text("Accept", exact=True)
                if btn.count() > 0:
                    btn.first.click(timeout=3000)
                    clicked = True
                    break
            if not clicked:
                page.locator('.iubenda-cs-accept-btn').click(timeout=3000)
        except:
            pass

        logging.info("Esperando a que carguen los partidos...")
        
        # Login flow
        TUTTOCAMPO_EMAIL = os.environ.get("TUTTOCAMPO_EMAIL")
        TUTTOCAMPO_PASSWORD = os.environ.get("TUTTOCAMPO_PASSWORD")
        
        if TUTTOCAMPO_EMAIL and TUTTOCAMPO_PASSWORD:
            try:
                logging.info("Iniciando sesión en Tuttocampo...")
                try:
                    page.evaluate('document.querySelector("a[href=\\"#loginmodal\\"]").click()')
                except:
                    # Fallback
                    page.evaluate('document.querySelector("a.login").click()')
                    
                page.wait_for_selector('#login_username', timeout=5000)
                page.fill('#login_username', TUTTOCAMPO_EMAIL)
                page.fill('#login_password', TUTTOCAMPO_PASSWORD)
                page.locator('input[name="submit_login"]').click()
                
                # Wait for the page to reload after login
                page.wait_for_load_state("domcontentloaded")
                # Adding a small timeout to let the calendar render
                page.wait_for_timeout(3000)
            except Exception as e:
                logging.error(f"Error durante el login: {e}")
        else:
            logging.warning("No se proporcionaron credenciales TUTTOCAMPO_EMAIL y TUTTOCAMPO_PASSWORD. Si la página requiere login, el script fallará.")

        try:
            page.wait_for_selector('.match-day', timeout=15000)
        except Exception as e:
            logging.error(f"Error esperando partidos: {e}")
            page.screenshot(path="debug_tuttocampo.png")
            with open("debug_tuttocampo.html", "w") as f:
                f.write(page.content())
            browser.close()
            sys.exit(0)
        
        # Extraer filas de partidos
        match_rows = page.locator('tr').filter(has=page.locator('td.match-day')).all()
        logging.info(f"Se han encontrado {len(match_rows)} partidos. Extrayendo datos...")
        
        for idx, row in enumerate(match_rows):
            try:
                # 1. Jornada
                jornada_text = row.locator('td.match-day a').inner_text().strip()
                competition = f"Liga - Jornada {jornada_text}"
                
                # 2. Fecha (Viene como DD/MM típicamente en un span, buscamos el primer span o el texto que tenga /)
                # Seleccionaremos el texto de la celda de la fecha
                date_td = row.locator('td').filter(has_text="/").first
                raw_date = date_td.inner_text().strip()
                # Limpiar cualquier texto extra, buscaremos el formato DD/MM
                import re
                date_match = re.search(r'(\d{2})/(\d{2})', raw_date)
                date_part = ""
                time_part = "00:00" # Por defecto
                if date_match:
                    day = date_match.group(1)
                    month = date_match.group(2)
                    
                    # Logica para el año: Si el mes es menor a 7 (enero-junio), asumimos que es el año siguiente al de inicio de temporada (2026->2027)
                    # Pero el usuario dijo "sabiendo que estamos en 2026". Usaremos 2026 por defecto y 2027 si es enero-junio.
                    calc_year = CURRENT_YEAR if int(month) >= 7 else CURRENT_YEAR + 1
                    date_part = f"{calc_year}-{month}-{day}"
                
                if not date_part:
                    logging.warning(f"Omitiendo fila sin fecha: {raw_date}")
                    continue

                # 3. Equipos y escudos
                team_links = row.locator('a.team-name').all()
                if len(team_links) < 2:
                    continue
                
                home_team = team_links[0].inner_text().strip()
                away_team = team_links[1].inner_text().strip()
                
                # Para los escudos, buscamos los img en la fila
                logos = row.locator('img[alt^="logo"]').all()
                home_logo = ""
                away_logo = ""
                if len(logos) >= 2:
                    home_logo = logos[0].get_attribute('data-src') or logos[0].get_attribute('src')
                    away_logo = logos[1].get_attribute('data-src') or logos[1].get_attribute('src')

                is_home = "milan" in home_team.lower()
                opponent = away_team if is_home else home_team
                
                # Fix logo for Milan Futuro
                MILAN_LOGO = "https://b2-content.tuttocampo.it/Teams/80/1234787.png"
                if is_home:
                    home_logo = MILAN_LOGO
                else:
                    away_logo = MILAN_LOGO

                # 4. Enlace Info para extraer detalles adicionales
                info_link = row.locator('a.btn.info').get_attribute('href')
                if info_link:
                    if not info_link.startswith("http"):
                        info_link = f"https://www.tuttocampo.it{info_link}"
                
                # Datos por defecto
                stadium = ""
                result_home = None
                result_away = None
                
                if info_link:
                    logging.info(f"Visitando Info de la Jornada {jornada_text}...")
                    info_page = context.new_page()
                    try:
                        info_page.goto(info_link, wait_until="domcontentloaded", timeout=20000)
                        
                        # Extraer estadio
                        try:
                            stadium_el = info_page.locator('a.stadium')
                            if stadium_el.count() > 0:
                                st_text = stadium_el.first.inner_text().strip()
                                stadium = st_text.replace("STADIO: ", "").replace("Stadio: ", "").strip()
                        except:
                            pass
                        
                        # Extraer resultado
                        try:
                            goal_div = info_page.locator('.match-goal')
                            if goal_div.count() > 0:
                                home_goals = goal_div.locator('.home').inner_text().strip()
                                away_goals = goal_div.locator('.away').inner_text().strip()
                                
                                if home_goals.isdigit() and away_goals.isdigit():
                                    result_home = int(home_goals)
                                    result_away = int(away_goals)
                        except:
                            pass
                            
                        # El arbitro se extraerá pero no se guarda a menos que exista la columna en Supabase
                        # try:
                        #     referee = info_page.locator('.select2-chosen').inner_text().strip()
                        # except:
                        #     pass
                    except Exception as e:
                        logging.error(f"Error cargando página de info para jornada {jornada_text}: {e}")
                    finally:
                        info_page.close()

                status = "Finished" if result_home is not None else "Scheduled"
                
                match_data = {
                    "season_id": SEASON_ID,
                    "date": date_part,
                    "time": time_part,
                    "opponent": opponent,
                    "is_home": is_home,
                    "home_logo": home_logo,
                    "away_logo": away_logo,
                    "stadium": stadium,
                    "competition": competition,
                    "result_home": result_home,
                    "result_away": result_away,
                    "status": status 
                }
                
                if supabase:
                    existing = supabase.table("matches").select("id").eq("date", date_part).eq("opponent", opponent).execute()
                    if existing and existing.data and len(existing.data) > 0:
                        supabase.table("matches").update(match_data).eq("id", existing.data[0]['id']).execute()
                        logging.info(f"Actualizado: {opponent} el {date_part} (Jornada {jornada_text})")
                    else:
                        supabase.table("matches").insert(match_data).execute()
                        logging.info(f"Insertado: {opponent} el {date_part} (Jornada {jornada_text})")
                else:
                    logging.info(f"[DRY RUN] Partido extraído: {match_data}")

            except Exception as e:
                logging.error(f"Error procesando fila {idx}: {e}")
                
        browser.close()
        logging.info("Scraping finalizado.")

if __name__ == "__main__":
    run()
