from pydantic import BaseModel, ConfigDict



class DestroySession(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session_id: int 

class DestroyAllSession(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: int 

