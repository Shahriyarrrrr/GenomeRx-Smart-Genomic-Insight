# app/train_models.py
"""
Train per-antibiotic classifiers and save them to backend/models/*.joblib

Modes:
  - synthetic (default): fast, generates learnable dummy models so the API can use real predict_proba()
  - folder: train from a labeled dataset folder (see --data-root layout below)

Labels convention:
  class 1 = Susceptible   (consistent with predict_service / UI)
  class 0 = Resistant

Run:
  # from the backend folder with venv active
  python -m app.train_models --mode synthetic

  # or, to train from your own data later
  python -m app.train_models --mode folder --data-root data/

Data layout for --mode folder (example):
  data/
    ciprofloxacin/
      susceptible/   *.fasta|*.fa|*.csv
      resistant/     *.fasta|*.fa|*.csv
    meropenem/
      susceptible/   ...
      resistant/     ...
  (repeat per antibiotic)
"""

import argparse
import os
from pathlib import Path
import random
import numpy as np
from joblib import dump
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score

# Local imports
from .utils_fasta import read_any_sequence, kmer_counts
from .amr_model import normalize_name

# Keep this in sync with predict_service.ANTIBIOTICS
ANTIBIOTICS = [
    "Ceftriaxone",
    "Ciprofloxacin",
    "Meropenem",
    "Azithromycin",
    "Gentamicin",
    "Piperacillin-Tazobactam",
    "Amoxicillin",
]

MODELS_DIR = Path("models")
MODELS_DIR.mkdir(exist_ok=True)


# ------------------------- Synthetic dataset -------------------------
def build_synthetic_dataset(n_samples: int = 600, seed: int = 1337):
    """
    Create a synthetic, learnable dataset that mimics 4-mer count vectors.
    We generate Poisson-like nonnegative features (shape: [n, 256]) and define
    labels from a hidden linear rule so LogisticRegression can learn it.
    """
    rng = np.random.default_rng(seed)
    n_feat = 256  # 4-mer space
    X = rng.poisson(lam=3.0, size=(n_samples, n_feat)).astype(float)

    # Hidden weight vector to define 'susceptible' vs 'resistant'
    w = rng.normal(0, 1, size=(n_feat,))
    margin = X @ w + rng.normal(0, 3, size=(n_samples,))
    thresh = np.median(margin)
    y = (margin > thresh).astype(int)  # 1 = susceptible, 0 = resistant

    return X, y


# ------------------------- Folder dataset -------------------------
def load_labeled_sequences_for_antibiotic(root: Path, antibiotic: str, k: int = 4):
    """
    Expect structure:
      root/<antibiotic-normalized>/{susceptible,resistant}/*.(fasta|fa|csv)
    Returns X (n, 256) and y (n,) with 1=Susceptible, 0=Resistant
    """
    anti_dir = root / normalize_name(antibiotic)
    sus_dir = anti_dir / "susceptible"
    res_dir = anti_dir / "resistant"

    X, y = [], []
    for label, d in [(1, sus_dir), (0, res_dir)]:
        if not d.exists():
            continue
        for p in d.glob("*"):
            if p.suffix.lower() not in {".fasta", ".fa", ".csv"}:
                continue
            data = p.read_bytes()
            seq = read_any_sequence(p.name, data)
            vec = kmer_counts(seq, k)
            X.append(vec)
            y.append(label)

    if not X:
        return None, None
    return np.asarray(X, dtype=float), np.asarray(y, dtype=int)


# ------------------------- Train & save -------------------------
def train_and_save(X, y, out_path: Path):
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    clf = LogisticRegression(
        solver="liblinear",       # supports predict_proba
        class_weight="balanced",
        max_iter=1000,
    )
    clf.fit(Xtr, ytr)

    # Simple metrics
    yhat = clf.predict(Xte)
    acc = accuracy_score(yte, yhat)
    try:
        auc = roc_auc_score(yte, clf.predict_proba(Xte)[:, 1])
    except Exception:
        auc = float("nan")

    dump(clf, out_path)
    return acc, auc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["synthetic", "folder"], default="synthetic")
    ap.add_argument("--data-root", type=str, help="Root folder for labeled data (used when --mode folder)")
    ap.add_argument("--samples", type=int, default=600, help="Synthetic samples per antibiotic")
    args = ap.parse_args()

    print(f"Models directory: {MODELS_DIR.resolve()}")

    if args.mode == "synthetic":
        print("Training synthetic models for all antibiotics…")
        for name in ANTIBIOTICS:
            model_path = MODELS_DIR / f"{normalize_name(name)}.joblib"
            X, y = build_synthetic_dataset(n_samples=args.samples, seed=abs(hash(name)) % (2**32))
            acc, auc = train_and_save(X, y, model_path)
            print(f"  • {name:<24} → {model_path.name}   acc={acc:.3f}  auc={auc:.3f}")
        print("Done. Restart the API and test predictions.")

    else:
        if not args.data_root:
            raise SystemExit("--data-root is required for --mode folder")
        root = Path(args.data_root)
        if not root.exists():
            raise SystemExit(f"Data root not found: {root}")

        print(f"Training from folder dataset: {root}")
        for name in ANTIBIOTICS:
            model_path = MODELS_DIR / f"{normalize_name(name)}.joblib"
            X, y = load_labeled_sequences_for_antibiotic(root, name, k=4)
            if X is None:
                print(f"  • {name:<24} … skipped (no data)")
                continue
            acc, auc = train_and_save(X, y, model_path)
            print(f"  • {name:<24} → {model_path.name}   acc={acc:.3f}  auc={auc:.3f}")
        print("Done. Restart the API and test predictions.")


if __name__ == "__main__":
    main()
