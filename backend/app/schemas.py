from pydantic import BaseModel, Field
from typing import List

class AntibioticScore(BaseModel):
    name: str
    susceptible: int = Field(ge=0, le=100)
    resistant: int = Field(ge=0, le=100)

class Recommendation(BaseModel):
    name: str
    confidence: int

class PredictResponse(BaseModel):
    fileName: str
    date: str
    pid: int
    pathogen: str
    antibiotics: List[AntibioticScore]
    recommendations: List[Recommendation]
    mdr: bool
    genes: List[str]
