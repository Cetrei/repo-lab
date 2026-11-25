"""HTTP adapter for local development.

The static site never uses it: the browser calls the dispatcher directly through Pyodide. This adapter
exposes the same dispatcher over HTTP so the web app can be developed against a normal server and the
two transports can be compared. Run it with `uv run python -m repo_api.http`.
"""

from __future__ import annotations

from typing import Annotated, Any

from .app import DISPATCHER

STATUS_BY_CODE = {"unknown_endpoint": 404}


def create_app() -> Any:
    from fastapi import Body, FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse

    app = FastAPI(title="REPO Lab API", docs_url="/docs")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/api")
    def endpoints() -> list[dict[str, str]]:
        return DISPATCHER.registry.describe()

    @app.post("/api/{name}")
    def call(name: str, payload: Annotated[Any, Body()] = None) -> JSONResponse:
        envelope = DISPATCHER.dispatch(name, payload)
        if envelope["ok"]:
            return JSONResponse(envelope)
        status = STATUS_BY_CODE.get(envelope["error"]["code"], 400)
        return JSONResponse(envelope, status_code=status)

    return app


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(create_app(), host="127.0.0.1", port=8000)
