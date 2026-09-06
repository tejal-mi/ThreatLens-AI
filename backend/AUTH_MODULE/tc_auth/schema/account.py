from pydantic import BaseModel, EmailStr, ConfigDict


class SuperUpdateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: int 
    name: str | None = None
    email: EmailStr | None = None
    handle: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    role: str | None = None  
    status: str | None = None  
    password: str | None = None


class SuperCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    email: EmailStr | None = None
    handle: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    role: str | None = None  
    status: str | None = None  
    password: str | None = None


class SuperDeleteSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: int


class UpdatePassword(BaseModel):
    model_config = ConfigDict(extra="forbid")
    password: str


class UpdateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    email: EmailStr | None = None
    handle: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
