from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
import sqlite3

DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///./travel_expenses.db")

_connect_args = {"check_same_thread": False, "timeout": 30} if DB_PATH.startswith("sqlite") else {}

engine = create_engine(
    DB_PATH,
    connect_args=_connect_args,
    echo=False,
)

if DB_PATH.startswith("sqlite"):
    # Per-connection: only set busy_timeout — never re-set journal_mode to
    # avoid locking protocol errors when the file is already in WAL mode.
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA busy_timeout=10000")
        cur.close()

    # One-time startup: open a raw connection and checkpoint any stale WAL.
    # Done before the pool starts so no locking conflicts arise.
    _db_file = DB_PATH.replace("sqlite:///", "").replace("sqlite://", "")
    try:
        _raw = sqlite3.connect(_db_file, timeout=10)
        _raw.execute("PRAGMA busy_timeout=10000")
        _raw.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        _raw.close()
    except Exception:
        pass  # non-fatal: SQLite will self-recover on first query

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
