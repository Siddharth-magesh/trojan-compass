"""Housing tools: listing search and rent maths in code; reports 'no data collected' honestly while listings are empty."""

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.agent_result import RecordRef
from backend.app.schemas.response import HousingCard
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool

NO_DATA = "Housing listings have not been collected yet, so no listings can be shown."


class SearchHousingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    max_rent_usd: float | None = Field(default=None, ge=100, le=20000)
    bedrooms: int | None = Field(default=None, ge=0, le=6)
    max_distance_miles: float | None = Field(default=None, gt=0, le=50)


class MonthlyCostInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    monthly_rent_usd: float = Field(ge=0, le=20000)
    roommates: int = Field(default=0, ge=0, le=6)
    utilities_usd: float = Field(default=0, ge=0, le=2000)


def _num(value: object) -> float | None:
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


@tool("search_housing", "Search housing listings by max monthly rent, bedrooms and distance to campus.", SearchHousingInput)
def search_housing(args: SearchHousingInput, ctx: ToolContext) -> ToolOutput:
    listings = ctx.store.records("listings")
    if not listings:
        return ToolOutput(tool="search_housing", status="no_data", unknowns=[NO_DATA])
    matches = []
    for r in listings:
        rent, dist, beds = _num(r.get("monthly_rent_usd")), _num(r.get("distance_to_campus_miles")), _num(r.get("bedrooms"))
        # Unknown values never pass a numeric filter: we cannot claim a listing is under budget without a rent.
        if args.max_rent_usd is not None and (rent is None or rent > args.max_rent_usd):
            continue
        if args.bedrooms is not None and beds != args.bedrooms:
            continue
        if args.max_distance_miles is not None and (dist is None or dist > args.max_distance_miles):
            continue
        matches.append(r)
    matches.sort(key=lambda r: _num(r.get("monthly_rent_usd")) or 0)
    out = ToolOutput(tool="search_housing", status="ok" if matches else "not_found")
    for r in matches[:5]:
        rid = str(r["listing_id"])
        rent, beds = _num(r.get("monthly_rent_usd")), _num(r.get("bedrooms"))
        citation = ctx.store.citation("listings", rid)
        card = HousingCard(listing_id=rid, name=str(r.get("name", rid)), monthly_rent_usd=r.get("monthly_rent_usd", "unknown"),
                           bedrooms=r.get("bedrooms", "unknown"),
                           rent_per_person_usd=round(rent / beds, 2) if rent is not None and beds else "unknown",
                           distance_to_campus_miles=r.get("distance_to_campus_miles", "unknown"),
                           neighborhood=str(r.get("neighborhood", "unknown")), source=citation)
        out.cards.append(card.model_dump())
        out.records.append(RecordRef(category="listings", record_id=rid))
        out.citations.append(citation)
        out.add_fact(f"{card.name}: ${card.monthly_rent_usd}/month, {card.bedrooms} bedrooms, {card.distance_to_campus_miles} miles.")
    if not matches:
        out.unknowns.append("No collected listings match these filters.")
    return out


@tool("monthly_cost", "Compute per-person monthly housing cost from rent, roommates and utilities.", MonthlyCostInput)
def monthly_cost(args: MonthlyCostInput, ctx: ToolContext) -> ToolOutput:
    total = args.monthly_rent_usd + args.utilities_usd
    per_person = round(total / (args.roommates + 1), 2)
    budget = ctx.profile.get("housing_budget_usd")
    facts = [f"Total ${total:.2f}/month split {args.roommates + 1} ways is ${per_person:.2f} per person."]
    if isinstance(budget, (int, float)):
        facts.append(f"That is {'within' if per_person <= budget else 'over'} the student's ${budget:.0f} budget.")
    return ToolOutput(tool="monthly_cost", facts=facts)
