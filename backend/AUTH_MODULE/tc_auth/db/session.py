from sqlalchemy.orm import sessionmaker
from sqlalchemy import Engine

def create_session_factory(engine: Engine):
    return sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )