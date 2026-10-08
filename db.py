import sqlite3
import os
import json
from datetime import datetime, date

DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(__file__))
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR, exist_ok=True)

BACKUP_DIR = os.path.join(DATA_DIR, "backups")
if not os.path.exists(BACKUP_DIR):
    os.makedirs(BACKUP_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, "saloon_brothers.db")

def backup_db():
    """Otomatik veritabanı yedeği alır."""
    try:
        if os.path.exists(DB_PATH):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(BACKUP_DIR, f"saloon_brothers_{timestamp}.db")
            import shutil
            shutil.copy2(DB_PATH, backup_file)
            print(f"[YEDEK] Otomatik veritabanı yedeği alındı: {backup_file}")
    except Exception as e:
        print(f"[YEDEK HATASI] {e}")

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    backup_db()
    conn = get_db()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        saloon_title TEXT DEFAULT 'Saloon Brothers',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'scissors',
        color TEXT DEFAULT '#3b82f6',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
    );
    """)

    # Products & Services Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0.0,
        cost REAL NOT NULL DEFAULT 0.0,
        type TEXT CHECK(type IN ('service', 'product')) DEFAULT 'service',
        stock INTEGER DEFAULT 9999,
        is_quick INTEGER DEFAULT 1,
        code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Customers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Sales Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        customer_name TEXT,
        payment_type TEXT CHECK(payment_type IN ('cash', 'card', 'iban', 'veresiye', 'split')) NOT NULL,
        cash_amount REAL DEFAULT 0.0,
        card_amount REAL DEFAULT 0.0,
        veresiye_amount REAL DEFAULT 0.0,
        subtotal REAL NOT NULL DEFAULT 0.0,
        discount REAL DEFAULT 0.0,
        total_amount REAL NOT NULL DEFAULT 0.0,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Sale Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        unit_price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        total_price REAL NOT NULL
    );
    """)

    # Veresiye Ledger Table (Defter)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS veresiye_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
        type TEXT CHECK(type IN ('debt', 'payment')) NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'iban', 'other') OR payment_method IS NULL),
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Auto-migration for existing databases with old CHECK constraints
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales'")
    row_sales = cursor.fetchone()
    if row_sales and 'iban' not in row_sales['sql']:
        cursor.execute("PRAGMA foreign_keys=OFF;")
        cursor.execute("ALTER TABLE sales RENAME TO sales_old;")
        cursor.execute("""
        CREATE TABLE sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
            customer_name TEXT,
            payment_type TEXT CHECK(payment_type IN ('cash', 'card', 'iban', 'veresiye', 'split')) NOT NULL,
            cash_amount REAL DEFAULT 0.0,
            card_amount REAL DEFAULT 0.0,
            veresiye_amount REAL DEFAULT 0.0,
            subtotal REAL NOT NULL DEFAULT 0.0,
            discount REAL DEFAULT 0.0,
            total_amount REAL NOT NULL DEFAULT 0.0,
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("INSERT INTO sales SELECT * FROM sales_old;")
        cursor.execute("DROP TABLE sales_old;")
        
        # Ensure sale_items FK points to sales
        cursor.execute("ALTER TABLE sale_items RENAME TO sale_items_old;")
        cursor.execute("""
        CREATE TABLE sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            product_id INTEGER,
            product_name TEXT NOT NULL,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            total_price REAL NOT NULL
        );
        """)
        cursor.execute("INSERT INTO sale_items SELECT * FROM sale_items_old;")
        cursor.execute("DROP TABLE sale_items_old;")

        cursor.execute("PRAGMA foreign_keys=ON;")

    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='veresiye_ledger'")
    row_vl = cursor.fetchone()
    if row_vl and 'iban' not in row_vl['sql']:
        cursor.execute("PRAGMA foreign_keys=OFF;")
        cursor.execute("ALTER TABLE veresiye_ledger RENAME TO veresiye_ledger_old;")
        cursor.execute("""
        CREATE TABLE veresiye_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
            type TEXT CHECK(type IN ('debt', 'payment')) NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'iban', 'other') OR payment_method IS NULL),
            note TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("INSERT INTO veresiye_ledger SELECT * FROM veresiye_ledger_old;")
        cursor.execute("DROP TABLE veresiye_ledger_old;")
        cursor.execute("PRAGMA foreign_keys=ON;")

    # Expenses Table (Giderler)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'Genel',
        amount REAL NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # My Creditors Table (Kendi Borçlu Olduğum Kişiler)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS my_creditors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        phone TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # My Debts Ledger Table (Kendi Borç Defteri & Ödemeleri)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS my_debts_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creditor_id INTEGER NOT NULL REFERENCES my_creditors(id) ON DELETE CASCADE,
        type TEXT CHECK(type IN ('debt', 'payment')) NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'iban', 'other') OR payment_method IS NULL),
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Appointments Table (Günlük Randevu Defteri)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        barber_name TEXT,
        note TEXT,
        status TEXT CHECK(status IN ('waiting', 'completed', 'cancelled')) DEFAULT 'waiting',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, time_slot)
    );
    """)

    conn.commit()

    # Seed 5 Users if empty
    cursor.execute("SELECT COUNT(*) as count FROM users")
    if cursor.fetchone()['count'] == 0:
        seed_users_and_data(conn)

    conn.close()

def seed_users_and_data(conn):
    cursor = conn.cursor()
    default_users = [
        ('berat', '1810', 'Berat Han Çiftçi', 'Erkek Kuaför & Kişisel Bakım'),
        ('izzethan', '0842', 'İzzethan Çiftci', 'Erkek Kuaför & Kişisel Bakım'),
        ('akif', '123456', 'Akif Özbek', 'Erkek Kuaför & Kişisel Bakım'),
        ('sinan', '123456', 'Sinan Kahraman', 'Erkek Kuaför & Kişisel Bakım'),
        ('turgut', '123456', 'Turgut Akhan', 'Erkek Kuaför & Kişisel Bakım')
    ]
    first_user_id = None
    for username, pwd, name, title in default_users:
        cursor.execute("""
            INSERT INTO users (username, password, name, saloon_title)
            VALUES (?, ?, ?, ?)
        """, (username, pwd, name, title))
        if first_user_id is None:
            first_user_id = cursor.lastrowid

    if first_user_id:
        seed_catalog_for_user(conn, first_user_id)

    conn.commit()

def seed_catalog_for_user(conn, user_id):
    cursor = conn.cursor()

    categories = [
        ("Erkek Kesim & Bakım", "scissors", "#ef4444"),
        ("Sakal & Şekillendirme", "smile", "#f59e0b"),
        ("Cilt & Yüz Bakımı", "sparkles", "#10b981"),
        ("Boyam & Özel İşlemler", "palette", "#8b5cf6"),
        ("Kişisel Bakım Ürünleri", "shopping-bag", "#3b82f6")
    ]

    cat_ids = {}
    for name, icon, color in categories:
        cursor.execute("INSERT INTO categories (user_id, name, icon, color) VALUES (?, ?, ?, ?)", (user_id, name, icon, color))
        cat_ids[name] = cursor.lastrowid

    items = [
        (user_id, cat_ids["Erkek Kesim & Bakım"], "Saç Kesimi", 250.0, 0.0, "service", 9999, 1, "SK-01"),
        (user_id, cat_ids["Sakal & Şekillendirme"], "Sakal Tıraşı & Şekillendirme", 150.0, 0.0, "service", 9999, 1, "SKL-01"),
        (user_id, cat_ids["Erkek Kesim & Bakım"], "Saç & Sakal Kombin", 350.0, 0.0, "service", 9999, 1, "KOM-01"),
        (user_id, cat_ids["Erkek Kesim & Bakım"], "Fön & Şekillendirme", 100.0, 0.0, "service", 9999, 1, "FN-01"),
        (user_id, cat_ids["Cilt & Yüz Bakımı"], "Buharlı Yüz Maskesi", 200.0, 20.0, "service", 9999, 1, "YM-01"),
        (user_id, cat_ids["Boyam & Özel İşlemler"], "Damat Tıraşı Paketi", 1500.0, 150.0, "service", 9999, 1, "DT-01"),
        (user_id, cat_ids["Kişisel Bakım Ürünleri"], "Matted Matte Wax 150ml", 180.0, 80.0, "product", 20, 1, "PRD-01"),
        (user_id, cat_ids["Kişisel Bakım Ürünleri"], "Keratin Sprey Fön 250ml", 220.0, 95.0, "product", 15, 1, "PRD-02")
    ]

    for uid, cat_id, name, price, cost, ptype, stock, quick, code in items:
        cursor.execute("""
            INSERT INTO products (user_id, category_id, name, price, cost, type, stock, is_quick, code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (uid, cat_id, name, price, cost, ptype, stock, quick, code))
