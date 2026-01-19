from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

TARGET_BASE = "https://edu.std-900.ist.mospolytech.ru/exam-2024-1"
API_KEY = "42fea230-497a-44ef-9980-21238395e175"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "proxy alive"}

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(path: str, request: Request):
    print(f"[PROXY] {request.method} /{path}")

    url = f"{TARGET_BASE}/{path}"

    params = dict(request.query_params)
    if request.method in {"GET", "DELETE"} and "api_key" not in params:
        params["api_key"] = API_KEY

    headers = dict(request.headers)
    headers.pop("host", None)

    async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
        resp = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            params=params,
            content=await request.body(),
        )

    excluded = {
        "content-encoding",
        "transfer-encoding",
        "connection",
        "content-length",
    }

    response_headers = {
        k: v for k, v in resp.headers.items()
        if k.lower() not in excluded
    }

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=response_headers,
    )
