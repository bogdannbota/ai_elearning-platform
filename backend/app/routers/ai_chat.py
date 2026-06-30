from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json
import re

from app.database import get_db
from app.core.ai_client import ai_client
from app.routers.auth import get_current_user  # auth corect (Bearer), nu app.core.auth

router = APIRouter(prefix="/ai", tags=["AI Navigation"])


class NavigateRequest(BaseModel):
    message: str


class NavigateResponse(BaseModel):
    answer: str
    route: str | None = None


# Rute reale, valide pentru toate rolurile
ALLOWED_ROUTES = ["/cursuri", "/exams", "/profile", "/dashboard"]


def build_system_prompt(role: str) -> str:
    return f"""
Ești un asistent de navigare integrat într-o platformă de e-learning.
Rolul utilizatorului curent este: {role}.

Rolul tău:
- ajuți utilizatorul să găsească unde se află cursurile, examenele, profilul, dashboard-ul
- NU efectuezi tu redirecționarea; doar indici ruta potrivită, iar utilizatorul decide dacă o accesează

RUTE DISPONIBILE (folosește DOAR aceste valori la "route"):
- /cursuri    -> lista cursurilor
- /exams      -> examenele disponibile
- /profile    -> profilul utilizatorului
- /dashboard  -> tabloul de bord

REGULI OBLIGATORII:
- răspunzi DOAR cu JSON valid, fără text suplimentar, fără markdown
- "answer" = explicație scurtă în limba română
- "route" = una dintre rutele de mai sus, SAU null dacă întrebarea nu cere navigare

FORMAT OBLIGATORIU:
{{ "answer": "text scurt", "route": "/cursuri" }}
sau
{{ "answer": "text scurt", "route": null }}
"""


def _safe_json(text: str):
    try:
        return json.loads(text)
    except Exception:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except Exception:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise


@router.post("/navigate", response_model=NavigateResponse)
def navigate(
    request: NavigateRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role = getattr(user, "role", None)
    role = role.value if hasattr(role, "value") else str(role)

    messages = [
        {"role": "system", "content": build_system_prompt(role)},
        {"role": "user", "content": request.message},
    ]

    content = ai_client.chat(messages)

    try:
        parsed = _safe_json(content)
        answer = parsed.get("answer") or "Nu am un răspuns acum."
        route = parsed.get("route")
        # validăm ruta: dacă AI-ul inventează o rută inexistentă, o ignorăm
        if route not in ALLOWED_ROUTES:
            route = None
        return {"answer": answer, "route": route}
    except Exception:
        return {"answer": content, "route": None}