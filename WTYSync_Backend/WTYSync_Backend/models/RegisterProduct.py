from database.db import db
from datetime import datetime,timedelta

class RegisterProduct(db.Model):
    __tablename__ = "register_product"
    
    id = db.Column(db.Integer,primary_key=True)
    
    firebase_uid = db.Column(db.String(200),nullable=False)
    user_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    contact = db.Column(db.String(20), nullable=False)
    device_name = db.Column(db.String(200), nullable=False)
    
    # Subtype & Threshold Details
    probe_type = db.Column(db.String(50), nullable=True) # e.g. '4P', '12P', '24P'
    threshold_type = db.Column(db.String(20), default='global') # 'global' or 'individual'
    threshold_value = db.Column(db.Float, nullable=True) # Used if threshold_type == 'global'
    
    model_no = db.Column(db.String(100), nullable=False)
    serial_no = db.Column(db.String(100), unique=True, nullable=False)
    mac_id = db.Column(db.String(100), nullable=False)
    
    #new column added
    
    online_status = db.Column(db.Boolean, default = False)
    last_seen = db.Column(db.DateTime)
    
    warranty_year = db.Column(db.Integer, default=1)
    purchase_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )
    warranty_expiry = db.Column(
        db.DateTime,
        default=lambda: datetime.utcnow() + timedelta(days=365)
    )
 
    email_enabled = db.Column(db.Boolean,default=False)
    alert_email=db.Column(db.String(150),nullable=True)
    sms_enabled = db.Column(db.Boolean,default= False)
    sms_phone=db.Column(db.String(20),nullable=True)
 
    alert_active = db.Column(db.Boolean, default=False)
    
    #new column
    access_point = db.Column(db.String(100),nullable=False)
    
    # NEW COLUMN
    location = db.Column(db.String(255) , nullable = True)
    
    # Relationship: Clean link to child table
    probe_thresholds = db.relationship('ProbeThreshold', backref='product', cascade="all, delete-orphan", lazy=True)



class ProbeThreshold(db.Model):
    __tablename__ = "probe_thresholds"
    
    id = db.Column(db.Integer, primary_key = True)
    product_id = db.Column(db.Integer, db.ForeignKey('register_product.id', ondelete="CASCADE"), nullable=False)
    serial_no = db.Column(db.String(100), nullable=False)
    
    # 24 Probe Columns (Row-by-Row insertion ke bajaye Single Row Columns)
    probe_1 = db.Column(db.Float, nullable=True)
    probe_2 = db.Column(db.Float, nullable=True)
    probe_3 = db.Column(db.Float, nullable=True)
    probe_4 = db.Column(db.Float, nullable=True)
    probe_5 = db.Column(db.Float, nullable=True)
    probe_6 = db.Column(db.Float, nullable=True)
    probe_7 = db.Column(db.Float, nullable=True)
    probe_8 = db.Column(db.Float, nullable=True)
    probe_9 = db.Column(db.Float, nullable=True)
    probe_10 = db.Column(db.Float, nullable=True)
    probe_11 = db.Column(db.Float, nullable=True)
    probe_12 = db.Column(db.Float, nullable=True)
    probe_13 = db.Column(db.Float, nullable=True)
    probe_14 = db.Column(db.Float, nullable=True)
    probe_15 = db.Column(db.Float, nullable=True)
    probe_16 = db.Column(db.Float, nullable=True)
    probe_17 = db.Column(db.Float, nullable=True)
    probe_18 = db.Column(db.Float, nullable=True)
    probe_19 = db.Column(db.Float, nullable=True)
    probe_20 = db.Column(db.Float, nullable=True)
    probe_21 = db.Column(db.Float, nullable=True)
    probe_22 = db.Column(db.Float, nullable=True)
    probe_23 = db.Column(db.Float, nullable=True)
    probe_24 = db.Column(db.Float, nullable=True)
 
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    
    
    
    
    
    

    