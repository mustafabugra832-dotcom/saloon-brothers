import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from db import get_db, init_db, seed_catalog_for_user, DB_PATH, backup_db

candidate_dists = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "dist")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "dist"))
]
FRONTEND_DIST = next((d for d in candidate_dists if os.path.exists(d)), candidate_dists[0])

app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path="")
CORS(app)

# Initialize Database on Startup
init_db()

@app.route('/api/backup/download', methods=['GET'])
def download_backup():
    try:
        backup_db()
        return send_file(DB_PATH, as_attachment=True, download_name=f"saloon_brothers_{datetime.now().strftime('%Y%m%d_%H%M')}.db")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_current_user_id():
    user_id = request.headers.get('X-User-Id') or request.args.get('user_id')
    if user_id:
        try:
            return int(user_id)
        except ValueError:
            pass
    return 1 # Default User 1

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    elif os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return jsonify({"message": "Saloon Brothers Backend API running!"})

# ==================== AUTHENTICATION API ====================
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Kullanıcı adı ve şifre girilmelidir."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        u_dict = dict(user)
        del u_dict['password']
        return jsonify({"success": True, "user": u_dict})
    else:
        return jsonify({"error": "Hatalı kullanıcı adı veya şifre!"}), 401

@app.route('/api/auth/users', methods=['GET'])
def get_users_list():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, name, saloon_title FROM users ORDER BY id ASC")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(users)

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json or {}
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    saloon_title = data.get('saloon_title', 'Saloon Brothers')

    if not username or not password or not name:
        return jsonify({"error": "Tüm alanları doldurunuz."}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO users (username, password, name, saloon_title)
            VALUES (?, ?, ?, ?)
        """, (username, password, name, saloon_title))
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "user": {
                "id": user_id,
                "username": username,
                "name": name,
                "saloon_title": saloon_title
            }
        }), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Bu kullanıcı adı zaten kullanılmaktadır."}), 400

# ==================== DASHBOARD API ====================
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()

    today_str = datetime.now().strftime('%Y-%m-%d')
    month_str = datetime.now().strftime('%Y-%m')

    # Today's Turnover & Breakdown for user (card_amount stored represents IBAN transfers)
    cursor.execute("""
        SELECT 
            COALESCE(SUM(total_amount), 0) as today_total,
            COALESCE(SUM(cash_amount), 0) as today_cash,
            COALESCE(SUM(card_amount), 0) as today_iban,
            COALESCE(SUM(veresiye_amount), 0) as today_veresiye,
            COUNT(id) as today_count
        FROM sales 
        WHERE user_id = ? AND DATE(created_at) = ?
    """, (user_id, today_str))
    today_stats = dict(cursor.fetchone())

    # Today's Veresiye Tahsilat for user
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as today_tahsilat
        FROM veresiye_ledger
        WHERE user_id = ? AND type = 'payment' AND DATE(created_at) = ?
    """, (user_id, today_str))
    today_tahsilat = cursor.fetchone()['today_tahsilat']

    # Monthly Turnover
    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) as month_total, COUNT(id) as month_count
        FROM sales 
        WHERE user_id = ? AND strftime('%Y-%m', created_at) = ?
    """, (user_id, month_str))
    month_stats = dict(cursor.fetchone())

    # Monthly Expenses
    cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as month_expenses
        FROM expenses
        WHERE user_id = ? AND strftime('%Y-%m', created_at) = ?
    """, (user_id, month_str))
    month_expenses = cursor.fetchone()['month_expenses']

    # Total Outstanding Veresiye Debt across user's customers
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END), 0) as total_veresiye_receivable
        FROM veresiye_ledger
        WHERE user_id = ?
    """, (user_id,))
    total_veresiye = cursor.fetchone()['total_veresiye_receivable']

    # Total Outstanding My Personal Debts across user's creditors
    cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END), 0) as total_my_debts
        FROM my_debts_ledger
        WHERE user_id = ?
    """, (user_id,))
    total_my_debts = cursor.fetchone()['total_my_debts']

    cursor.execute("SELECT COUNT(*) as customer_count FROM customers WHERE user_id = ?", (user_id,))
    customer_count = cursor.fetchone()['customer_count']

    cursor.execute("""
        SELECT id, customer_name, payment_type, total_amount, created_at
        FROM sales
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    """, (user_id,))
    recent_sales = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        "today": {
            "total": today_stats["today_total"],
            "cash": today_stats["today_cash"],
            "iban": today_stats["today_iban"],
            "veresiye": today_stats["today_veresiye"],
            "count": today_stats["today_count"],
            "tahsilat": today_tahsilat
        },
        "month": {
            "total": month_stats["month_total"],
            "count": month_stats["month_count"],
            "expenses": month_expenses,
            "net_profit": month_stats["month_total"] - month_expenses
        },
        "total_veresiye": total_veresiye,
        "total_my_debts": total_my_debts,
        "customer_count": customer_count,
        "recent_sales": recent_sales
    })

