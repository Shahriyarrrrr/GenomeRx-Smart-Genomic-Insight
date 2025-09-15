# app/amr_model.py
from pathlib import Path
from typing import Dict, Optional
import re
import numpy as np
from joblib import load
from .utils_fasta import kmer_counts


def normalize_name(name: str) -> str:
    """Normalize antibiotic names to safe filenames, e.g. 'Piperacillin-Tazobactam' -> 'piperacillin_tazobactam'."""
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


class ModelManager:
    """
    Loads per-antibiotic classifiers from models/*.joblib.
    Each classifier is expected to output P(class=1) via predict_proba.
    We treat class=1 as 'Susceptible' by default (see note below).
    """

    def __init__(self, models_dir: str = "models", k: int = 4):
        self.dir = Path(models_dir)
        self.k = k
        self.cache: Dict[str, object] = {}

    def _path(self, model_name: str) -> Path:
        return self.dir / f"{model_name}.joblib"

    def has(self, model_name: str) -> bool:
        return self._path(model_name).exists()

    def load(self, model_name: str):
        if model_name in self.cache:
            return self.cache[model_name]
        p = self._path(model_name)
        if p.exists():
            model = load(p)
            self.cache[model_name] = model
            return model
        return None

    def predict_proba(self, antibiotic_name: str, seq: str) -> Optional[float]:
        """
        Returns P(class=1) for the given antibiotic, or None when the model is missing.
        If your model uses class=1 = 'Resistant' instead, invert below where used.
        """
        model_name = normalize_name(antibiotic_name)
        model = self.load(model_name)
        if model is None:
            return None

        # Feature: 4-mer counts (length 4^4 = 256)
        X = np.array([kmer_counts(seq, self.k)], dtype=float)

        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(X)[0][1]
            return float(proba)

        if hasattr(model, "decision_function"):
            # Map margin to (0..1) with sigmoid
            import math
            score = model.decision_function(X)[0]
            return float(1.0 / (1.0 + math.exp(-score)))

        # Fallback to hard prediction
        y = model.predict(X)[0]
        return float(y)
