"""
Script pentru crearea unui user admin în baza de date.

UTILIZARE:
    1. Salvează acest fișier în C:\\Users\\bogdan.bota\\Desktop\\ai_elearning-platform\\backend\\
    2. Activează venv-ul (dacă nu e activ): .\\venv\\Scripts\\Activate.ps1
    3. Rulează: python create_admin.py

Va crea un user admin cu:
    Email: admin@xflow.ro
    Parolă: Admin123!
"""

import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

# Încarcă variabilele din .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ EROARE: DATABASE_URL nu este setat în .env")
    sys.exit(1)

# Context pentru hash bcrypt (standard FastAPI)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ============================================
# CONFIGURARE USER ADMIN - modifică dacă vrei
# ============================================
ADMIN_EMAIL = "admin@local.com"
ADMIN_PASSWORD = "Admin123!"
ADMIN_FULL_NAME = "Administrator"
ADMIN_ROLE = "admin"  # valorile posibile: admin, manager, student
# ============================================

def main():
    print(f"🔌 Conectare la DB: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Verifică dacă userul există deja
        result = db.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": ADMIN_EMAIL}
        ).fetchone()
        
        if result:
            print(f"⚠️  Userul cu email '{ADMIN_EMAIL}' există deja (ID: {result[0]})")
            response = input("Vrei să-i resetez parola? (y/n): ").strip().lower()
            
            if response == "y":
                new_hash = pwd_context.hash(ADMIN_PASSWORD)
                db.execute(
                    text("UPDATE users SET password_hash = :hash WHERE email = :email"),
                    {"hash": new_hash, "email": ADMIN_EMAIL}
                )
                db.commit()
                print(f"✅ Parola pentru '{ADMIN_EMAIL}' a fost resetată la: {ADMIN_PASSWORD}")
            else:
                print("Anulat. Nu s-a modificat nimic.")
            return
        
        # Hash-uiește parola
        password_hash = pwd_context.hash(ADMIN_PASSWORD)
        
        # Inserează userul nou
        db.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash, role, is_active, created_at)
                VALUES (:full_name, :email, :password_hash, :role, :is_active, NOW())
            """),
            {
                "full_name": ADMIN_FULL_NAME,
                "email": ADMIN_EMAIL,
                "password_hash": password_hash,
                "role": ADMIN_ROLE,
                "is_active": True
            }
        )
        db.commit()
        
        print("\n" + "=" * 50)
        print("✅ USER ADMIN CREAT CU SUCCES!")
        print("=" * 50)
        print(f"📧 Email:   {ADMIN_EMAIL}")
        print(f"🔑 Parolă:  {ADMIN_PASSWORD}")
        print(f"👤 Rol:     {ADMIN_ROLE}")
        print("=" * 50)
        print("\nAcum poți face login pe aplicație!\n")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ EROARE: {e}")
        print("\nVerifică:")
        print("  - PostgreSQL rulează?")
        print("  - DATABASE_URL în .env e corect?")
        print("  - Tabela 'users' există?")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()