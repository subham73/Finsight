from sqlalchemy.orm import Session
from core.database import SessionLocal
from models import forecasts as forecast_model, projects as project_model, users as user_model
from datetime import datetime
import uuid
import random

db: Session = SessionLocal()

projects = db.query(project_model.Project).all()
users = db.query(user_model.User).limit(2).all()

if not projects or not users:
    print("No projects or users found. Please add some first.")
else:
    print(f"Seeding forecasts for {len(projects)} projects.")

    fy_start_year = datetime.now().year 
    for project in projects:
        for i in range(12):
            month = (4 + i - 1) % 12 + 1
            year = fy_start_year if month >= 4 else fy_start_year + 1

            forecast = forecast_model.Forecast(
                id=uuid.uuid4(),
                project_id=project.id,
                forecast_type="OB",
                source_country="India",
                year=year,
                month=month,
                amount=round(random.uniform(100, 200), 0),
                created_by=users[0].id
            )
            print(f"Seeding forecast: project={project.id}, year={year}, month={month}, amount={forecast.amount}")
            forecast.forecast_usd = forecast.amount * 0.012
            db.add(forecast)
    db.commit()
    print("Forecasts seeded successfully.")
