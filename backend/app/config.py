"""Central configuration — reads all environment variables."""
import os


class Settings:
    # Database
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///./travel_expenses.db")

    # Active Directory
    ad_enabled: bool = os.environ.get("AD_ENABLED", "false").lower() == "true"
    ad_server: str = os.environ.get("AD_SERVER", "")
    ad_domain: str = os.environ.get("AD_DOMAIN", "")
    ad_base_dn: str = os.environ.get("AD_BASE_DN", "")
    ad_bind_user: str = os.environ.get("AD_BIND_USER", "")
    ad_bind_password: str = os.environ.get("AD_BIND_PASSWORD", "")

    # Google Maps
    google_maps_api_key: str = os.environ.get("GOOGLE_MAPS_API_KEY", "")

    # VLM
    vlm_enabled: bool = os.environ.get("VLM_ENABLED", "false").lower() == "true"
    vlm_base_url: str = os.environ.get("VLM_BASE_URL", "")
    vlm_api_key: str = os.environ.get("VLM_API_KEY", "")
    vlm_model: str = os.environ.get("VLM_MODEL", "default")

    # Projects file
    projects_file: str = os.environ.get("PROJECTS_FILE", "./config/projects.yaml")


settings = Settings()