# ==================== CATEGORIES API ====================
@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, COUNT(p.id) as product_count 
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
    """)
    categories = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(categories)

@app.route('/api/categories', methods=['POST'])
def create_category():
    user_id = get_current_user_id()
    data = request.json or {}
    name = data.get('name')
    icon = data.get('icon', 'scissors')
    color = data.get('color', '#3b82f6')

    if not name:
        return jsonify({"error": "Kategori adı gereklidir."}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO categories (user_id, name, icon, color) VALUES (?, ?, ?, ?)", (user_id, name, icon, color))
        conn.commit()
        cat_id = cursor.lastrowid
        conn.close()
        return jsonify({"id": cat_id, "name": name, "icon": icon, "color": color, "product_count": 0}), 201
    except sqlite3.IntegrityError:
        cursor.execute("SELECT * FROM categories WHERE name = ?", (name,))
        cat = cursor.fetchone()
        conn.close()
        if cat:
            return jsonify(dict(cat)), 200
        return jsonify({"error": "Bu isimde bir kategori zaten var."}), 400

# ==================== PRODUCTS / SERVICES API ====================
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db()
    cursor = conn.cursor()
    
    category_id = request.args.get('category_id')
    product_type = request.args.get('type')
    quick_only = request.args.get('quick_only')
    search = request.args.get('search')

    query = """
        SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
    """
    params = []

    if category_id:
        query += " AND p.category_id = ?"
        params.append(category_id)
    if product_type:
        query += " AND p.type = ?"
        params.append(product_type)
    if quick_only == 'true':
        query += " AND p.is_quick = 1"
    if search:
        query += " AND (p.name LIKE ? OR p.code LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY p.is_quick DESC, p.name ASC"
    
    cursor.execute(query, params)
    products = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(products)

@app.route('/api/products', methods=['POST'])
def create_product():
    user_id = get_current_user_id()
    data = request.json or {}
    name = data.get('name')
    price = float(data.get('price', 0))
    cost = float(data.get('cost', 0))
    category_id = data.get('category_id')
    p_type = data.get('type', 'service')
    stock = int(data.get('stock', 9999))
    is_quick = 1 if data.get('is_quick', True) else 0
    code = data.get('code', '')

    if not name or price < 0:
        return jsonify({"error": "Geçerli bir ad ve fiyat giriniz."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO products (user_id, category_id, name, price, cost, type, stock, is_quick, code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, category_id, name, price, cost, p_type, stock, is_quick, code))
    conn.commit()
    pid = cursor.lastrowid
    conn.close()
    return jsonify({"id": pid, "message": "Ürün/Hizmet başarıyla eklendi."}), 201

@app.route('/api/products/<int:pid>', methods=['PUT'])
def update_product(pid):
    data = request.json or {}
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE products 
        SET category_id = ?, name = ?, price = ?, cost = ?, type = ?, stock = ?, is_quick = ?, code = ?
        WHERE id = ?
    """, (
        data.get('category_id'),
        data.get('name'),
        float(data.get('price', 0)),
        float(data.get('cost', 0)),
        data.get('type', 'service'),
        int(data.get('stock', 9999)),
        1 if data.get('is_quick') else 0,
        data.get('code', ''),
        pid
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "Güncellendi"})

