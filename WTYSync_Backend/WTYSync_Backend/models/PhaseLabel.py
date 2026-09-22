from database.db import db


class PhaseLabel(db.Model):
    """
    Mirrors the shape of temp_values: ONE ROW PER DEVICE (serial_no),
    with the same 24 phase columns (R1, Y1, B1, N1 ... R6, Y6, B6, N6).
    Here each column holds the user's custom display name for that
    phase instead of a reading.

    This table is completely separate from temp_values — nothing in
    that table or its model is touched. temp_values keeps storing raw
    numeric readings; this one just stores the label text per column.

    A column value of NULL means "not renamed yet" -> the frontend
    should fall back to showing the raw code (e.g. "R1").
    """
    __tablename__ = "phase_labels"

    id = db.Column(db.Integer, primary_key=True)
    serial_no = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # Same 24 columns as temp_values, same order — just text instead of float.
    R1 = db.Column(db.String(64), nullable=True)
    Y1 = db.Column(db.String(64), nullable=True)
    B1 = db.Column(db.String(64), nullable=True)
    N1 = db.Column(db.String(64), nullable=True)

    R2 = db.Column(db.String(64), nullable=True)
    Y2 = db.Column(db.String(64), nullable=True)
    B2 = db.Column(db.String(64), nullable=True)
    N2 = db.Column(db.String(64), nullable=True)

    R3 = db.Column(db.String(64), nullable=True)
    Y3 = db.Column(db.String(64), nullable=True)
    B3 = db.Column(db.String(64), nullable=True)
    N3 = db.Column(db.String(64), nullable=True)

    R4 = db.Column(db.String(64), nullable=True)
    Y4 = db.Column(db.String(64), nullable=True)
    B4 = db.Column(db.String(64), nullable=True)
    N4 = db.Column(db.String(64), nullable=True)

    R5 = db.Column(db.String(64), nullable=True)
    Y5 = db.Column(db.String(64), nullable=True)
    B5 = db.Column(db.String(64), nullable=True)
    N5 = db.Column(db.String(64), nullable=True)

    R6 = db.Column(db.String(64), nullable=True)
    Y6 = db.Column(db.String(64), nullable=True)
    B6 = db.Column(db.String(64), nullable=True)
    N6 = db.Column(db.String(64), nullable=True)