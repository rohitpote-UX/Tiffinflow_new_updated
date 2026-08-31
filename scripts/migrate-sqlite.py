"""
BiteBuddy Data Migration Script (SQLite -> PostgreSQL)
Reads backend/tiffinflow.db and outputs clean SQL statements or migrates to PostgreSQL.

Usage:
  py scripts/migrate-sqlite.py [--output migration.sql]
"""

import sqlite3
import json
import uuid
import datetime
import os
import sys

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "tiffinflow.db")

def migrate():
    if not os.path.exists(SQLITE_PATH):
        print(f"Error: SQLite file not found at {SQLITE_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n--- BITEBUDDY DATA MIGRATION ---")
    print(f"Reading SQLite database from: {SQLITE_PATH}")

    # 1. Migrate Offices
    cursor.execute("SELECT * FROM office_settings")
    offices = cursor.fetchall()
    print(f"Found {len(offices)} offices in SQLite.")

    # 2. Migrate Users
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    print(f"Found {len(users)} users in SQLite.")

    # 3. Migrate Meals
    cursor.execute("SELECT * FROM meals")
    meals = cursor.fetchall()
    print(f"Found {len(meals)} meals in SQLite.")

    # 4. Migrate Payments
    cursor.execute("SELECT * FROM payments")
    payments = cursor.fetchall()
    print(f"Found {len(payments)} payments in SQLite.")

    sql_statements = [
        "-- BITEBUDDY 2.0 DATA MIGRATION FROM SQLITE",
        "-- Generated on " + datetime.datetime.now().isoformat(),
        "BEGIN;\n"
    ]

    # Map office ids to valid UUIDs
    office_uuid_map = {}

    for o in offices:
        raw_id = o["id"]
        # Generate stable UUID for office
        off_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"office.{raw_id}"))
        office_uuid_map[raw_id] = off_uuid

        sql = f"""INSERT INTO offices (id, name, admin_id, veg_price, non_veg_price, cutoff_time, week_start_day, auto_default_enabled, join_code, working_days)
VALUES ('{off_uuid}', '{o["office_name"].replace("'", "''")}', '{o["admin_id"]}', {o["veg_price"]}, {o["non_veg_price"]}, '{o["cutoff_time"]}', {o["week_start_day"]}, {str(bool(o["auto_default_enabled"])).upper()}, '{o["office_code"]}', '[1, 2, 3, 4, 5]'::jsonb)
ON CONFLICT (join_code) DO NOTHING;"""
        sql_statements.append(sql)

    sql_statements.append("\n-- Users & Memberships")
    for u in users:
        u_id = u["id"]
        u_name = u["name"].replace("'", "''")
        u_email = u["email"].replace("'", "''")
        u_phone = u["phone"].replace("'", "''")
        u_pwd = u["password_hash"]
        u_role = u["role"].upper() if u["role"] else "USER"
        u_active = str(bool(u["is_active"])).upper()
        u_pref = u["default_meal_preference"] or "flexible"
        raw_off_id = u["office_id"]
        target_off_uuid = office_uuid_map.get(raw_off_id, list(office_uuid_map.values())[0] if office_uuid_map else str(uuid.uuid4()))

        sql_user = f"""INSERT INTO users (id, name, email, phone, password_hash, is_active)
VALUES ('{u_id}', '{u_name}', '{u_email}', '{u_phone}', '{u_pwd}', {u_active})
ON CONFLICT (id) DO NOTHING;"""
        sql_statements.append(sql_user)

        sql_membership = f"""INSERT INTO memberships (user_id, office_id, role, default_preference, is_active)
VALUES ('{u_id}', '{target_off_uuid}', '{u_role}', '{u_pref}', {u_active})
ON CONFLICT (user_id, office_id) DO NOTHING;"""
        sql_statements.append(sql_membership)

    sql_statements.append("\n-- Meals")
    for m in meals:
        m_id = m["id"]
        m_uid = m["user_id"]
        raw_off = m["office_id"]
        off_uuid = office_uuid_map.get(raw_off, list(office_uuid_map.values())[0] if office_uuid_map else str(uuid.uuid4()))
        m_date = m["date"]
        m_type = m["meal_type"]
        m_status = m["status"]
        m_price = m["price"]
        m_auto = str(bool(m["is_auto_defaulted"])).upper()

        sql_meal = f"""INSERT INTO meals (id, user_id, office_id, date, meal_type, status, price, is_auto_defaulted)
VALUES ('{m_id}', '{m_uid}', '{off_uuid}', '{m_date}', '{m_type}', '{m_status}', {m_price}, {m_auto})
ON CONFLICT (id) DO NOTHING;"""
        sql_statements.append(sql_meal)

    sql_statements.append("\n-- Payments")
    for p in payments:
        p_id = p["id"]
        p_uid = p["user_id"]
        raw_off = p["office_id"]
        off_uuid = office_uuid_map.get(raw_off, list(office_uuid_map.values())[0] if office_uuid_map else str(uuid.uuid4()))
        p_amt = p["amount"]
        p_start = p["week_start"]
        p_status = p["payment_status"]

        sql_pay = f"""INSERT INTO payments (id, user_id, office_id, amount, period_start, period_end, status)
VALUES ('{str(uuid.uuid4())}', '{p_uid}', '{off_uuid}', {p_amt}, '{p_start}', '{p_start}', '{p_status}')
ON CONFLICT DO NOTHING;"""
        sql_statements.append(sql_pay)

    sql_statements.append("\nCOMMIT;")

    out_path = os.path.join(os.path.dirname(__file__), "..", "migration.sql")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    print(f"\n[OK] Generated migration SQL file at: {out_path}")
    print(f"Total SQL statements generated: {len(sql_statements)}")

if __name__ == "__main__":
    migrate()
