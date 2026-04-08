"""
Hardware Tracker — Raudvara inventuur ja jälgimise süsteem
"""

import sqlite3
import os
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
app.config["DATABASE"] = os.path.join(os.path.dirname(__file__), "hardware_tracker.db")


# ─── Database ────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Loo andmebaasi tabelid kui need puuduvad."""
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            icon TEXT DEFAULT 'box',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            serial_number TEXT,
            category_id INTEGER,
            status TEXT DEFAULT 'available' CHECK(status IN ('available','in_use','broken','repair','retired')),
            location_id INTEGER,
            assigned_to TEXT,
            assigned_date TEXT,
            purchase_date TEXT,
            purchase_price REAL,
            warranty_until TEXT,
            manufacturer TEXT,
            model TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (category_id) REFERENCES categories(id),
            FOREIGN KEY (location_id) REFERENCES locations(id)
        );

        -- Vaikimisi kategooriad
        INSERT OR IGNORE INTO categories (id, name, icon) VALUES
            (1, 'Arvuti', 'laptop'),
            (2, 'Monitor', 'monitor'),
            (3, 'Telefon', 'smartphone'),
            (4, 'Printer', 'printer'),
            (5, 'Võrguseade', 'wifi'),
            (6, 'Server', 'server'),
            (7, 'Tablett', 'tablet'),
            (8, 'Klaviatuur/Hiir', 'keyboard'),
            (9, 'Peakomplekt', 'headphones'),
            (10, 'Muud', 'box');
    """)
    db.commit()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def now_iso():
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ─── Dashboard ──────────────────────────────────────────────────────────────

@app.route("/api/dashboard")
def api_dashboard():
    db = get_db()
    total = db.execute("SELECT COUNT(*) as c FROM assets").fetchone()["c"]

    by_status = {}
    for row in db.execute("SELECT status, COUNT(*) as c FROM assets GROUP BY status"):
        by_status[row["status"]] = row["c"]

    by_category = []
    for row in db.execute("""
        SELECT c.name, c.icon, COUNT(a.id) as c
        FROM categories c
        LEFT JOIN assets a ON a.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name
    """):
        by_category.append(dict(row))

    recent = []
    for row in db.execute(
        "SELECT id, name, status, updated_at FROM assets ORDER BY updated_at DESC LIMIT 5"
    ):
        recent.append(dict(row))

    return jsonify({
        "total": total,
        "by_status": by_status,
        "by_category": by_category,
        "recent": recent,
    })


# ─── Assets ──────────────────────────────────────────────────────────────────

@app.route("/api/assets")
def api_assets():
    db = get_db()
    query = """
        SELECT a.*,
               c.name AS category_name, c.icon AS category_icon,
               l.name AS location_name
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE 1=1
    """
    params = []

    # Filtrid
    if request.args.get("search"):
        query += " AND (a.name LIKE ? OR a.serial_number LIKE ? OR a.assigned_to LIKE ?)"
        s = f"%{request.args.get('search')}%"
        params.extend([s, s, s])

    if request.args.get("status"):
        query += " AND a.status = ?"
        params.append(request.args.get("status"))

    if request.args.get("category_id"):
        query += " AND a.category_id = ?"
        params.append(request.args.get("category_id"))

    if request.args.get("location_id"):
        query += " AND a.location_id = ?"
        params.append(request.args.get("location_id"))

    query += " ORDER BY a.updated_at DESC"

    rows = db.execute(query, params).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/assets/<int:asset_id>")
def api_asset_get(asset_id):
    db = get_db()
    row = db.execute("""
        SELECT a.*,
               c.name AS category_name, c.icon AS category_icon,
               l.name AS location_name
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.id = ?
    """, (asset_id,)).fetchone()
    return jsonify(row_to_dict(row))


@app.route("/api/assets", methods=["POST"])
def api_asset_create():
    db = get_db()
    data = request.get_json()

    required = ["name"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"Field '{field}' is required"}), 400

    cur = db.execute("""
        INSERT INTO assets (
            name, serial_number, category_id, status, location_id,
            assigned_to, assigned_date, purchase_date, purchase_price,
            warranty_until, manufacturer, model, notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("name"),
        data.get("serial_number"),
        data.get("category_id") or None,
        data.get("status", "available"),
        data.get("location_id") or None,
        data.get("assigned_to"),
        data.get("assigned_date"),
        data.get("purchase_date"),
        data.get("purchase_price"),
        data.get("warranty_until"),
        data.get("manufacturer"),
        data.get("model"),
        data.get("notes"),
        now_iso(),
    ))
    db.commit()

    # Tagasta uus kirje
    row = db.execute("SELECT * FROM assets WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201


@app.route("/api/assets/<int:asset_id>", methods=["PUT"])
def api_asset_update(asset_id):
    db = get_db()
    data = request.get_json()

    fields = [
        "name", "serial_number", "category_id", "status", "location_id",
        "assigned_to", "assigned_date", "purchase_date", "purchase_price",
        "warranty_until", "manufacturer", "model", "notes"
    ]
    sets = []
    vals = []
    for f in fields:
        if f in data:
            sets.append(f"{f} = ?")
            vals.append(data[f])

    if not sets:
        return jsonify({"error": "No fields to update"}), 400

    sets.append("updated_at = ?")
    vals.append(now_iso())
    vals.append(asset_id)

    db.execute(f"UPDATE assets SET {', '.join(sets)} WHERE id = ?", vals)
    db.commit()

    row = db.execute("""
        SELECT a.*, c.name AS category_name, c.icon AS category_icon,
               l.name AS location_name
        FROM assets a
        LEFT JOIN categories c ON a.category_id = c.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.id = ?
    """, (asset_id,)).fetchone()
    return jsonify(row_to_dict(row))


@app.route("/api/assets/<int:asset_id>", methods=["DELETE"])
def api_asset_delete(asset_id):
    db = get_db()
    db.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
    db.commit()
    return jsonify({"ok": True})


# ─── Categories ───────────────────────────────────────────────────────────────

@app.route("/api/categories")
def api_categories():
    db = get_db()
    rows = db.execute("SELECT * FROM categories ORDER BY name").fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/categories", methods=["POST"])
def api_category_create():
    db = get_db()
    data = request.get_json()
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400
    icon = data.get("icon", "box")
    try:
        cur = db.execute(
            "INSERT INTO categories (name, icon) VALUES (?, ?)", (name, icon)
        )
        db.commit()
        row = db.execute("SELECT * FROM categories WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify(row_to_dict(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Category already exists"}), 409


