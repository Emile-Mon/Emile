import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Émile"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"

    # Database & Cache Settings
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "emile_db")

    @property
    def DATABASE_URL_ASYNC(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    # Data Provider Endpoints & Keys
    HELIUS_API_KEY: str = os.getenv("HELIUS_API_KEY", "")
    PUMP_FUN_WS_URL: str = os.getenv("PUMP_FUN_WS_URL", "wss://pumpscan.helius-rpc.com")
    DEXSCREENER_API_BASE: str = "https://api.dexscreener.com/latest/dex"
    SOLANA_RPC_URL: str = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")

    # Object Storage for 64x64 WebP thumbnails
    STORAGE_LOCAL_PATH: str = os.getenv("STORAGE_LOCAL_PATH", "./storage/thumbnails")
    S3_BUCKET: str = os.getenv("S3_BUCKET", "emile-thumbnails")
    CDN_BASE_URL: str = os.getenv("CDN_BASE_URL", "https://cdn.emile.xyz/t")

    # ML & Jar Threshold Parameters
    CAPACITY_D: int = 28
    AUC_TARGET: float = 0.60
    AUC_FLOOR: float = 0.50
    DELTA_CONFIDENCE: float = 0.05

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
