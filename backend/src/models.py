from sqlalchemy import Column, Integer, String, Boolean, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone, date

from db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=False)
    description = Column(String, nullable=True)
    dob: Mapped[date] = mapped_column(nullable=True) #date of birth
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    last_calc: Mapped[dict | list | None] = mapped_column(JSON, default=dict)
    # last_calc - список из json-файлов в которых лежат выполненные вычисления
    # например:
    # json = [{'time':'2026-03-24 17:36:20',
    #          'type':'derivative',
    #         'expr':"x**2-32*x",
    #         'latex':'bla bla bla',
    #         'result':'2*x-32',
    #         },
    #         {'time':'2026-03-29 17:36:20',
    #          'type':'penis',
    #          },
    #         ]