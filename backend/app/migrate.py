from sqlalchemy import text
from sqlalchemy.orm import Session
import logging

log = logging.getLogger(__name__)


def _col_names(db: Session, table: str) -> set[str]:
    rows = db.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def _tables(db: Session) -> set[str]:
    rows = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
    return {row[0] for row in rows}


def _add_column(db: Session, table: str, column: str, definition: str) -> None:
    if table not in _tables(db):
        return
    if column not in _col_names(db, table):
        db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
        db.commit()
        log.info("Migration: added column %s.%s", table, column)


def _needs_nullable_fix(db: Session) -> bool:
    if "travel_requests" not in _tables(db):
        return False
    rows = db.execute(text("PRAGMA table_info(travel_requests)")).fetchall()
    for row in rows:
        if row[1] == "employee_email" and row[3] == 1:
            return True
    return False


def _recreate_travel_requests(db: Session) -> None:
    log.info("Migration: recreating travel_requests for nullable fix...")
    existing_cols = _col_names(db, "travel_requests")
    db.execute(text("ALTER TABLE travel_requests RENAME TO travel_requests_old"))
    db.execute(text("""
        CREATE TABLE travel_requests (
            id VARCHAR(36) PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL DEFAULT '',
            last_name VARCHAR(100) NOT NULL DEFAULT '',
            employee_name VARCHAR(200) NOT NULL DEFAULT '',
            employee_email VARCHAR(200),
            department VARCHAR(200),
            destination VARCHAR(300),
            purpose VARCHAR(500) NOT NULL,
            work_package VARCHAR(200),
            trip_start DATE NOT NULL,
            trip_end DATE NOT NULL,
            departure_time DATETIME,
            return_time DATETIME,
            meal_breakfast BOOLEAN NOT NULL DEFAULT 0,
            meal_lunch BOOLEAN NOT NULL DEFAULT 0,
            meal_dinner BOOLEAN NOT NULL DEFAULT 0,
            project_id VARCHAR(36) NOT NULL REFERENCES projects(id),
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            rejection_reason TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            deleted_at DATETIME
        )
    """))
    new_cols = [
        "id", "first_name", "last_name", "employee_name", "employee_email",
        "department", "destination", "purpose", "work_package",
        "trip_start", "trip_end", "departure_time", "return_time",
        "meal_breakfast", "meal_lunch", "meal_dinner",
        "project_id", "status", "rejection_reason", "created_at", "updated_at", "deleted_at",
    ]
    select_parts = []
    for c in new_cols:
        if c in existing_cols:
            select_parts.append(c)
        elif c in ("first_name", "last_name", "employee_name"):
            select_parts.append(f"'' AS {c}")
        elif c in ("meal_breakfast", "meal_lunch", "meal_dinner"):
            select_parts.append(f"0 AS {c}")
        else:
            select_parts.append(f"NULL AS {c}")
    db.execute(text(f"""
        INSERT INTO travel_requests ({', '.join(new_cols)})
        SELECT {', '.join(select_parts)} FROM travel_requests_old
    """))
    db.execute(text("DROP TABLE travel_requests_old"))
    db.commit()
    log.info("Migration: travel_requests recreated.")


def run_migrations(db: Session) -> None:
    if _needs_nullable_fix(db):
        _recreate_travel_requests(db)
    _add_column(db, "travel_requests", "work_package",  "VARCHAR(200)")
    _add_column(db, "travel_requests", "departure_time", "DATETIME")
    _add_column(db, "travel_requests", "return_time",    "DATETIME")
    _add_column(db, "travel_requests", "first_name",     "VARCHAR(100) NOT NULL DEFAULT ''")
    _add_column(db, "travel_requests", "last_name",      "VARCHAR(100) NOT NULL DEFAULT ''")
    _add_column(db, "travel_requests", "meal_breakfast", "BOOLEAN NOT NULL DEFAULT 0")
    _add_column(db, "travel_requests", "meal_lunch",     "BOOLEAN NOT NULL DEFAULT 0")
    _add_column(db, "travel_requests", "meal_dinner",    "BOOLEAN NOT NULL DEFAULT 0")
    _add_column(db, "route_legs",      "waypoints",       "TEXT")
    _add_column(db, "route_legs",      "odometer_end",    "NUMERIC(10,1)")
    _add_column(db, "expense_items",   "paid_privately",    "BOOLEAN NOT NULL DEFAULT 1")
    _add_column(db, "expense_items",   "receipt_approved",  "BOOLEAN")
    _add_column(db, "expense_items",   "kreditor",          "VARCHAR(200)")
    _add_column(db, "expense_items",   "approved_amount",   "NUMERIC(10,2)")
    _add_column(db, "expense_items",   "approval_comment",  "TEXT")
    _add_column(db, "expense_items",   "vat_rate",          "NUMERIC(5,2)")
    log.info("Migrations complete.")
