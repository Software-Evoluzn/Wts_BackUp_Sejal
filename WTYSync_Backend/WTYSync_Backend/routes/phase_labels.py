from flask import Blueprint, jsonify, request
from database.db import db
from models.PhaseLabel import PhaseLabel

# New blueprint, separate from telemetry.py — nothing in the existing
# telemetry.py / models is modified. Register this in app.py alongside
# your other blueprints, e.g.:
#
#   from phase_labels import phase_labels
#   app.register_blueprint(phase_labels)

phase_labels = Blueprint("phase_labels", __name__)

# Same 24 raw column names used in temp_values / telemetry.py.
PHASE_COLUMNS = [
    'R1', 'Y1', 'B1', 'N1', 'R2', 'Y2', 'B2', 'N2',
    'R3', 'Y3', 'B3', 'N3', 'R4', 'Y4', 'B4', 'N4',
    'R5', 'Y5', 'B5', 'N5', 'R6', 'Y6', 'B6', 'N6',
]


def _get_or_create_row(serial_no):
    """
    phase_labels has ONE row per device (like temp_values conceptually,
    but a single row here instead of one row per reading). Fetch that
    row, creating an empty one on first use.
    """
    row = PhaseLabel.query.filter_by(serial_no=serial_no).first()
    if not row:
        row = PhaseLabel(serial_no=serial_no)
        db.session.add(row)
        db.session.commit()
    return row


@phase_labels.route('/api/phase-labels', methods=['GET'])
def get_phase_labels():
    """
    GET /api/phase-labels?serial_no=WTSF0C01E

    Returns every one of the 24 phase columns for this device. Any
    column that's still NULL (never renamed) falls back to its own
    raw code, so the frontend always gets a full map.

    Response:
    {
      "R1": "Boiler Inlet",
      "Y1": "Y1",
      ...
    }
    """
    serial_no = request.args.get('serial_no')
    if not serial_no:
        return jsonify({"error": "serial_no is required"}), 400

    row = PhaseLabel.query.filter_by(serial_no=serial_no).first()

    result = {}
    for col in PHASE_COLUMNS:
        val = getattr(row, col) if row else None
        result[col] = val if val else col

    return jsonify(result), 200


@phase_labels.route('/api/phase-labels', methods=['POST'])
def update_phase_label():
    """
    POST /api/phase-labels
    Body: { "serial_no": "WTSF0C01E", "phase_code": "R1", "custom_label": "Boiler Inlet" }

    Sets that one column's value on this device's row (creates the
    row on first rename, updates the same row after that — exactly
    like editing one cell in the Result Grid you showed).
    """
    data = request.get_json() or {}
    serial_no = data.get('serial_no')
    phase_code = data.get('phase_code')
    custom_label = (data.get('custom_label') or '').strip()

    if not serial_no or not phase_code or not custom_label:
        return jsonify({"error": "serial_no, phase_code and custom_label are required"}), 400

    if phase_code not in PHASE_COLUMNS:
        return jsonify({"error": f"invalid phase_code: {phase_code}"}), 400

    row = _get_or_create_row(serial_no)
    setattr(row, phase_code, custom_label)
    db.session.commit()

    return jsonify({
        "success": True,
        "serial_no": serial_no,
        "phase_code": phase_code,
        "custom_label": custom_label,
    }), 200


@phase_labels.route('/api/phase-labels/bulk', methods=['POST'])
def update_phase_labels_bulk():
    """
    POST /api/phase-labels/bulk
    Body: {
      "serial_no": "WTSF0C01E",
      "labels": { "R1": "Boiler Inlet", "Y1": "Boiler Outlet", "B1": "Return Line" }
    }

    Sets several columns on this device's row in one call — handy for
    an "edit all names" screen that saves everything at once.
    Unknown phase codes or empty labels in the payload are skipped.
    """
    data = request.get_json() or {}
    serial_no = data.get('serial_no')
    labels = data.get('labels')

    if not serial_no or not isinstance(labels, dict):
        return jsonify({"error": "serial_no and labels (object) are required"}), 400

    row = _get_or_create_row(serial_no)

    updated = {}
    for phase_code, custom_label in labels.items():
        custom_label = (custom_label or '').strip()
        if phase_code not in PHASE_COLUMNS or not custom_label:
            continue
        setattr(row, phase_code, custom_label)
        updated[phase_code] = custom_label

    db.session.commit()
    return jsonify({"success": True, "serial_no": serial_no, "labels": updated}), 200


@phase_labels.route('/api/phase-labels', methods=['DELETE'])
def reset_phase_label():
    """
    DELETE /api/phase-labels?serial_no=WTSF0C01E&phase_code=R1

    Clears one column back to NULL so that phase falls back to its
    raw code (e.g. "R1") again on the next GET.
    """
    serial_no = request.args.get('serial_no')
    phase_code = request.args.get('phase_code')

    if not serial_no or not phase_code:
        return jsonify({"error": "serial_no and phase_code are required"}), 400

    if phase_code not in PHASE_COLUMNS:
        return jsonify({"error": f"invalid phase_code: {phase_code}"}), 400

    row = PhaseLabel.query.filter_by(serial_no=serial_no).first()
    if row:
        setattr(row, phase_code, None)
        db.session.commit()

    return jsonify({
        "success": True,
        "serial_no": serial_no,
        "phase_code": phase_code,
        "custom_label": phase_code,
    }), 200