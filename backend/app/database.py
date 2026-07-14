from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///./travel_expenses.db")

_connect_args = {"check_same_thread": False, "timeout": 30} if DB_PATH.startswith("sqlite") else {}

engine = create_engine(
    DB_PATH,
    connect_args=_connect_args,
    echo=False,
)

if DB_PATH.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        # WAL mode: safer under concurrent access and survives unclean shutdowns
        cur.execute("PRAGMA journal_mode=WAL")
        # Flush and truncate WAL on each new connection to clear stale state
        cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
        # Busy timeout so readers wait instead of immediately failing
        cur.execute("PRAGMA busy_timeout=10000")
        cur.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