@app.route('/api/products/<int:pid>', methods=['DELETE'])
def delete_product(pid):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (pid,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Silindi"})

# ==================== SALES & POS API ====================
@app.route('/api/sales', methods=['POST'])
def process_sale():
    user_id = get_current_user_id()
    data = request.json or {}
    items = data.get('items', [])
    customer_id = data.get('customer_id')
    customer_name = data.get('customer_name', 'Misafir Müşteri')
    customer_phone = data.get('customer_phone', '')
    payment_type = data.get('payment_type', 'cash') # 'cash', 'iban', 'veresiye', 'split'
    cash_amount = float(data.get('cash_amount', 0))
    iban_amount = float(data.get('iban_amount', data.get('card_amount', 0)))
    veresiye_amount = float(data.get('veresiye_amount', 0))
    subtotal = float(data.get('subtotal', 0))
    discount = float(data.get('discount', 0))
    total_amount = float(data.get('total_amount', 0))
    note = data.get('note', '')

    if not items:
        return jsonify({"error": "Sepet boş olamaz."}), 400

    conn = get_db()
    cursor = conn.cursor()

    # If Veresiye, check name and phone
    if payment_type == 'veresiye' or veresiye_amount > 0:
        if not customer_name or customer_name.strip() == '' or customer_name == 'Misafir Müşteri':
            return jsonify({"error": "Veresiye işlemi için Müşteri Adı Soyadı yazılması zorunludur."}), 400
        if not customer_phone or customer_phone.strip() == '':
            return jsonify({"error": "Veresiye işlemi için Müşteri Telefon Numarası girilmesi zorunludur."}), 400

        # Auto-find or create customer record for this user
        cursor.execute("""
            SELECT id FROM customers 
            WHERE user_id = ? AND (name = ? OR (phone != '' AND phone = ?))
        """, (user_id, customer_name.strip(), customer_phone.strip()))
        row = cursor.fetchone()
        if row:
            customer_id = row['id']
            # Update phone if missing
            cursor.execute("UPDATE customers SET phone = ? WHERE id = ? AND user_id = ?", (customer_phone.strip(), customer_id, user_id))
        else:
            cursor.execute("""
                INSERT INTO customers (user_id, name, phone)
                VALUES (?, ?, ?)
            """, (user_id, customer_name.strip(), customer_phone.strip()))
            customer_id = cursor.lastrowid

    if payment_type == 'cash':
        cash_amount = total_amount
        iban_amount = 0
        veresiye_amount = 0
    elif payment_type in ('iban', 'card'):
        cash_amount = 0
        iban_amount = total_amount
        veresiye_amount = 0
    elif payment_type == 'veresiye':
        cash_amount = 0
        iban_amount = 0
        veresiye_amount = total_amount

    # Insert Sale (card_amount stores IBAN transfers)
    cursor.execute("""
        INSERT INTO sales (user_id, customer_id, customer_name, payment_type, cash_amount, card_amount, veresiye_amount, subtotal, discount, total_amount, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, customer_id, customer_name, payment_type, cash_amount, iban_amount, veresiye_amount, subtotal, discount, total_amount, note))

    sale_id = cursor.lastrowid

    for item in items:
        pid = item.get('id')
        pname = item.get('name')
        price = float(item.get('price', 0))
        qty = int(item.get('quantity', 1))
        item_total = price * qty

        cursor.execute("""
            INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, total_price)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (sale_id, pid, pname, price, qty, item_total))

        if pid:
            cursor.execute("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ? AND type = 'product'", (qty, pid))

    if veresiye_amount > 0 and customer_id:
        cursor.execute("""
            INSERT INTO veresiye_ledger (user_id, customer_id, sale_id, type, amount, note)
            VALUES (?, ?, ?, 'debt', ?, ?)
        """, (user_id, customer_id, sale_id, veresiye_amount, f"Satış #{sale_id} veresiye borcu"))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "sale_id": sale_id,
        "customer_id": customer_id,
        "message": "Satış tamamlandı!"
    }), 201

