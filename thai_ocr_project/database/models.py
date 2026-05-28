from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base
import datetime

Base = declarative_base()

class DigitalEvidenceRecord(Base):
    __tablename__ = 'digital_evidence_records'

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_number = Column(String(50), default="DE-2026-0528")
    bank_name = Column(String(100), nullable=False)
    transaction_date = Column(String(100))
    sender_name = Column(String(200))
    receiver_name = Column(String(200))
    amount = Column(Float, default=0.0)
    qr_payload = Column(String(500))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def __repr__(self):
        return f"<DigitalEvidenceRecord(id={self.id}, bank='{self.bank_name}', amount={self.amount})>"
