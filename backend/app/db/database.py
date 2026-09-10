from app.core.config import settings

# Robust database engine loader
try:
    import asyncpg
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
    DATABASE_URL = settings.DATABASE_URL_ASYNC
    clean_url = DATABASE_URL.split("?")[0]
    engine = create_async_engine(
        clean_url, 
        echo=False, 
        future=True,
        connect_args={"ssl": "require"}
    )
    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
except Exception:
    try:
        import aiosqlite
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        DATABASE_URL = "sqlite+aiosqlite:///./emile_dev.db"
        engine = create_async_engine(DATABASE_URL, echo=False, future=True)
        AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    except Exception:
        # Fallback dummy session generator when DB drivers are absent
        engine = None
        AsyncSessionLocal = None

from sqlalchemy.orm import declarative_base
Base = declarative_base()

async def get_db():
    if AsyncSessionLocal is not None:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    else:
        # Yield None if database drivers are not installed
        yield None
