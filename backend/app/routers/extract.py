import base64
import json
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import httpx
from app.config import settings

router = APIRouter(prefix="/extract-amount", tags=["extract"])

ALLOWED = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


def _pdf_to_png_base64(data: bytes) -> str | None:
    """Render first page of PDF to PNG, return base64. Requires pypdf + Pillow."""
    try:
        from pypdf import PdfReader
        from PIL import Image
        import io as _io

        reader = PdfReader(_io.BytesIO(data))
        page = reader.pages[0]
        images = list(page.images)
        if images:
            img_data = images[0].data
            img = Image.open(_io.BytesIO(img_data)).convert("RGB")
            buf = _io.BytesIO()
            img.save(buf, format="PNG")
            return base64.b64encode(buf.getvalue()).decode()
    except Exception:
        pass
    return None


@router.post("")
async def extract_amount(file: UploadFile = File(...)):
    if not settings.vlm_enabled or not settings.vlm_base_url:
        return JSONResponse({"amount": None, "error": "VLM not configured"})

    if file.content_type not in ALLOWED:
        return JSONResponse({"amount": None, "error": "unsupported_type"})

    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        return JSONResponse({"amount": None, "error": "file_too_large"})

    media_type = file.content_type
    if media_type == "application/pdf":
        b64 = _pdf_to_png_base64(data)
        if not b64:
            return JSONResponse({"amount": None, "error": "pdf_render_failed"})
        media_type = "image/png"
    else:
        b64 = base64.b64encode(data).decode()

    prompt = (
        "You are a receipt parser. Extract the TOTAL amount due in EUR from this receipt or invoice image. "
        "Respond with ONLY a valid JSON object, no markdown, no explanation: "
        '{"amount": <number or null>}'
    )

    payload = {
        "model": settings.vlm_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                ],
            }
        ],
        "max_tokens": 64,
        "temperature": 0,
    }

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.vlm_api_key:
        headers["Authorization"] = f"Bearer {settings.vlm_api_key}"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{settings.vlm_base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"].strip()
            content = content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(content)
            amount = parsed.get("amount")
            if amount is not None:
                amount = round(float(amount), 2)
            return JSONResponse({"amount": amount, "confidence": "vlm"})
    except Exception as e:
        return JSONResponse({"amount": None, "error": str(e)[:120]})
