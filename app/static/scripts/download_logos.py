#!/usr/bin/env python3
import os
import requests
from PIL import Image
from io import BytesIO

# Define the main image directories
teams_dir = "../images/teams"
drivers_dir = "../images/drivers"

# Create directories if they don't exist
os.makedirs(teams_dir, exist_ok=True)
os.makedirs(drivers_dir, exist_ok=True)

# Team logos - official high quality sources
team_logos = {
    # Core F1 teams
    "mercedes": "https://www.formula1.com/content/dam/fom-website/teams/2024/mercedes-logo.png.transform/2col/image.png",
    "red-bull": "https://www.formula1.com/content/dam/fom-website/teams/2024/red-bull-racing-logo.png.transform/2col/image.png",
    "ferrari": "https://www.formula1.com/content/dam/fom-website/teams/2024/ferrari-logo.png.transform/2col/image.png",
    "mclaren": "https://www.formula1.com/content/dam/fom-website/teams/2024/mclaren-logo.png.transform/2col/image.png",
    "aston-martin": "https://www.formula1.com/content/dam/fom-website/teams/2024/aston-martin-logo.png.transform/2col/image.png",
    "alpine": "https://www.formula1.com/content/dam/fom-website/teams/2024/alpine-logo.png.transform/2col/image.png",
    "williams": "https://www.formula1.com/content/dam/fom-website/teams/2024/williams-logo.png.transform/2col/image.png",
    "rb": "https://www.formula1.com/content/dam/fom-website/teams/2024/rb-logo.png.transform/2col/image.png",
    "kick-sauber": "https://www.formula1.com/content/dam/fom-website/teams/2024/kick-sauber-logo.png.transform/2col/image.png",
    "haas": "https://www.formula1.com/content/dam/fom-website/teams/2024/haas-f1-team-logo.png.transform/2col/image.png",
    
    # Historical teams (using latest available or appropriate alternatives)
    "alphatauri": "https://www.formula1.com/content/dam/fom-website/teams/2023/alphatauri-logo.png.transform/2col/image.png",
    "toro-rosso": "https://www.formula1.com/content/dam/fom-website/teams/2019/toro-rosso-logo.png.transform/2col/image.png",
    "racing-point": "https://www.formula1.com/content/dam/fom-website/teams/2020/racing-point-logo.png.transform/2col/image.png",
    "force-india": "https://www.formula1.com/content/dam/fom-website/teams/2018/force-india-logo.png.transform/2col/image.png",
    "renault": "https://www.formula1.com/content/dam/fom-website/teams/2020/renault-logo.png.transform/2col/image.png",
    "alfa-romeo": "https://www.formula1.com/content/dam/fom-website/teams/2023/alfa-romeo-logo.png.transform/2col/image.png",
    "sauber": "https://www.formula1.com/content/dam/fom-website/teams/2018/sauber-logo.png.transform/2col/image.png",
    "lotus-f1": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Lotus_F1_logo.svg/320px-Lotus_F1_logo.svg.png",
    "manor": "https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Manor_Racing_logo.svg/320px-Manor_Racing_logo.svg.png",
    "marussia": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/Marussia_F1_Team_logo.svg/320px-Marussia_F1_Team_logo.svg.png",
}

