import os
from dotenv import load_dotenv
load_dotenv(override=True)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Émile"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"

    @property
    def RAW_DATABASE_URL(self) -> str:
        url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or "postgresql://postgres:postgres@localhost:5432/emile_db"
        return url.strip()

    @property
    def DATABASE_URL_ASYNC(self) -> str:
        url = self.RAW_DATABASE_URL
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

    DEFAULT_CHAIN: str = os.getenv("DEFAULT_CHAIN", "robinhood")
    DEFAULT_CHAIN_LABEL: str = "Robinhood Chain"
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

    # Target Token Contract Addresses (CAs) & Axiom URLs
    EMILE_TOKEN_CA: str = os.getenv("EMILE_TOKEN_CA", "0xe2e4a2404c3923990ccc1e6435dc5b6476284992")
    EMILE_BANANA_TOKEN_CA: str = os.getenv("EMILE_BANANA_TOKEN_CA", "0x3c51485b11d52f90c251e74875a8b93c81027274")
    EMILE_AXIOM_URL: str = os.getenv("EMILE_AXIOM_URL", "https://axiom.trade/token/0xe2e4a2404c3923990ccc1e6435dc5b6476284992?chain=robinhood&chains=robinhood,bnb")
    EMILE_BANANA_AXIOM_URL: str = os.getenv("EMILE_BANANA_AXIOM_URL", "https://axiom.trade/token/0x3c51485b11d52f90c251e74875a8b93c81027274?chain=robinhood&chains=robinhood,bnb")

    # Twitter / X API v2 Credentials & Auto-Post Settings
    TWITTER_API_KEY: str = os.getenv("TWITTER_API_KEY", "")
    TWITTER_API_SECRET: str = os.getenv("TWITTER_API_SECRET", "")
    TWITTER_ACCESS_TOKEN: str = os.getenv("TWITTER_ACCESS_TOKEN", "")
    TWITTER_ACCESS_TOKEN_SECRET: str = os.getenv("TWITTER_ACCESS_TOKEN_SECRET", "")
    TWITTER_BEARER_TOKEN: str = os.getenv("TWITTER_BEARER_TOKEN", "")
    TWITTER_AUTO_POST_ENABLED: bool = os.getenv("TWITTER_AUTO_POST_ENABLED", "false").lower() in ("true", "1", "yes")
    TWITTER_POST_INTERVAL_HOURS: int = int(os.getenv("TWITTER_POST_INTERVAL_HOURS", "2"))
    TWITTER_MANAGED_BY_HANDLE: str = os.getenv("TWITTER_MANAGED_BY_HANDLE", "@emilelearns")
    USE_FULL_CA: bool = os.getenv("USE_FULL_CA", "false").lower() in ("true", "1", "yes")

    # Xiaomi MiMo LLM Settings
    MIMO_API_KEY: str = os.getenv("MIMO_API_KEY", "")
    MIMO_BASE_URL: str = os.getenv("MIMO_BASE_URL", "https://token-plan-sgp.xiaomimimo.com/v1")
    MIMO_MODEL: str = os.getenv("MIMO_MODEL", "mimo-v2.5-pro")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