@app.route('/api/sales', methods=['GET'])
def get_sales():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()

    period = request.args.get('period', 'today')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = "SELECT * FROM sales WHERE user_id = ?"
    params = [user_id]

    if period == 'today':
        query += " AND DATE(created_at) = DATE('now')"
    elif period == 'week':
        query += " AND created_at >= DATETIME('now', '-7 days')"
    elif period == 'month':
        query += " AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    elif start_date and end_date:
        query += " AND DATE(created_at) BETWEEN ? AND ?"
        params.extend([start_date, end_date])
    elif start_date:
        query += " AND DATE(created_at) = ?"
        params.append(start_date)

    query += " ORDER BY created_at DESC"

    cursor.execute(query, params)
    sales = [dict(row) for row in cursor.fetchall()]

    for sale in sales:
        cursor.execute("SELECT * FROM sale_items WHERE sale_id = ?", (sale['id'],))
        sale['items'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify(sales)

@app.route('/api/sales/<int:sid>', methods=['DELETE'])
def delete_sale(sid):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM veresiye_ledger WHERE sale_id = ? AND user_id = ?", (sid, user_id))
    cursor.execute("DELETE FROM sales WHERE id = ? AND user_id = ?", (sid, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Satış iptal edildi"})

# ==================== CUSTOMERS & VERESİYE LEDGER API ====================
@app.route('/api/customers', methods=['GET'])
def get_customers():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    search = request.args.get('search', '')

    query = """
        SELECT 
            c.*,
            COALESCE((
                SELECT SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END)
                FROM veresiye_ledger 
                WHERE customer_id = c.id AND user_id = c.user_id
            ), 0) AS total_debt,
            (SELECT MAX(created_at) FROM veresiye_ledger WHERE customer_id = c.id AND user_id = c.user_id) as last_transaction_at
        FROM customers c
        WHERE c.user_id = ?
    """
    params = [user_id]
    if search:
        query += " AND (c.name LIKE ? OR c.phone LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY total_debt DESC, c.name ASC"

    cursor.execute(query, params)
    customers = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(customers)

@app.route('/api/customers', methods=['POST'])
def create_customer():
    user_id = get_current_user_id()
    data = request.json or {}
    name = data.get('name')
    phone = data.get('phone', '')
    notes = data.get('notes', '')

    if not name:
        return jsonify({"error": "Müşteri adı gereklidir."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO customers (user_id, name, phone, notes) VALUES (?, ?, ?, ?)", (user_id, name, phone, notes))
    conn.commit()
    cid = cursor.lastrowid
    conn.close()
    return jsonify({"id": cid, "name": name, "phone": phone, "notes": notes, "total_debt": 0.0}), 201

@app.route('/api/customers/<int:cid>', methods=['PUT'])
def update_customer(cid):
    user_id = get_current_user_id()
    data = request.json or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE customers SET name = ?, phone = ?, notes = ? WHERE id = ? AND user_id = ?
    """, (data.get('name'), data.get('phone', ''), data.get('notes', ''), cid, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Güncellendi"})

@app.route('/api/customers/<int:cid>', methods=['DELETE'])
def delete_customer(cid):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM customers WHERE id = ? AND user_id = ?", (cid, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Müşteri silindi"})

@app.route('/api/customers/<int:cid>/ledger', methods=['GET'])
def get_customer_ledger(cid):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.*, 
        COALESCE((SELECT SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END) FROM veresiye_ledger WHERE customer_id = c.id AND user_id = c.user_id), 0) AS total_debt
        FROM customers c WHERE c.id = ? AND c.user_id = ?
    """, (cid, user_id))
    customer_row = cursor.fetchone()
    if not customer_row:
        conn.close()
        return jsonify({"error": "Müşteri bulunamadı"}), 404

    customer = dict(customer_row)

    cursor.execute("""
        SELECT * FROM veresiye_ledger
        WHERE customer_id = ? AND user_id = ?
        ORDER BY created_at DESC
    """, (cid, user_id))
    ledger = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return jsonify({
        "customer": customer,
        "ledger": ledger
    })

@app.route('/api/customers/<int:cid>/ledger', methods=['POST'])
def add_ledger_entry(cid):
    user_id = get_current_user_id()
    data = request.json or {}
    l_type = data.get('type')
    amount = float(data.get('amount', 0))
    payment_method = data.get('payment_method', 'cash')
    note = data.get('note', '')

    if l_type not in ('debt', 'payment') or amount <= 0:
        return jsonify({"error": "Geçersiz işlem türü veya miktar."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO veresiye_ledger (user_id, customer_id, type, amount, payment_method, note)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, cid, l_type, amount, payment_method, note))
    conn.commit()
    conn.close()

    return jsonify({"message": "İşlem deftere kaydedildi."}), 201

@app.route('/api/customers/ledger/<int:entry_id>', methods=['DELETE'])
def delete_ledger_entry(entry_id):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM veresiye_ledger WHERE id = ? AND user_id = ?", (entry_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "İşlem kaydı silindi"})

# ==================== FINANCIAL REPORTS & CIRO API ====================
@app.route('/api/reports/turnover', methods=['GET'])
def get_turnover_reports():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            DATE(created_at) as date,
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(SUM(cash_amount), 0) as cash,
            COALESCE(SUM(card_amount), 0) as iban,
            COALESCE(SUM(veresiye_amount), 0) as veresiye,
            COUNT(id) as transaction_count
        FROM sales
        WHERE user_id = ? AND created_at >= DATETIME('now', '-60 days')
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) DESC
    """, (user_id,))
    past_days = [dict(r) for r in cursor.fetchall()]
    daily_chart = list(reversed(past_days))

    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(cash_amount), 0) as cash, COALESCE(SUM(card_amount), 0) as iban, COALESCE(SUM(veresiye_amount), 0) as veresiye
        FROM sales WHERE user_id = ? AND DATE(created_at) = DATE('now')
    """, (user_id,))
    today = dict(cursor.fetchone())

    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM sales WHERE user_id = ? AND created_at >= DATETIME('now', '-7 days')
    """, (user_id,))
    this_week = cursor.fetchone()['total']

    cursor.execute("""
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM sales WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    """, (user_id,))
    this_month = cursor.fetchone()['total']

    cursor.execute("""
        SELECT product_name, SUM(quantity) as total_qty, SUM(total_price) as total_revenue
        FROM sale_items
        WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ?)
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 5
    """, (user_id,))
    top_items = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "today": today,
        "this_week": this_week,
        "this_month": this_month,
        "past_days": past_days,
        "daily_chart": daily_chart,
        "top_items": top_items
    })

@app.route('/api/reports/daily-detail', methods=['GET'])
def get_daily_detail_report():
    user_id = get_current_user_id()
    target_date = request.args.get('date')
    if not target_date:
        target_date = datetime.now().strftime('%Y-%m-%d')

    conn = get_db()
    cursor = conn.cursor()

    # Get totals for the specific date
    cursor.execute("""
        SELECT 
            COALESCE(SUM(total_amount), 0) as total,
            COALESCE(SUM(cash_amount), 0) as cash,
            COALESCE(SUM(card_amount), 0) as iban,
            COALESCE(SUM(veresiye_amount), 0) as veresiye,
            COUNT(id) as transaction_count
        FROM sales
        WHERE user_id = ? AND DATE(created_at) = ?
    """, (user_id, target_date))
    totals = dict(cursor.fetchone())

    # Get items (services/haircuts) performed on that date
    cursor.execute("""
        SELECT 
            si.product_name,
            SUM(si.quantity) as total_qty,
            SUM(si.total_price) as total_revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.user_id = ? AND DATE(s.created_at) = ?
        GROUP BY si.product_name
        ORDER BY total_qty DESC
    """, (user_id, target_date))
    items_summary = [dict(r) for r in cursor.fetchall()]

    # Get sales list for that date
    cursor.execute("""
        SELECT * FROM sales
        WHERE user_id = ? AND DATE(created_at) = ?
        ORDER BY created_at DESC
    """, (user_id, target_date))
    sales = [dict(r) for r in cursor.fetchall()]

    for sale in sales:
        cursor.execute("SELECT * FROM sale_items WHERE sale_id = ?", (sale['id'],))
        sale['items'] = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "date": target_date,
        "totals": totals,
        "items_summary": items_summary,
        "sales": sales
    })

# ==================== EXPENSES API ====================
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    expenses = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify(expenses)

@app.route('/api/expenses', methods=['POST'])
def create_expense():
    user_id = get_current_user_id()
    data = request.json or {}
    title = data.get('title')
    category = data.get('category', 'Genel')
    amount = float(data.get('amount', 0))
    note = data.get('note', '')

    if not title or amount <= 0:
        return jsonify({"error": "Gider başlığı ve miktar zorunludur."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO expenses (user_id, title, category, amount, note)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, title, category, amount, note))
    conn.commit()
    eid = cursor.lastrowid
    conn.close()
    return jsonify({"id": eid, "message": "Gider kaydedildi"}), 201

@app.route('/api/expenses/<int:eid>', methods=['DELETE'])
def delete_expense(eid):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", (eid, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Gider silindi"})

# ==================== KENDİ BORÇLARIM (MY DEBTS) API ====================
@app.route('/api/my-debts', methods=['GET'])
def get_my_debts():
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    search = request.args.get('search', '')

    query = """
        SELECT 
            c.*,
            COALESCE((
                SELECT SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END)
                FROM my_debts_ledger 
                WHERE creditor_id = c.id AND user_id = c.user_id
            ), 0) AS total_debt,
            (SELECT MAX(created_at) FROM my_debts_ledger WHERE creditor_id = c.id AND user_id = c.user_id) as last_transaction_at
        FROM my_creditors c
        WHERE c.user_id = ?
    """
    params = [user_id]
    if search:
        query += " AND (c.name LIKE ? OR c.phone LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY total_debt DESC, c.name ASC"

    cursor.execute(query, params)
    creditors = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(creditors)

@app.route('/api/my-debts', methods=['POST'])
def create_my_creditor():
    user_id = get_current_user_id()
    data = request.json or {}
    name = data.get('name')
    phone = data.get('phone', '')
    notes = data.get('notes', '')
    initial_debt = float(data.get('initial_debt', 0))

    if not name:
        return jsonify({"error": "Kişi/Alacaklı adı gereklidir."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO my_creditors (user_id, name, phone, notes) VALUES (?, ?, ?, ?)", (user_id, name, phone, notes))
    cid = cursor.lastrowid

    if initial_debt > 0:
        cursor.execute("""
            INSERT INTO my_debts_ledger (user_id, creditor_id, type, amount, note)
            VALUES (?, ?, 'debt', ?, ?)
        """, (user_id, cid, initial_debt, "İlk borç kaydı"))

    conn.commit()
    conn.close()
    return jsonify({"id": cid, "name": name, "phone": phone, "notes": notes, "total_debt": initial_debt}), 201

@app.route('/api/my-debts/<int:cid>', methods=['PUT'])
def update_my_creditor(cid):
    user_id = get_current_user_id()
    data = request.json or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE my_creditors SET name = ?, phone = ?, notes = ? WHERE id = ? AND user_id = ?
    """, (data.get('name'), data.get('phone', ''), data.get('notes', ''), cid, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Güncellendi"})

@app.route('/api/my-debts/<int:cid>', methods=['DELETE'])
def delete_my_creditor(cid):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM my_debts_ledger WHERE creditor_id = ? AND user_id = ?", (cid, user_id))
    cursor.execute("DELETE FROM my_creditors WHERE id = ? AND user_id = ?", (cid, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Kayıt silindi"})

@app.route('/api/my-debts/<int:cid>/ledger', methods=['GET'])
def get_my_creditor_ledger(cid):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT c.*, 
        COALESCE((SELECT SUM(CASE WHEN type = 'debt' THEN amount ELSE -amount END) FROM my_debts_ledger WHERE creditor_id = c.id AND user_id = c.user_id), 0) AS total_debt
        FROM my_creditors c WHERE c.id = ? AND c.user_id = ?
    """, (cid, user_id))
    creditor_row = cursor.fetchone()
    if not creditor_row:
        conn.close()
        return jsonify({"error": "Kayıt bulunamadı"}), 404

    creditor = dict(creditor_row)

    cursor.execute("""
        SELECT * FROM my_debts_ledger
        WHERE creditor_id = ? AND user_id = ?
        ORDER BY created_at DESC
    """, (cid, user_id))
    ledger = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return jsonify({
        "creditor": creditor,
        "ledger": ledger
    })

@app.route('/api/my-debts/<int:cid>/ledger', methods=['POST'])
def add_my_debt_ledger_entry(cid):
    user_id = get_current_user_id()
    data = request.json or {}
    l_type = data.get('type')
    amount = float(data.get('amount', 0))
    payment_method = data.get('payment_method', 'cash')
    note = data.get('note', '')

    if l_type not in ('debt', 'payment') or amount <= 0:
        return jsonify({"error": "Geçersiz işlem türü veya miktar."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO my_debts_ledger (user_id, creditor_id, type, amount, payment_method, note)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, cid, l_type, amount, payment_method, note))
    conn.commit()
    conn.close()

    return jsonify({"message": "İşlem kaydedildi."}), 201

@app.route('/api/my-debts/ledger/<int:entry_id>', methods=['DELETE'])
def delete_my_debt_ledger_entry(entry_id):
    user_id = get_current_user_id()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM my_debts_ledger WHERE id = ? AND user_id = ?", (entry_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "İşlem kaydı silindi"})

# ==================== GÜNLÜK RANDEVU DEFTERİ API ====================
@app.route('/api/appointments', methods=['GET'])
def get_appointments():
    user_id = get_current_user_id()
    target_date = request.args.get('date')
    if not target_date:
        target_date = datetime.now().strftime('%Y-%m-%d')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM appointments 
        WHERE user_id = ? AND date = ?
    """, (user_id, target_date))
    rows = [dict(r) for r in cursor.fetchall()]

    appointments_by_slot = {r['time_slot']: r for r in rows}

    filled_count = len([r for r in rows if r['customer_name'] and r['customer_name'].strip() != ''])
    waiting_count = len([r for r in rows if r['status'] == 'waiting' and r['customer_name'] and r['customer_name'].strip() != ''])
    completed_count = len([r for r in rows if r['status'] == 'completed'])

    conn.close()

    return jsonify({
        "date": target_date,
        "appointments": appointments_by_slot,
        "stats": {
            "filled_count": filled_count,
            "waiting_count": waiting_count,
            "completed_count": completed_count,
            "total_slots": 31
        }
    })

@app.route('/api/appointments', methods=['POST'])
def save_appointment():
    user_id = get_current_user_id()
    data = request.json or {}
    target_date = data.get('date')
    time_slot = data.get('time_slot')
    customer_name = data.get('customer_name', '').strip()
    customer_phone = data.get('customer_phone', '').strip()
    barber_name = data.get('barber_name', '').strip()
    note = data.get('note', '').strip()
    status = data.get('status', 'waiting')

    if not target_date or not time_slot:
        return jsonify({"error": "Tarih ve saat dilimi gereklidir."}), 400

    if not customer_name:
        return jsonify({"error": "Randevu kaydetmek için Müşteri Adı Soyadı yazılması zorunludur."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO appointments (user_id, date, time_slot, customer_name, customer_phone, barber_name, note, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date, time_slot) DO UPDATE SET
            customer_name = excluded.customer_name,
            customer_phone = excluded.customer_phone,
            barber_name = excluded.barber_name,
            note = excluded.note,
            status = excluded.status
    """, (user_id, target_date, time_slot, customer_name, customer_phone, barber_name, note, status))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Randevu kaydedildi!"})

@app.route('/api/appointments/delete', methods=['POST'])
def delete_appointment():
    user_id = get_current_user_id()
    data = request.json or {}
    target_date = data.get('date')
    time_slot = data.get('time_slot')

    if not target_date or not time_slot:
        return jsonify({"error": "Tarih ve saat gereklidir."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM appointments WHERE user_id = ? AND date = ? AND time_slot = ?", (user_id, target_date, time_slot))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Randevu silindi."})

if __name__ == '__main__':
    print("==================================================")
    print("SALOON BROTHERS Multi-User POS API (IBAN & Veresiye)")
    print("Uygulama Adresi: http://localhost:5000")
    print("==================================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
