import json
import time
from datetime import datetime, timedelta
from sqlalchemy import or_
from apscheduler.schedulers.background import BackgroundScheduler
import paho.mqtt.client as mqtt

from database.db import db
from models.RegisterProduct import RegisterProduct
from routes.telemetry import process_and_save_mqtt_data

broker = "evoluzn.org"
port = 18889
username = "evzin_led"
password = "63I9YhMaXpa49Eb"

client = mqtt.Client()
client.username_pw_set(username, password)

flask_app = None
socketio_instance = None
scheduler = None

# A device is marked offline when it has sent nothing for OFFLINE_AFTER_SECONDS.
# Keep this at least 2-3x the interval at which the device publishes, otherwise a
# healthy device will flicker offline. The check itself runs every
# OFFLINE_CHECK_EVERY_SECONDS, so the worst-case delay before "offline" shows is
# OFFLINE_AFTER_SECONDS + OFFLINE_CHECK_EVERY_SECONDS (it used to be 150 + 60).
OFFLINE_AFTER_SECONDS = 150
OFFLINE_CHECK_EVERY_SECONDS = 15


def emit_device_status(serial, online):
    """Pushes an online/offline change to every connected app instantly."""
    if socketio_instance is None:
        return
    try:
        socketio_instance.emit(
            "device_status",
            {
                "serial_no": serial,
                "online": bool(online),
                "last_seen": int(time.time() * 1000) if online else None,
            },
        )
    except Exception as e:
        print(f"Error emitting device_status for {serial}:", str(e))


def check_inactive_devices():
    """Marks devices offline when they have not sent data for OFFLINE_AFTER_SECONDS,
    and tells the apps immediately."""
    if not flask_app:
        return

    with flask_app.app_context():
        try:
            # Local time, matching the datetime.now() used for last_seen
            timeout_threshold = datetime.now() - timedelta(seconds=OFFLINE_AFTER_SECONDS)

            stale = (
                db.session.query(RegisterProduct)
                .filter(
                    RegisterProduct.online_status == 1,
                    or_(
                        RegisterProduct.last_seen < timeout_threshold,
                        RegisterProduct.last_seen.is_(None),  # online but never timestamped
                    ),
                )
                .all()
            )

            if not stale:
                return

            serials = [p.serial_no for p in stale]
            for p in stale:
                p.online_status = False
            db.session.commit()

            print(f"✅ [Scheduler] Marked offline: {serials}")
            for serial in serials:
                emit_device_status(serial, False)

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
            func=check_inactive_devices,
            trigger="interval",
            seconds=OFFLINE_CHECK_EVERY_SECONDS,
        )
        scheduler.start()
        print(f"✅ Offline checker started (every {OFFLINE_CHECK_EVERY_SECONDS}s, timeout {OFFLINE_AFTER_SECONDS}s).")


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
                    emit_device_status(serial, False)
            except Exception as e:
                db.session.rollback()
                print(f"❌ Error setting offline status for {serial}:", str(e))
            return

        # 1. Process telemetry and save to DB
        came_online = process_and_save_mqtt_data(serial, raw_payload)

        # 1b. First message after being offline -> tell the apps right now,
        #     they do not have to wait for their next poll.
        if came_online:
            print(f"🟢 Device {serial} is now online.")
            emit_device_status(serial, True)

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