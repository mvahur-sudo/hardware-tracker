# Hardware Tracker

Lihtne ja praktiline raudvara inventuur ja jälgimise süsteem firmadele.

## Funktsioonid

- **Ülevaade (Dashboard)** — statistika: koguarv, vabasoojad, kasutuses, rikkis, retireeritud
- **Varade register** — kõik seadmed ühes kohas
- **Kategooriad** — arvutid, monitorid, telefonid, võrguseadmed jne
- **Asukohad** — kontor, ladu, töötajad
- **Staatused** — saadaval, kasutuses, rikkis, remondil, retireeritud
- **Otsing ja filtrid** — otsi nime, seerianumbri, asukoha järgi
- **Omistamine** — kes kasutab, millal
- **Teave** — hind, garantii, tootja, mudel, ostukuupäev

## Tehnoloogia

- **Backend:** Python Flask + SQLite
- **Frontend:** HTML + CSS + JavaScript (vanilla)
- **API:** RESTful JSON

## Paigaldamine

```bash
# Klooni projekt
git clone https://github.com/mvahur-sudo/hardware-tracker.git
cd hardware-tracker

# Paigalda sõltuvused
pip install -r requirements.txt

# Käivita
python app.py
```

Ava brauseris: http://localhost:5000

## API

| Meetod | Ruta | Kirjeldus |
|--------|------|-----------|
| GET | `/api/dashboard` | Statistika |
| GET | `/api/assets` | Kõik varad (filtritega) |
| GET | `/api/assets/<id>` | Üks vara |
| POST | `/api/assets` | Uus vara |
| PUT | `/api/assets/<id>` | Muuda varat |
| DELETE | `/api/assets/<id>` | Kustuta vara |
| GET | `/api/categories` | Kategooriad |
| POST | `/api/categories` | Uus kategooria |
| GET | `/api/locations` | Asukohad |
| POST | `/api/locations` | Uus asukoht |

## Andmebaasi skeem

**assets**
- `id`, `name`, `serial_number`, `category_id`, `status`, `location_id`
- `assigned_to`, `purchase_date`, `purchase_price`, `warranty_until`
- `manufacturer`, `model`, `notes`, `created_at`, `updated_at`

**categories**
- `id`, `name`, `icon`, `created_at`

**locations**
- `id`, `name`, `created_at`
