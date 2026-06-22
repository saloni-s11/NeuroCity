from fastapi import Query, APIRouter
from typing import List

from models.city import NarrationBriefing, NarrationRecommendation
from services.narration_service import get_briefing, get_recommendations

router = APIRouter(prefix="/narration", tags=["narration"])


@router.get("/briefing", response_model=NarrationBriefing)
def narration_briefing(city: str = Query("Mumbai")):
    """
    AI-generated executive briefing (Groq LLM when available, rule-based fallback).
    Includes city health, trend explanations, key risks, and opportunities.
    """
    return get_briefing(city=city)


@router.get("/recommendations", response_model=List[NarrationRecommendation])
def narration_recommendations(city: str = Query("Mumbai")):
    """
    Ranked AI recommendations (Groq LLM when available, rule-based fallback).
    Sorted by composite impact × confidence score descending.
    """
    return get_recommendations(city=city)
