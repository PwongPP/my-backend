from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Registration
from pydantic import BaseModel

Base.metadata.create_all(bind=engine)

app = FastAPI()

class RegistrationCreate(BaseModel):
    full_name: str
    email: str
    phone: str | None = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register")
def create_registration(data: RegistrationCreate, db: Session = Depends(get_db)):
    reg = Registration(**data.dict())
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg

@app.get("/registrations")
def get_registrations(db: Session = Depends(get_db)):
    return db.query(Registration).all()
