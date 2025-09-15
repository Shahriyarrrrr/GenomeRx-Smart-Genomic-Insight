# app/predict_service.py
from datetime import datetime
import random
from .utils_fasta import read_any_sequence
from .amr_model import ModelManager

ANTIBIOTICS = [
    "Ceftriaxone",
    "Ciprofloxacin",
    "Meropenem",
    "Azithromycin",
    "Gentamicin",
    "Piperacillin-Tazobactam",
    "Amoxicillin",
]

PATHOGENS = [
    "Escherichia coli",
    "Staphylococcus aureus",
    "Klebsiella pneumoniae",
    "Pseudomonas aeruginosa",
    "Salmonella enterica",
]

GENE_CANDIDATES = ["blaCTX-M", "mecA", "NDM-1", "KPC", "aac(6')-Ib", "qnrS", "gyrA_S83L"]

# Global model manager (will look in backend/models/)
MODEL = ModelManager(models_dir="models", k=4)


def _rng_seed_from(filename: str, data: bytes, seq: str) -> int:
    s = f"{filename}|{len(data)}|{len(seq)}"
    h = 0
    for ch in s:
        h = (h * 131 + ord(ch)) & 0xFFFFFFFF
    return h


def run_predict(filename: str, data: bytes) -> dict:
    """
    Accept FASTA/CSV/PDF (PDF currently stub) and return the UI's expected shape.
    If a per-antibiotic model exists in models/*.joblib, use it.
    Otherwise fall back to deterministic simulated scores.
    """
    seq = read_any_sequence(filename, data)
    seed = _rng_seed_from(filename, data, seq)
    rnd = random.Random(seed)

    pathogen = rnd.choice(PATHOGENS)

    antibiotics = []
    for name in ANTIBIOTICS:
        proba = MODEL.predict_proba(name, seq)  # P(class=1). We interpret class=1 as 'Susceptible'.
        if proba is None:
            # Fallback (no model on disk): simulated, realistic-ish range
            sus = rnd.randint(40, 95)
        else:
            # Convert to percentage
            sus = int(round(proba * 100))
        res = 100 - sus
        antibiotics.append({"name": name, "susceptible": sus, "resistant": res})

    antibiotics_sorted = sorted(antibiotics, key=lambda a: a["susceptible"], reverse=True)
    recommendations = [{"name": a["name"], "confidence": a["susceptible"]} for a in antibiotics_sorted[:3]]

    # MDR flag: here true if ≥3 antibiotics have susceptible<40 (rare with models unless they output low probs)
    mdr = sum(1 for a in antibiotics if a["susceptible"] < 40) >= 3

    genes = sorted(set(rnd.sample(GENE_CANDIDATES, rnd.randint(0, 2))))

    return {
        "fileName": filename,
        "date": datetime.utcnow().isoformat(),
        "pid": rnd.randint(10000, 99999),
        "pathogen": pathogen,
        "antibiotics": antibiotics_sorted,
        "recommendations": recommendations,
        "mdr": mdr,
        "genes": genes,
    }
