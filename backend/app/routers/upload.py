import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import aiofiles

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("")
async def upload_receipt(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only PDF, JPEG, PNG and WebP files are allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "File exceeds 10 MB limit")

    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    return JSONResponse({"url": f"/api/files/{filename}", "filename": filename})
