"""
Temperature history for the app's "Temperature trends" screen.

POST /api/history/series
  { id_token, serial_no, start, end, columns: ["R1","Y1",...], bucket_minutes: 5 }
  start / end are epoch milliseconds (UTC). Readings are stored in UTC, so the app asks
  for exactly the window it wants to see in its own time zone.

Reply
  { start, end, bucket_minutes, samples, points: [ { t, R1, Y1, ... } ] }
  t = start of the bucket (epoch ms). Only buckets that contain readings are returned,
  so a gap in the data is simply a missing bucket and the app draws it as a break.
  A window of 24 h in 5 minute buckets is at most 288 points, instead of every raw row.
"""
import calendar
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from database.db import db
from models.RegisterProduct import RegisterProduct
from models.temp_values import TempValues
from utils.firebase_token import InvalidFirebaseToken, verify_firebase_id_token

history_bp = Blueprint("history", __name__)

PHASE_COLUMNS = [
    "R1", "Y1", "B1", "N1", "R2", "Y2", "B2", "N2",
    "R3", "Y3", "B3", "N3", "R4", "Y4", "B4", "N4",
    "R5", "Y5", "B5", "N5", "R6", "Y6", "B6", "N6",
]

# What sensors report when a probe is unplugged. Never averaged into the history.
SENSOR_ERROR_VALUES = (-127.0,)

MAX_WINDOW_MS = 8 * 24 * 3600 * 1000   # protects the server from huge requests


def _error(status, message):
    return jsonify({"success": False, "message": message}), status


def _to_utc_naive(ms):
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).replace(tzinfo=None)


@history_bp.route("/api/history/series", methods=["POST"])
def history_series():
    data = request.get_json(silent=True) or {}

    # 1) Who is asking?
    try:
        uid = verify_firebase_id_token(data.get("id_token"))
    except InvalidFirebaseToken as e:
        print("[history] invalid Firebase token:", e)
        return _error(401, "Login could not be verified")
    except RuntimeError as e:
        print("[history] configuration error:", e)
        return _error(500, "Server is not configured")

    # 2) Is it their device?
    serial_no = (data.get("serial_no") or "").strip()
    if not serial_no:
        return _error(400, "serial_no is required")
    owns = RegisterProduct.query.filter_by(serial_no=serial_no, firebase_uid=uid).first()
    if not owns:
        return _error(404, "Device not found")

    # 3) The window and the channels
    try:
        start_ms = int(data.get("start"))
        end_ms = int(data.get("end"))
        bucket_minutes = int(data.get("bucket_minutes", 5))
    except (TypeError, ValueError):
        return _error(400, "start, end and bucket_minutes must be numbers")

    if end_ms <= start_ms or end_ms - start_ms > MAX_WINDOW_MS:
        return _error(400, "invalid time window")
    bucket_minutes = min(max(bucket_minutes, 1), 60)
    bucket_ms = bucket_minutes * 60000

    columns = [c for c in (data.get("columns") or []) if c in PHASE_COLUMNS]
    columns = list(dict.fromkeys(columns)) or PHASE_COLUMNS[:4]

    # 4) Read only what is needed (timestamp + the requested columns)
    selected = [TempValues.timestamp] + [getattr(TempValues, c) for c in columns]
    rows = (
        db.session.query(*selected)
        .filter(
            TempValues.serial_no == serial_no,
            TempValues.timestamp >= _to_utc_naive(start_ms),
            TempValues.timestamp < _to_utc_naive(end_ms),
        )
        .order_by(TempValues.timestamp.asc())
        .all()
    )

    # 5) Average the readings inside each bucket
    buckets = {}
    for row in rows:
        ts = row[0]
        t_ms = calendar.timegm(ts.timetuple()) * 1000 + ts.microsecond // 1000
        index = (t_ms - start_ms) // bucket_ms
        bucket = buckets.setdefault(index, {c: [0.0, 0] for c in columns})
        for col, value in zip(columns, row[1:]):
            if value is None or value in SENSOR_ERROR_VALUES:
                continue
            bucket[col][0] += value
            bucket[col][1] += 1

    points = []
    for index in sorted(buckets):
        point = {"t": start_ms + index * bucket_ms}
        has_value = False
        for col in columns:
            total, count = buckets[index][col]
            point[col] = round(total / count, 2) if count else None
            has_value = has_value or count > 0
        if has_value:
            points.append(point)

    return jsonify({
        "start": start_ms,
        "end": end_ms,
        "bucket_minutes": bucket_minutes,
        "samples": len(rows),
        "points": points,
    }), 200
