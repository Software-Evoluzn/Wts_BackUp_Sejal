from flask import Blueprint, request, jsonify
from database.db import db
from datetime import datetime, timedelta

from models.RegisterProduct import RegisterProduct, ProbeThreshold
from models.control_panel import ControlPanel 

product = Blueprint("product", __name__)

@product.route("/register-product", methods=["POST"])
def register_product():
    print("\n=================Register product api called==================")

    data = request.get_json()
    print("Received data", data)

    if not data:
        return jsonify({
            "success": False,
            "message": "No data received"
        }), 400

    serial = data.get("serial_no")
    print("Serial no", serial)

    if not serial:
        return jsonify({
            "success": False,
            "message": "Serial number is required"
        }), 400

    # Product already registered check
    existing = RegisterProduct.query.filter_by(serial_no=serial).first()

    if existing:
        print("Product already registered.")
        return jsonify({
            "success": False,
            "message": "Product already registered."
        }), 400

    try:
        purchase_date = datetime.strptime(data.get("purchase_date", ""), "%Y-%m-%d")
    except ValueError:
        return jsonify({
            "success": False,
            "message": "Invalid date format. Expected YYYY-MM-DD"
        }), 400
    
    print("Purchase Date:", purchase_date)
    access_point = serial[:3] + "Ap" + serial[3:]
    threshold_type = data.get("threshold_type", "global")

    new_product = RegisterProduct(
        firebase_uid=data.get("firebase_uid"),
        user_name=data.get("user_name"),
        email=data.get("email"),
        contact=data.get("contact"),
        device_name=data.get("device_name"),
        probe_type=data.get("probe_type"),
        threshold_type=threshold_type,
        threshold_value=float(data.get("threshold_value")) if threshold_type == 'global' and data.get("threshold_value") is not None else None,
        model_no=data.get("model_no"),
        serial_no=serial,
        mac_id=data.get("mac_id"),
        purchase_date=purchase_date,
        warranty_year=1,
        warranty_expiry=purchase_date + timedelta(days=365),
        online_status=False,
        email_enabled=data.get("email_enabled", False),
        alert_email=data.get("alert_email"),
        sms_enabled=data.get("sms_enabled", False),
        sms_phone=data.get('sms_phone'),
        access_point=access_point,
        location=data.get("location")
    )

    db.session.add(new_product)
    db.session.flush() # New Product ID create karne ke liye

    # Single Row Column-Wise insertion for Probe Thresholds
    if threshold_type == "individual" and data.get("individual_thresholds"):
        individual_data = data.get("individual_thresholds", {})
        
        # ProbeThreshold object me single record Columns mapping
        probe_entry = ProbeThreshold(
            product_id=new_product.id,
            serial_no=serial,
            probe_1=float(individual_data.get("probe_1")) if individual_data.get("probe_1") is not None else None,
            probe_2=float(individual_data.get("probe_2")) if individual_data.get("probe_2") is not None else None,
            probe_3=float(individual_data.get("probe_3")) if individual_data.get("probe_3") is not None else None,
            probe_4=float(individual_data.get("probe_4")) if individual_data.get("probe_4") is not None else None,
            probe_5=float(individual_data.get("probe_5")) if individual_data.get("probe_5") is not None else None,
            probe_6=float(individual_data.get("probe_6")) if individual_data.get("probe_6") is not None else None,
            probe_7=float(individual_data.get("probe_7")) if individual_data.get("probe_7") is not None else None,
            probe_8=float(individual_data.get("probe_8")) if individual_data.get("probe_8") is not None else None,
            probe_9=float(individual_data.get("probe_9")) if individual_data.get("probe_9") is not None else None,
            probe_10=float(individual_data.get("probe_10")) if individual_data.get("probe_10") is not None else None,
            probe_11=float(individual_data.get("probe_11")) if individual_data.get("probe_11") is not None else None,
            probe_12=float(individual_data.get("probe_12")) if individual_data.get("probe_12") is not None else None,
            probe_13=float(individual_data.get("probe_13")) if individual_data.get("probe_13") is not None else None,
            probe_14=float(individual_data.get("probe_14")) if individual_data.get("probe_14") is not None else None,
            probe_15=float(individual_data.get("probe_15")) if individual_data.get("probe_15") is not None else None,
            probe_16=float(individual_data.get("probe_16")) if individual_data.get("probe_16") is not None else None,
            probe_17=float(individual_data.get("probe_17")) if individual_data.get("probe_17") is not None else None,
            probe_18=float(individual_data.get("probe_18")) if individual_data.get("probe_18") is not None else None,
            probe_19=float(individual_data.get("probe_19")) if individual_data.get("probe_19") is not None else None,
            probe_20=float(individual_data.get("probe_20")) if individual_data.get("probe_20") is not None else None,
            probe_21=float(individual_data.get("probe_21")) if individual_data.get("probe_21") is not None else None,
            probe_22=float(individual_data.get("probe_22")) if individual_data.get("probe_22") is not None else None,
            probe_23=float(individual_data.get("probe_23")) if individual_data.get("probe_23") is not None else None,
            probe_24=float(individual_data.get("probe_24")) if individual_data.get("probe_24") is not None else None,
        )
        db.session.add(probe_entry)
            
    db.session.commit()
    
    print("Product and probe saved successfully in database.")
    print("================================================\n")

    return jsonify({
        "success": True,
        "message": "Product and probe Registered Successfully"
    }), 201


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
        # Check if individual thresholds exist for this product
        threshold_info = {}
        if prod.threshold_type == "individual" and prod.probe_thresholds:
            # Relationship through backref array gets first row
            th = prod.probe_thresholds[0] if isinstance(prod.probe_thresholds, list) and prod.probe_thresholds else prod.probe_thresholds
            if th:
                threshold_info = {
                    "probe_1": th.probe_1, "probe_2": th.probe_2, "probe_3": th.probe_3, "probe_4": th.probe_4,
                    "probe_5": th.probe_5, "probe_6": th.probe_6, "probe_7": th.probe_7, "probe_8": th.probe_8,
                    "probe_9": th.probe_9, "probe_10": th.probe_10, "probe_11": th.probe_11, "probe_12": th.probe_12,
                    "probe_13": th.probe_13, "probe_14": th.probe_14, "probe_15": th.probe_15, "probe_16": th.probe_16,
                    "probe_17": th.probe_17, "probe_18": th.probe_18, "probe_19": th.probe_19, "probe_20": th.probe_20,
                    "probe_21": th.probe_21, "probe_22": th.probe_22, "probe_23": th.probe_23, "probe_24": th.probe_24
                }

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
            "location": prod.location
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