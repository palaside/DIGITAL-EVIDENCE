from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, DigitalEvidenceRecord

class EvidenceDatabaseManager:
    def __init__(self, db_url: str = "sqlite:///digital_evidence.db"):
        self.engine = create_engine(db_url, echo=False)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)

    def save_record(self, record_data: dict) -> DigitalEvidenceRecord:
        """Saves a new digital evidence OCR transaction record into SQLite database."""
        session = self.Session()
        record = DigitalEvidenceRecord(
            bank_name=record_data.get("bank_name", "UNKNOWN"),
            transaction_date=record_data.get("transaction_date", "UNKNOWN"),
            sender_name=record_data.get("sender_name", "UNKNOWN"),
            receiver_name=record_data.get("receiver_name", "UNKNOWN"),
            amount=record_data.get("amount", 0.0),
            qr_payload=record_data.get("qr_payload", "UNKNOWN")
        )
        session.add(record)
        session.commit()
        # Refresh to load the autoincrement database ID
        session.refresh(record)
        session.close()
        return record
