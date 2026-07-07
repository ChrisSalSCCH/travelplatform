from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

log = logging.getLogger(__name__)


def _columns(db: Session, table: str) -> set[str]:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def _tables(db: Session) -> set[str]:
    rows = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
    return {row[0] for row in rows}


def _add_column(db: Session, table: str, column: str, definition: str) -> None:
    if table not in _tables(db):
        return
    existing = _columns(db, table)
    if column not in existing:
        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        db.commit()
        log.info("Migration: added column %s.%s", table, column)


def run_migrations(db: Session) -> None:
    # travel_requests — original additions
    _add_column(db, "travel_requests", "work_package", "VARCHAR(200)")
    _add_column(db, "travel_requests", "departure_time", "DATETIME")
    _add_column(db, "travel_requests", "return_time", "DATETIME")

    # travel_requests — new fields
    _add_column(db, "travel_requests", "first_name", "VARCHAR(100) NOT NULL DEFAULT ''")
    _add_column(db, "travel_requests", "last_name", "VARCHAR(100) NOT NULL DEFAULT ''")
    _add_column(db, "travel_requests", "meal_breakfast", "BOOLEAN NOT NULL DEFAULT 0")
    _add_column(db, "travel_requests", "meal_lunch", "BOOLEAN NOT NULL DEFAULT 0")
    _add_column(db, "travel_requests", "meal_dinner", "BOOLEAN NOT NULL DEFAULT 0")

    # Make destination/email/department nullable (already nullable in new model)
    # SQLite doesn\'t support DROP NOT NULL, existing rows are fine

    # route_legs — waypoints
    _add_column(db, "route_legs", "waypoints", "TEXT")

    log.info("Migrations complete.")
