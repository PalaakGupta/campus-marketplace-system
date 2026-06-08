from passlib.context import CryptContext
from datetime import date

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def default_password(date_of_birth: date) -> str:
    """
    Default password is date of birth in DDMMYYYY format.
    Example: born 15 Aug 2002 → password is '15082002'
    Admin sets this when creating the student account.
    Student can change it later.
    """
    return date_of_birth.strftime("%d%m%Y")
