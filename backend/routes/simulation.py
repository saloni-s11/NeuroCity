from fastapi import Query, APIRouter
from typing import List

from models.city import (
    SimulationPreset,
    SimulationRequest,
    SimulationResult,
)
from services.simulation_service import (
    get_presets,
    run_simulation,
)

router = APIRouter(prefix="/simulation", tags=["simulation"])


@router.post("/run", response_model=SimulationResult)
def simulation_run(req: SimulationRequest, city: str = Query("Mumbai")):
    """
    Run a scenario simulation.
    Accepts scenario type and parameters, returns projected impacts,
    AI narrative, risk level, and recommendations.

    Valid scenarios: population_growth, ev_adoption, renewable_energy, climate_event
    """
    return run_simulation(req.scenario, req.params, city=city)


@router.get("/presets", response_model=List[SimulationPreset])
def simulation_presets(city: str = Query("Mumbai")):
    """
    Returns preset scenario configurations for quick-start simulations.
    Each preset includes scenario type, pre-configured parameters, and tags.
    """
    return get_presets(city=city)
