from pydantic import BaseModel, ConfigDict


class OAuthConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str
    client_secret: str
    redirect_uri: str



class EmailConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    host: str
    port: int
    username: str
    password: str
    sender: str
    sender_name: str | None = None
    use_tls: bool = True


class JWTConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    secret_key: str
    algorithm: str
    session_duration_days: int