"""Load projects and work packages from a YAML/JSON config file into the DB."""
import json
import logging
import os
from sqlalchemy.orm import Session
from app.models import Project, WorkPackage
import uuid

log = logging.getLogger(__name__)


def _parse_file(path: str) -> list[dict] | None:
    """Return the projects list from the config file, or None if unavailable."""
    if not os.path.exists(path):
        log.info("Projects file not found at %s — skipping file-based load.", path)
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        if path.endswith(".json"):
            data = json.loads(content)
        else:
            # Try PyYAML; fall back to a minimal built-in parser for simple cases
            try:
                import yaml  # type: ignore
                data = yaml.safe_load(content)
            except ImportError:
                # No PyYAML — attempt JSON fallback (won't work for YAML comments)
                log.warning("PyYAML not installed; attempting JSON parse of projects file.")
                data = json.loads(content)
        projects = data.get("projects", []) if isinstance(data, dict) else []
        log.info("Loaded %d project(s) from %s", len(projects), path)
        return projects
    except Exception as exc:
        log.error("Failed to parse projects file %s: %s", path, exc)
        return None


VALID_FUNDERS = {"FFG", "FWF", "CDG", "OTHER"}


def load_projects_from_file(db: Session, path: str) -> bool:
    """Upsert projects + work packages from file. Returns True if file was loaded."""
    projects = _parse_file(path)
    if projects is None:
        return False

    for proj_data in projects:
        code = str(proj_data.get("code", "")).upper().strip()
        name = str(proj_data.get("name", code)).strip()
        funder = str(proj_data.get("funder", "OTHER")).upper().strip()
        if funder not in VALID_FUNDERS:
            funder = "OTHER"
        active = bool(proj_data.get("active", True))

        if not code:
            continue

        proj = db.query(Project).filter(Project.code == code, Project.deleted_at.is_(None)).first()
        if proj:
            # Update mutable fields
            proj.name = name
            proj.funder = funder
            proj.active = active
        else:
            proj = Project(id=str(uuid.uuid4()), code=code, name=name, funder=funder, active=active)
            db.add(proj)
            db.flush()  # get proj.id

        for wp_data in proj_data.get("work_packages", []):
            wp_code = str(wp_data.get("code", "")).strip()
            wp_name = str(wp_data.get("name", wp_code)).strip()
            if not wp_code:
                continue
            existing_wp = db.query(WorkPackage).filter(
                WorkPackage.project_id == proj.id,
                WorkPackage.code == wp_code,
                WorkPackage.deleted_at.is_(None),
            ).first()
            if existing_wp:
                existing_wp.name = wp_name
            else:
                db.add(WorkPackage(
                    id=str(uuid.uuid4()),
                    project_id=proj.id,
                    code=wp_code,
                    name=wp_name,
                    active=True,
                ))

    db.commit()
    log.info("Projects file upserted into DB.")
    return True
