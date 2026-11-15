"""FastAPI entry point: `uvicorn backend.main:app --reload` from the repo root. Loads data, profiles and the graph once at startup."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.data_store.loader import get_store
from backend.app.orchestration.graph import build_graph
from backend.app.tools.profile_tools import load_profiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_store()
    load_profiles()
    build_graph()
    yield


app = FastAPI(title="Trojan Compass API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["GET", "POST"],
                   allow_headers=["Authorization", "Content-Type"])
app.include_router(router)
