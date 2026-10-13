from flask import Blueprint, request, jsonify
from database.db import db
from datetime import datetime, timedelta

from models.RegisterProduct import RegisterProduct, ProbeThreshold
from models.PhaseLabel import PhaseLabel
from models.control_panel import ControlPanel

product = Blueprint("product", __name__)

# T1..T4 of an IntelliTemp 4P are stored in the first four phase_labels columns.
# ASSUMPTION: change this list if your telemetry uses different columns for the 4 probes.
PROBE_TO_PHASE_COLUMN = ['R1', 'Y1', 'B1', 'N1']


def _to_float(value):
    """Returns a float, or None when the value is missing / not a number."""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value, default=None):
    if value is None or value == "":
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _get_probe_labels(serial_no, count=4):
    """Custom names for T1..Tn, falling back to 'T1', 'T2', ... when never renamed."""
    row = PhaseLabel.query.filter_by(serial_no=serial_no).first()
    labels = []
    for i in range(count):
        column = PROBE_TO_PHASE_COLUMN[i] if i < len(PROBE_TO_PHASE_COLUMN) else None
        value = getattr(row, column) if (row and column) else None
        labels.append(value if value else f"T{i + 1}")
    return labels


@product.route("/register-product", methods=["POST"])
def register_product():
    """
    Saves the whole installation wizard in ONE request:
    device identity, location/application, alert rule, recipients and probe names.

    If the serial number already exists AND belongs to the same user, the record is
    updated (so going back and pressing "Apply" again does not fail). If it belongs to
    another account, the request is rejected.
    """
    print("\n=================Register product api called==================")

    data = request.get_json()
    print("Received data", data)

    if not data:
        return jsonify({"success": False, "message": "No data received"}), 400

    serial = data.get("serial_no")
    firebase_uid = data.get("firebase_uid")

    if not serial:
        return jsonify({"success": False, "message": "Serial number is required"}), 400

    if not firebase_uid:
        return jsonify({"success": False, "message": "User session not found. Please log in again."}), 400

    # Purchase date is optional now (the wizard says "can be added later")
    raw_purchase_date = data.get("purchase_date")
    purchase_date = None
    if raw_purchase_date:
        try:
            purchase_date = datetime.strptime(raw_purchase_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({
                "success": False,
                "message": "Invalid date format. Expected YYYY-MM-DD"
            }), 400

    existing = RegisterProduct.query.filter_by(serial_no=serial).first()

    if existing and existing.firebase_uid != firebase_uid:
        print("Product already registered to another account.")
        return jsonify({
            "success": False,
            "message": "This device is already registered to another account."
        }), 400

    is_update = existing is not None
    prod = existing if is_update else RegisterProduct()

    individual_data = data.get("individual_thresholds") or {}
    has_overrides = any(_to_float(v) is not None for v in individual_data.values())
    threshold_type = "individual" if has_overrides else "global"

    try:
        # ---- identity ----
        prod.firebase_uid = firebase_uid
        prod.user_name = data.get("user_name")
        prod.email = data.get("email")
        prod.contact = data.get("contact")
        prod.device_name = data.get("device_name")
        prod.probe_type = data.get("probe_type")
        prod.model_no = data.get("model_no")
        prod.serial_no = serial
        prod.mac_id = data.get("mac_id") or "N/A"
        prod.access_point = serial[:3] + "Ap" + serial[3:]

        # ---- installation ----
        prod.location = data.get("location")
        prod.application = data.get("application")
        prod.site_timezone = data.get("site_timezone")

        # ---- dates / warranty ----
        if purchase_date:
            prod.purchase_date = purchase_date
            prod.warranty_expiry = purchase_date + timedelta(days=365)
        elif not is_update:
            prod.purchase_date = datetime.utcnow()
            prod.warranty_expiry = prod.purchase_date + timedelta(days=365)
        if not is_update:
            prod.warranty_year = 1
            prod.online_status = False

        # ---- alert rule ----
        prod.threshold_type = threshold_type
        prod.threshold_value = _to_float(data.get("threshold_value"))   # group high limit
        prod.low_enabled = bool(data.get("low_enabled", False))
        prod.low_limit = _to_float(data.get("low_limit")) if prod.low_enabled else None
        prod.persistence_readings = _to_int(data.get("persistence_readings"), 1)
        prod.reset_margin = _to_float(data.get("reset_margin")) if _to_float(data.get("reset_margin")) is not None else 3.0
        prod.repeat_every_minutes = _to_int(data.get("repeat_every_minutes"), 30)

        # ---- recipients ----
        prod.email_enabled = bool(data.get("email_enabled", False))
        prod.alert_email = data.get("alert_email")
        prod.sms_enabled = bool(data.get("sms_enabled", False))
        prod.sms_phone = data.get("sms_phone")

        # ---- status: waits for the device acknowledgement ----
        prod.config_status = "pending"
        prod.installed_at = None

        if not is_update:
            db.session.add(prod)
        db.session.flush()  # makes sure prod.id exists

        # ---- per-probe overrides (NULL = use the group limit) ----
        if is_update:
            ProbeThreshold.query.filter_by(product_id=prod.id).delete()

        if has_overrides:
            overrides = {f"probe_{i}": _to_float(individual_data.get(f"probe_{i}")) for i in range(1, 25)}
            db.session.add(ProbeThreshold(product_id=prod.id, serial_no=serial, **overrides))

        # ---- probe names (T1..T4 -> phase_labels columns) ----
        probe_labels = data.get("probe_labels") or []
        if isinstance(probe_labels, list) and probe_labels:
            label_row = PhaseLabel.query.filter_by(serial_no=serial).first()
            if not label_row:
                label_row = PhaseLabel(serial_no=serial)
                db.session.add(label_row)

            for index, label in enumerate(probe_labels):
                if index >= len(PROBE_TO_PHASE_COLUMN):
                    break
                label = (str(label) if label is not None else "").strip()
                if label:
                    setattr(label_row, PROBE_TO_PHASE_COLUMN[index], label)

        db.session.commit()

    except Exception as e:
        db.session.rollback()
        print("Register product error:", e)
        return jsonify({"success": False, "message": f"Could not save installation: {e}"}), 500

    print("Installation saved successfully in database.")
    print("================================================\n")

    return jsonify({
        "success": True,
        "message": "Installation updated successfully" if is_update else "Product registered successfully",
        "serial_no": serial,
        "config_status": prod.config_status,
    }), 201


@product.route("/confirm-installation", methods=["POST"])
def confirm_installation():
    """
    Marks the installation as 'applied' (shown as "Installed" on the Home screen).

    For now the app calls this right after /register-product succeeds.
    LATER: call it from the place where the DEVICE acknowledges the configuration
    (for example when the first telemetry packet / ACK message arrives).
    """
    data = request.get_json() or {}
    serial = data.get("serial_no")
    firebase_uid = data.get("firebase_uid")

    if not serial or not firebase_uid:
        return jsonify({"success": False, "message": "serial_no and firebase_uid are required"}), 400

    prod = RegisterProduct.query.filter_by(serial_no=serial, firebase_uid=firebase_uid).first()
    if not prod:
        return jsonify({"success": False, "message": "Product not found"}), 404

    prod.config_status = "applied"
    prod.installed_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Installation confirmed",
        "config_status": prod.config_status,
    }), 200


