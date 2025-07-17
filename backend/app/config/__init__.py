from sqlalchemy import create_engine

from dotenv import load_dotenv

from os import getenv

import psycopg2

from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from logging import info

from models import Base

from sqlalchemy.orm import sessionmaker
 
load_dotenv()
 
 
DB_USERNAME = getenv("postgres")

DB_PASSWORD = getenv("postgres")

DB_HOST = getenv("172.28.77.151")
_PORT = getenv("5432")

DB_NAME = getenv("forecast_management_db")
 
DATABASE_URL="postgresql://postgres:postgres@172.28.77.151:5432/forecast_management_db"
 
 
def create_db_if_not_exists():
 
    dbname = DB_NAME

    user = DB_USERNAME

    password = DB_PASSWORD

    host = DB_HOST
 
    # Connection

    conn = psycopg2.connect(dbname='postgres', user=user, host=host, password=password)

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    cursor = conn.cursor()
 
    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname='{dbname}'")

    exists = cursor.fetchone()
 
    if not exists:

        cursor.execute(f'CREATE DATABASE {dbname}')

        info(f"Database {dbname} created successfully!")

    else:

        info(f"Database {dbname} already exists.")
 
    cursor.close()

    conn.close()
 
create_db_if_not_exists()
 
engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(bind=engine)
 
def init_db():
 
    # Base.metadata.drop_all(engine)

    Base.metadata.create_all(engine)

 