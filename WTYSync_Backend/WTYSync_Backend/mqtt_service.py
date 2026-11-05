import json
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import paho.mqtt.client as mqtt

from database.db import db
from models.RegisterProduct import RegisterProduct
from routes.telemetry import process_and_save_mqtt_data

from alert_service import send_push_notification , send_threshold_email,send_threshold_sms

broker = "evoluzn.org"
port = 18889
username = "evzin_led"
password = "63I9YhMaXpa49Eb"

client = mqtt.Client()
client.username_pw_set(username, password)

flask_app = None
socketio_instance = None
scheduler = None

alert_cooldowns = {}
ALERT_COOLDOWN_MINUTES = 30



def check_inactive_devices():
    """Periodically checks for devices that haven't sent data recently
    and marks them offline (online_status = 0).
    """
    print("⏰ [Scheduler] Running check for inactive devices...")
    if not flask_app:
        print("⚠️ [Scheduler] flask_app is None, skipping check.")
        return

    with flask_app.app_context():
        try:
            # ✅ STRICT LOCAL TIME MATCHING DATABASE TIMESTAMPS
            timeout_threshold = datetime.now() - timedelta(seconds=150)

            # Query active devices (1) that haven't updated last_seen in > 3 minutes
            updated_count = (
                db.session.query(RegisterProduct)
                .filter(
                    RegisterProduct.online_status == 1,
                    RegisterProduct.last_seen < timeout_threshold,
                )
                .update({"online_status": 0}, synchronize_session=False)
            )

            db.session.commit()

            if updated_count > 0:
                print(
                    f"✅ [Scheduler] Marked {updated_count} inactive device(s) as offline (online_status = 0)."
                )
            else:
                print("ℹ️ [Scheduler] All active devices are up to date.")

        except Exception as e:
            db.session.rollback()
            print("❌ [Scheduler] Error updating offline status:", str(e))


def init_app(app, socketio_ref=None):
    global flask_app, socketio_instance, scheduler
    flask_app = app
    socketio_instance = socketio_ref

    if socketio_instance is None:
        print(
            "⚠️ WARNING: socketio_instance not set! Live telemetry emit will not work."
        )

    # Initialize and start background scheduler to check for offline devices every 60 seconds
    if scheduler is None:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            func=check_inactive_devices, trigger="interval", seconds=60
        )
        scheduler.start()
        print("✅ Background offline status checker started successfully.")


def on_connect(client, userdata, flags, rc):
    print("=================================")
    print("Connected to MQTT Broker")
    print("Result Code:", rc)

    if rc == 0:
        print("Connection Successful")
        client.subscribe("#")
        print("Subscribed to #")
    else:
        print("Connection Failed")