@product.route("/get-products", methods=["POST"])   
def get_products():
    print("========================================")
    print("GET PRODUCTS API CALLED")
    data = request.get_json()
    
    firebase_uid = data.get("firebase_uid") if data else None

    if not firebase_uid:
        return jsonify({
            "success": False,
            "message": "Firebase UID is required"
        }), 400
        
    products = RegisterProduct.query.filter_by(firebase_uid=firebase_uid).all()
    
    if not products:
        return jsonify({
            "success": True,
            "products": []
        }), 200
        
    product_list = []
    
    for prod in products:
        # Per-probe overrides (NULL = uses the group limit)
        threshold_info = {}
        if prod.probe_thresholds:
            th = prod.probe_thresholds[0] if isinstance(prod.probe_thresholds, list) else prod.probe_thresholds
            if th:
                threshold_info = {
                    "probe_1": th.probe_1, "probe_2": th.probe_2, "probe_3": th.probe_3, "probe_4": th.probe_4,
                    "probe_5": th.probe_5, "probe_6": th.probe_6, "probe_7": th.probe_7, "probe_8": th.probe_8,
                    "probe_9": th.probe_9, "probe_10": th.probe_10, "probe_11": th.probe_11, "probe_12": th.probe_12,
                    "probe_13": th.probe_13, "probe_14": th.probe_14, "probe_15": th.probe_15, "probe_16": th.probe_16,
                    "probe_17": th.probe_17, "probe_18": th.probe_18, "probe_19": th.probe_19, "probe_20": th.probe_20,
                    "probe_21": th.probe_21, "probe_22": th.probe_22, "probe_23": th.probe_23, "probe_24": th.probe_24
                }

        probe_count = 4
        if prod.probe_type and prod.probe_type[:-1].isdigit():
            probe_count = min(int(prod.probe_type[:-1]), len(PROBE_TO_PHASE_COLUMN))

        product_list.append({
            "id": prod.id,
            "device_name": prod.device_name,
            "probe_type": prod.probe_type,
            "threshold_type": prod.threshold_type,
            "threshold_value": prod.threshold_value,
            "individual_thresholds": threshold_info, # Fetched Column-Wise Thresholds
            "model_no": prod.model_no,
            "serial_no": prod.serial_no,
            "mac_id": prod.mac_id,
            "purchase_date": prod.purchase_date.strftime("%Y-%m-%d") if prod.purchase_date else None,
            "warranty_expiry": prod.warranty_expiry.strftime("%Y-%m-%d") if prod.warranty_expiry else None,
            "online": prod.online_status,
            "email_enabled": prod.email_enabled,
            "alert_email": prod.alert_email,
            "sms_enabled": prod.sms_enabled,
            "alert_phone": prod.sms_phone,
            "access_point": prod.access_point,
            "location": prod.location,

            # ---- new: installation wizard data ----
            "application": prod.application,
            "site_timezone": prod.site_timezone,
            "low_enabled": prod.low_enabled,
            "low_limit": prod.low_limit,
            "persistence_readings": prod.persistence_readings,
            "reset_margin": prod.reset_margin,
            "repeat_every_minutes": prod.repeat_every_minutes,
            "config_status": prod.config_status,
            "installed_at": prod.installed_at.strftime("%Y-%m-%d %H:%M") if prod.installed_at else None,
            "probe_labels": _get_probe_labels(prod.serial_no, probe_count),
        })

    return jsonify({
        "success": True,
        "products": product_list
    }), 200

@product.route("/update-panel-name", methods=["POST"])
def update_panel_name():
    print("\n================= UPDATE PANEL NAME API CALLED =================")
    data = request.get_json()
    
    if not data:
        return jsonify({"success": False, "message": "No data received"}), 400

    serial = data.get("serial_no")
    index = data.get("panel_index")
    new_name = data.get("custom_name")

    if not serial or not index or not new_name:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    panel = ControlPanel.query.filter_by(serial_no=serial, panel_index=index).first()
    
    if not panel:
        panel = ControlPanel(serial_no=serial, panel_index=index, custom_name=new_name)
        db.session.add(panel)
    else:
        panel.custom_name = new_name
        
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Panel renamed successfully!"
    }), 200
