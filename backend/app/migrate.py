"""Lightweight migration helper for SQLite.
Runs ALTER TABLE ADD COLUMN statements for any column that does not yet exist.
Safe to re-run on every startup (checks existence first).
"""
from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

log = logging.getLogger(__name__)


def _columns(db: Session, table: str) -> set[str]:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def _add_column(db: Session, table: str, column: str, definition: str) -> None:
    existing = _columns(db, table)
    if column not in existing:
        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        db.commit()
        log.info("Migration: added column %s.%s", table, column)


def run_migrations(db: Session) -> None:
    """Add any missing columns to existing tables."""

    # travel_requests new columns
    _add_column(db, "travel_requests", "work_package", "VARCHAR(200)")
    _add_column(db, "travel_requests", "departure_time", "DATETIME")
    _add_column(db, "travel_requests", "return_time", "DATETIME")

    # route_legs table is created by create_all if missing,
    # but we ensure the table exists via create_all in main.py
    log.info("Migrations complete.")