def on_message(client, userdata, msg):
    topic = msg.topic

    # Ignore non-WTS devices
    if not topic.startswith("WTS"):
        return

    serial = topic.split("/")[0]
    
    
    raw_payload = msg.payload.decode("utf-8")

    print(f"Data --> {topic} | Payload: {raw_payload}")

    if not flask_app:
        print("⚠️ flask_app not set, skipping message")
        return

    with flask_app.app_context():
        # ✅ HANDLE EXPLICIT LWT OFFLINE PAYLOADS (e.g., {WTSF0C045:offline})
        if "offline" in raw_payload.lower():
            try:
                product = RegisterProduct.query.filter_by(serial_no=serial).first()
                if product:
                    product.online_status = 0
                    db.session.commit()
                    print(f"🔴 Device {serial} explicitly sent offline status.")
            except Exception as e:
                db.session.rollback()
                print(f"❌ Error setting offline status for {serial}:", str(e))
            return
        
        
        if "WTSAlert" in raw_payload:
            try:
                print("alert comes here WTSAlert")
                print("Raw Payload:", raw_payload)
                print("Topic Serial:", serial)
                
                clean_payload = raw_payload.strip("{} ")
                parts = clean_payload.split(":")
                
                raw_device_id = parts[1].strip() if len(parts) > 1 else serial
                
                if raw_device_id.startswith("WTSAlert"):
                    alert_device = raw_device_id.replace("WTSAlert" , "WTS" , 1)
                else:
                    alert_device = raw_device_id
                
                alert_msg = parts[2].strip() if len(parts) > 2 else "Temperature Threshold Exceeded!"
                print(f"🚨 REALTIME ALERT PROCESSED: Parsed Serial -> {alert_device} | Msg -> {alert_msg}")
                
                # 🛑 COOLDOWN CHECK: Prevent duplicate alerts within the cooldown window
                now = datetime.now()
                if alert_device in alert_cooldowns:
                    time_diff = now - alert_cooldowns[alert_device]
                    if time_diff < timedelta(minutes=ALERT_COOLDOWN_MINUTES):
                        print(f"ℹ️ Alert for {alert_device} suppressed. Cooldown active (sent {time_diff.seconds}s ago).")
                        
                        # Socket.io live emit kar sakte hain agar frontend par real-time update chahiye bina spam ke
                        if socketio_instance:
                            socketio_instance.emit("temperature_alert", {
                                "serial_no": alert_device,
                                "message": alert_msg,
                                "timestamp": now.isoformat()
                            })
                        return

                # Update last alert time
                alert_cooldowns[alert_device] = now

                # Socket.IO Realtime Emit to Active Frontend
                if socketio_instance:
                    print("SocketIO instance available")
                    socketio_instance.emit("temperature_alert", {
                        "serial_no": alert_device,
                        "message": alert_msg,
                        "timestamp": now.isoformat()
                    })

                # Fetch Product details from DB
                product = RegisterProduct.query.filter_by(serial_no=alert_device).first()
                print("Product Found: ", product)

                if product:
                    # Send App Push Notification
                    if hasattr(product, 'fcm_token') and product.fcm_token:
                        send_push_notification(
                            product.fcm_token, 
                            alert_device, 
                            alert_msg
                        )
                        print("Push function completed")
                    else:
                        print("❌ FCM TOKEN NOT FOUND")

                    # Send Email
                    if product.email_enabled and product.alert_email:
                        print("Calling Email Function......")
                        send_threshold_email(
                            to_email=product.alert_email,
                            serial_no=alert_device,
                            exceeded_phases=[alert_msg],
                            threshold=getattr(product, 'threshold_value', 20),
                            current_time=now
                        )

                    # Send SMS
                    if product.sms_enabled and product.sms_phone:
                        print("Calling SMS Function")
                        send_threshold_sms(
                            mobile_number=product.sms_phone,
                            serial_no=alert_device,
                            exceeded_phases=[alert_msg],
                            current_time=now
                        )
                else:
                    print("Product not found")

            except Exception as e:
                print(f"❌ Error processing WTSAlert payload: {e}")
            return
                
                

        # 1. Process telemetry and save to DB
        process_and_save_mqtt_data(serial, raw_payload)

        # 2. Live Socket.IO Emit
        try:
            if socketio_instance is None:
                print(
                    "⚠️ socketio_instance is None, cannot emit live telemetry"
                )
                return

            if "device_id" in raw_payload:
                clean_string = raw_payload.strip("{} ")
                parts = clean_string.split(":")

                if len(parts) > 2:
                    float_values = []
                    for val in parts[2:]:
                        try:
                            float_values.append(float(val.strip()))
                        except ValueError:
                            pass

                    if len(float_values) > 0:
                        column_order = [
                            "R1", "Y1", "B1", "N1",
                            "R2", "Y2", "B2", "N2",
                            "R3", "Y3", "B3", "N3",
                            "R4", "Y4", "B4", "N4",
                            "R5", "Y5", "B5", "N5",
                            "R6", "Y6", "B6", "N6",
                        ]

                        panels_dict = {}
                        for index, val in enumerate(float_values):
                            if index < len(column_order):
                                col = column_order[index]
                                panel_no = int(col[1])

                                if panel_no not in panels_dict:
                                    panels_dict[panel_no] = []

                                panels_dict[panel_no].append(
                                    {
                                        "phase": col,
                                        "current": val,
                                        "min": val,
                                        "max": val,
                                    }
                                )

                        formatted_panels = [
                            {"panel_no": p_no, "temperatures": temps}
                            for p_no, temps in panels_dict.items()
                        ]

                        telemetry_payload = {
                            "serial_no": serial,
                            "status": "Online",
                            "panels": formatted_panels,
                        }

                        socketio_instance.emit(
                            "live_telemetry", telemetry_payload
                        )
                        print(
                            "Successfully emitted live telemetry for:", serial
                        )

        except Exception as e:
            print("Error emitting live socket telemetry from MQTT:", str(e))


def on_disconnect(client, userdata, rc):
    print("Disconnected from Broker:", rc)


client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect


def start_mqtt():
    print("Connecting to MQTT Broker...")
    client.connect(broker, port, 60)
    client.loop_start()


def publish(topic, message):
    client.publish(topic, message)