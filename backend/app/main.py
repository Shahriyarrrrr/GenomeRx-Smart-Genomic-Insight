import os
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import PredictResponse
from .predict_service import run_predict
from .db import init_db, add_prediction, list_predictions

app = FastAPI(title="GenomeRx AMR API", version="0.3.0")

# -----------------------------------------------------------------------
# CORS
# -----------------------------------------------------------------------
# Read from env var ALLOWED_ORIGINS (comma-separated list of URLs).
# Defaults to "*" so the Netlify frontend can always reach the backend.
#
# To lock it down, set this env var in Render:
#   ALLOWED_ORIGINS=https://your-site.netlify.app,http://localhost:5173
# -----------------------------------------------------------------------
_raw = os.environ.get("ALLOWED_ORIGINS", "*").strip()

if _raw == "*":
    ALLOWED_ORIGINS = ["*"]
    _allow_creds = False   # credentials flag must be False when origin is "*"
else:
    ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]
    _allow_creds = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=_allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    init_db()

@app.get("/health")
def health():
    return {"ok": True, "service": "GenomeRx AMR API"}

@app.post("/api/v1/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)):
    try:
        data = await file.read()
        result = run_predict(file.filename, data)
        add_prediction(result)          # log to DB
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Prediction failed")

# Same behavior, just the upload-style name your UI can use
@app.post("/api/v1/upload-predict", response_model=PredictResponse)
async def upload_predict(file: UploadFile = File(...)):
    return await predict(file)

# NEW: typed response so Swagger shows a proper schema (list of predictions)
@app.get("/api/v1/history", response_model=List[PredictResponse])
def history(limit: int = 25):
    return list_predictions(limit)
