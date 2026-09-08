import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Émile"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"

    # Raw database URL input
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgres://9446e742920b798f5d290b243cf838fc1f5806e7170c55c98cf16577c344aaf0:sk_fnBsEkU9uFtWEkWb2oRtF@pooled.db.prisma.io:5432/postgres?sslmode=require"
    )

    @property
    def DATABASE_URL_ASYNC(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        if "sslmode=require" in url:
            url = url.replace("sslmode=require", "ssl=require")
        return url

    @property
    def DATABASE_URL_SYNC(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        elif url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
        elif url.startswith("postgresql+psycopg2://"):
            url = url.replace("postgresql+psycopg2://", "postgresql://", 1)
        return url

    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    # Data Provider Endpoints & Keys
    HELIUS_API_KEY: str = os.getenv("HELIUS_API_KEY", "")

    @property
    def CLEAN_HELIUS_API_KEY(self) -> str:
        key = self.HELIUS_API_KEY.strip()
        if "api-key=" in key:
            key = key.split("api-key=")[-1].split("&")[0]
        elif key.startswith("http://") or key.startswith("https://"):
            key = key.rstrip("/").split("/")[-1]
        return key

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
