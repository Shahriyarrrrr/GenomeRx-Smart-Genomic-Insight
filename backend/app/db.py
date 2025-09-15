# app/db.py
import os, json, sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(__file__))   # backend/
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH  = os.path.join(DATA_DIR, "genomerx.db")

def _conn():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    with _conn() as con:
        con.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            filename TEXT NOT NULL,
            pid INTEGER NOT NULL,
            pathogen TEXT NOT NULL,
            antibiotics TEXT NOT NULL,
            recommendations TEXT NOT NULL,
            genes TEXT NOT NULL,
            mdr INTEGER NOT NULL
        );
        """)

def add_prediction(p: dict):
    with _conn() as con:
        con.execute("""
            INSERT INTO predictions
                (date, filename, pid, pathogen, antibiotics, recommendations, genes, mdr)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            p["date"],
            p["fileName"],
            int(p.get("pid", 0)),
            p["pathogen"],
            json.dumps(p["antibiotics"]),
            json.dumps(p["recommendations"]),
            json.dumps(p.get("genes", [])),
            1 if p.get("mdr") else 0,
        ))

def list_predictions(limit: int = 50):
    with _conn() as con:
        rows = con.execute("""
            SELECT date, filename, pid, pathogen, antibiotics, recommendations, genes, mdr
            FROM predictions
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

    out = []
    for (date, filename, pid, pathogen, antibiotics, recommendations, genes, mdr) in rows:
        out.append({
            "date": date,
            "fileName": filename,
            "pid": pid,
            "pathogen": pathogen,
            "antibiotics": json.loads(antibiotics),
            "recommendations": json.loads(recommendations),
            "genes": json.loads(genes),
            "mdr": bool(mdr),
        })
    return out