@app.route("/api/categories/<int:cat_id>", methods=["PUT"])
def api_category_update(cat_id):
    db = get_db()
    data = request.get_json()
    name = (data.get("name") or "").strip()
    icon = data.get("icon", "box")
    if not name:
        return jsonify({"error": "Name is required"}), 400
    db.execute("UPDATE categories SET name = ?, icon = ? WHERE id = ?", (name, icon, cat_id))
    db.commit()
    row = db.execute("SELECT * FROM categories WHERE id = ?", (cat_id,)).fetchone()
    return jsonify(row_to_dict(row))


@app.route("/api/categories/<int:cat_id>", methods=["DELETE"])
def api_category_delete(cat_id):
    db = get_db()
    db.execute("DELETE FROM categories WHERE id = ?", (cat_id,))
    db.commit()
    return jsonify({"ok": True})


# ─── Locations ────────────────────────────────────────────────────────────────

@app.route("/api/locations")
def api_locations():
    db = get_db()
    rows = db.execute("SELECT * FROM locations ORDER BY name").fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/locations", methods=["POST"])
def api_location_create():
    db = get_db()
    data = request.get_json()
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400
    try:
        cur = db.execute("INSERT INTO locations (name) VALUES (?)", (name,))
        db.commit()
        row = db.execute("SELECT * FROM locations WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify(row_to_dict(row)), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Location already exists"}), 409


@app.route("/api/locations/<int:loc_id>", methods=["DELETE"])
def api_location_delete(loc_id):
    db = get_db()
    db.execute("DELETE FROM locations WHERE id = ?", (loc_id,))
    db.commit()
    return jsonify({"ok": True})


# ─── Start ───────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