# Driver images - headshots from F1 official site
driver_images = {
    # Current drivers
    "lewis-hamilton": "https://www.formula1.com/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/2col/image.png",
    "george-russell": "https://www.formula1.com/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/2col/image.png",
    "max-verstappen": "https://www.formula1.com/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/2col/image.png",
    "sergio-perez": "https://www.formula1.com/content/dam/fom-website/drivers/S/SERPER01_Sergio_Perez/serper01.png.transform/2col/image.png",
    "charles-leclerc": "https://www.formula1.com/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/2col/image.png",
    "carlos-sainz-jr": "https://www.formula1.com/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/2col/image.png",
    "lando-norris": "https://www.formula1.com/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/2col/image.png",
    "oscar-piastri": "https://www.formula1.com/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/2col/image.png",
    "fernando-alonso": "https://www.formula1.com/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/2col/image.png",
    "lance-stroll": "https://www.formula1.com/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/2col/image.png",
    "esteban-ocon": "https://www.formula1.com/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/2col/image.png",
    "pierre-gasly": "https://www.formula1.com/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/2col/image.png",
    "alexander-albon": "https://www.formula1.com/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/2col/image.png",
    "logan-sargeant": "https://www.formula1.com/content/dam/fom-website/drivers/L/LOGSAR01_Logan_Sargeant/logsar01.png.transform/2col/image.png",
    "daniel-ricciardo": "https://www.formula1.com/content/dam/fom-website/drivers/D/DANRIC01_Daniel_Ricciardo/danric01.png.transform/2col/image.png",
    "yuki-tsunoda": "https://www.formula1.com/content/dam/fom-website/drivers/Y/YUKTSU01_Yuki_Tsunoda/yuktsu01.png.transform/2col/image.png",
    "nico-hulkenberg": "https://www.formula1.com/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/2col/image.png",
    "kevin-magnussen": "https://www.formula1.com/content/dam/fom-website/drivers/K/KEVMAG01_Kevin_Magnussen/kevmag01.png.transform/2col/image.png",
    "valtteri-bottas": "https://www.formula1.com/content/dam/fom-website/drivers/V/VALBOT01_Valtteri_Bottas/valbot01.png.transform/2col/image.png",
    "guanyu-zhou": "https://www.formula1.com/content/dam/fom-website/drivers/G/GUAZHO01_Guanyu_Zhou/guazho01.png.transform/2col/image.png",
    "franco-colapinto": "https://www.formula1.com/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/2col/image.png",
    "liam-lawson": "https://www.formula1.com/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/2col/image.png",
    "jack-doohan": "https://www.formula1.com/content/dam/fom-website/drivers/J/JACDOO01_Jack_Doohan/jacdoo01.png.transform/2col/image.png",
    
    # Recent former drivers
    "sebastian-vettel": "https://www.formula1.com/content/dam/fom-website/drivers/S/SEBVET01_Sebastian_Vettel/sebvet01.png.transform/2col/image.png",
    "kimi-raikkonen": "https://www.formula1.com/content/dam/fom-website/drivers/K/KIMRAI01_Kimi_Raikk%C3%B6nen/kimrai01.png.transform/2col/image.png",
    "mick-schumacher": "https://www.formula1.com/content/dam/fom-website/drivers/M/MICSCH02_Mick_Schumacher/micsch02.png.transform/2col/image.png",
    "nicholas-latifi": "https://www.formula1.com/content/dam/fom-website/drivers/N/NICLAF01_Nicholas_Latifi/niclaf01.png.transform/2col/image.png",
    "antonio-giovinazzi": "https://www.formula1.com/content/dam/fom-website/drivers/A/ANTGIO01_Antonio_Giovinazzi/antgio01.png.transform/2col/image.png",
    "nikita-mazepin": "https://www.formula1.com/content/dam/fom-website/drivers/N/NIKMAZ01_Nikita_Mazepin/nikmaz01.png.transform/2col/image.png",
    "romain-grosjean": "https://www.formula1.com/content/dam/fom-website/drivers/R/ROMGRO01_Romain_Grosjean/romgro01.png.transform/2col/image.png",
    "daniil-kvyat": "https://www.formula1.com/content/dam/fom-website/drivers/D/DANKVY01_Daniil_Kvyat/dankvy01.png.transform/2col/image.png",
    "robert-kubica": "https://www.formula1.com/content/dam/fom-website/drivers/R/ROBKUB01_Robert_Kubica/robkub01.png.transform/2col/image.png",
    "sergey-sirotkin": "https://www.formula1.com/content/dam/fom-website/drivers/S/SERSIR01_Sergey_Sirotkin/sersir01.png.transform/2col/image.png",
    "stoffel-vandoorne": "https://www.formula1.com/content/dam/fom-website/drivers/S/STOVAN01_Stoffel_Vandoorne/stovan01.png.transform/2col/image.png",
    "felipe-massa": "https://www.formula1.com/content/dam/fom-website/drivers/F/FELMAS01_Felipe_Massa/felmas01.png.transform/2col/image.png",
    "jolyon-palmer": "https://www.formula1.com/content/dam/fom-website/drivers/J/JOLPAL01_Jolyon_Palmer/jolpal01.png.transform/2col/image.png",
    "marcus-ericsson": "https://www.formula1.com/content/dam/fom-website/drivers/M/MARERI01_Marcus_Ericsson/mareri01.png.transform/2col/image.png",
    "pascal-wehrlein": "https://www.formula1.com/content/dam/fom-website/drivers/P/PASWEH01_Pascal_Wehrlein/pasweh01.png.transform/2col/image.png",
    "jenson-button": "https://www.formula1.com/content/dam/fom-website/drivers/J/JENBUT01_Jenson_Button/jenbut01.png.transform/2col/image.png",
    "nico-rosberg": "https://www.formula1.com/content/dam/fom-website/drivers/N/NICROS01_Nico_Rosberg/nicros01.png.transform/2col/image.png",
    "felipe-nasr": "https://www.formula1.com/content/dam/fom-website/drivers/F/FELNAS01_Felipe_Nasr/felnas01.png.transform/2col/image.png",
    "rio-haryanto": "https://www.formula1.com/content/dam/fom-website/drivers/R/RIOHAR01_Rio_Haryanto/riohar01.png.transform/2col/image.png",
    "esteban-gutierrez": "https://www.formula1.com/content/dam/fom-website/drivers/E/ESTGUT01_Esteban_Gutierrez/estgut01.png.transform/2col/image.png",
    "nyck-de-vries": "https://www.formula1.com/content/dam/fom-website/drivers/N/NYCDEV01_Nyck_De%20Vries/nycdev01.png.transform/2col/image.png",
    "brendon-hartley": "https://www.formula1.com/content/dam/fom-website/drivers/B/BREHAR01_Brendon_Hartley/brehar01.png.transform/2col/image.png",
    "pastor-maldonado": "https://www.formula1.com/content/dam/fom-website/drivers/P/PASMAL01_Pastor_Maldonado/pasmal01.png.transform/2col/image.png",
    "paul-di-resta": "https://www.formula1.com/content/dam/fom-website/drivers/P/PAUDIR01_Paul_di_Resta/paudir01.png.transform/2col/image.png",
    "will-stevens": "https://www.formula1.com/content/dam/fom-website/drivers/W/WILSTE01_Will_Stevens/wilste01.png.transform/2col/image.png",
    "roberto-merhi": "https://www.formula1.com/content/dam/fom-website/drivers/R/ROBMER01_Roberto_Merhi/robmer01.png.transform/2col/image.png",
    
    # Newer drivers
    "gabriel-bortoleto": "https://www.formula2.com/content/dam/fom-website/2018-redesign-assets/drivers/2024/gabrie_bortoleto.png.transform/2col-retina/image.png"
}

# Function to download an image
def download_image(url, save_path):
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        # Open the image to verify it's valid
        img = Image.open(BytesIO(response.content))
        
        # Save the image
        with open(save_path, 'wb') as f:
            f.write(response.content)
            
        print(f"Downloaded: {save_path}")
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

# Download team logos
for team_name, logo_url in team_logos.items():
    download_image(logo_url, os.path.join(teams_dir, f"{team_name}.png"))

# Download driver images
for driver_name, image_url in driver_images.items():
    download_image(image_url, os.path.join(drivers_dir, f"{driver_name}.png"))

print("Download completed!") 