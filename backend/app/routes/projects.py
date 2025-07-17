from decimal import Decimal
from uuid import UUID
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from models.exchange_rates import ExchangeRates
from schemas.projects import ProjectCreate, ProjectUpdate
from core.auth import get_current_user
from core.database import get_db
from models import projects as project_model, users as user_model, forecasts as forecast_model
from datetime import datetime
from sqlalchemy import distinct, or_, and_

router = APIRouter()

from fastapi.responses import JSONResponse

@router.get("/check-op-forecast")
def check_op_forecast(
    op_ids: str = Query(...),
    forecast_type: str = Query(...),
    project_number: str = Query(None),
    db: Session = Depends(get_db)
):
    if not op_ids or not forecast_type:
        raise HTTPException(status_code=400, detail="OP ID and Forecast Type are required.")

    existing_project = db.query(project_model.Project).filter(
        project_model.Project.op_ids == op_ids
    ).first()

    if existing_project:
        raise HTTPException(
            status_code=400,
            detail=f"❌ OP ID '{op_ids}' already exists in project '{existing_project.project_name}'."
        )

    if forecast_type == "OB":
        if not project_number:
            raise HTTPException(status_code=400, detail="Project Number is required for OB forecast.")

        existing_project_with_number = db.query(project_model.Project).filter(
            project_model.Project.project_number == project_number
        ).first()

        if existing_project_with_number:
            return {
                "exists": False,
                "is_new_op": True,
                "will_aggregate": True,
                "aggregate_with_project_id": str(existing_project_with_number.id),
                "message": f"⚠️ Will aggregate OB forecasts with existing project number '{project_number}'."
            }

    return {"exists": False, "is_new_op": True, "will_aggregate": False}

@router.get("/managers")
def get_managers(db: Session = Depends(get_db)):
    """Get all users with PM role for dropdown"""
    managers = db.query(user_model.User).filter(user_model.User.role == "PM").all()
    return [{"id": str(m.id), "name": m.name} for m in managers]


@router.get("/cluster-heads")
def get_cluster_heads(db: Session = Depends(get_db)):
    """Get all users with CH role for dropdown"""
    cluster_heads = db.query(user_model.User).filter(user_model.User.role == "CH").all()
    return [{"id": str(ch.id), "name": ch.name, "cluster_id": str(ch.cluster_id)} for ch in cluster_heads]

@router.get("/clusters")
def get_clusters(db: Session = Depends(get_db)):
    """Get all clusters for dropdown"""
    from models.clusters import Cluster
    clusters = db.query(Cluster).all()
    return [{"id": str(c.id), "name": c.name, "region": c.region} for c in clusters]

def convert_currency(amount, from_currency, to_currency, db: Session):
    """Convert amount from one currency to another using exchange rates"""
    if from_currency == to_currency:
        return Decimal(str(amount))
    
    # Get exchange rates
    from_rate = db.query(ExchangeRates).filter(ExchangeRates.currency_code == from_currency).first()
    to_rate = db.query(ExchangeRates).filter(ExchangeRates.currency_code == to_currency).first()
    
    if not from_rate or not to_rate:
        # Fallback to original amount if rates not found
        return Decimal(str(amount))
    
    # Convert to USD first, then to target currency
    usd_amount = Decimal(str(amount)) * Decimal(str(from_rate.rate_to_usd))
    target_amount = usd_amount / Decimal(str(to_rate.rate_to_usd))
    
    return target_amount

@router.get("/")
def get_projects_with_forecasts(
    year: Optional[int] = Query(None),
    project_number: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    vertical: Optional[str] = Query(None),
    cluster: Optional[str] = Query(None),
    manager: Optional[str] = Query(None),
    customer_group: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    forecast_type: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = user.role
    user_id = str(user.id)

    current_date = datetime.now()
    current_year = current_date.year
    current_month = current_date.month
    
    # Determine the financial year start year
    if year is not None:
        # If year is provided, use it as the FY start year
        fy_start_year = year
    else:
        # Auto-detect current financial year
        if current_month >= 4:  # Apr-Dec: FY starts in current year
            fy_start_year = current_year
        else:  # Jan-Mar: FY started in previous year
            fy_start_year = current_year - 1
    
    fy_end_year = fy_start_year + 1
    months_apr_to_mar = list(range(4,13)) + list(range(1,4))

    query = db.query(project_model.Project)

    # Role-based filter
    if user.role == "PM":
        query = query.filter(project_model.Project.manager_id == str(user.id))
    elif user.role == "CH":
        query = query.filter(project_model.Project.cluster_id == user.cluster_id)

    # Query filters
    if project_number and project_number != "all":
        query = query.filter(project_model.Project.project_number == project_number)
    if region and region != "all":
        query = query.filter(project_model.Project.region == region)
    if status and status != "all":
        query = query.filter(project_model.Project.status == status)
    if currency and currency != "all":
        query = query.filter(project_model.Project.currency == currency)
    if vertical and vertical != "all":
        query = query.filter(project_model.Project.vertical == vertical)
    
    # Fixed cluster filter
    if cluster and cluster != "all":
        # Try to parse as UUID first (for ID-based filtering)
        try:
            cluster_uuid = UUID(cluster)
            query = query.filter(project_model.Project.cluster_id == cluster_uuid)
        except ValueError:
            # If not UUID, treat as cluster head name
            cluster_head = db.query(user_model.User).filter(
                user_model.User.name == cluster,
                user_model.User.role == "CH"
            ).first()
            if cluster_head:
                query = query.filter(project_model.Project.cluster_id == cluster_head.cluster_id)
    
    # Fixed manager filter
    if manager and manager != "all":
        # Try to parse as UUID first (for ID-based filtering)
        try:
            manager_uuid = UUID(manager)
            query = query.filter(project_model.Project.manager_id == str(manager_uuid))
        except ValueError:
            # If not UUID, treat as manager name
            manager_user = db.query(user_model.User).filter(
                user_model.User.name == manager,
                user_model.User.role == "PM"
            ).first()
            if manager_user:
                query = query.filter(project_model.Project.manager_id == str(manager_user.id))
    
    if customer_group and customer_group != "all":
        query = query.filter(project_model.Project.customer_group == customer_group)
    if customer_name and customer_name != "all":
        query = query.filter(project_model.Project.customer_name == customer_name)
    
    # Fixed forecast_type filter
    if forecast_type and forecast_type != "all":
        query = query.join(forecast_model.Forecast, project_model.Project.id == forecast_model.Forecast.project_id)
        query = query.filter(forecast_model.Forecast.forecast_type == forecast_type)
        query = query.distinct()

    projects = query.all()

    result = []

    for p in projects:
        manager = db.query(user_model.User).filter(user_model.User.id == p.manager_id).first()
        cluster_head = db.query(user_model.User).filter(user_model.User.cluster_id == p.cluster_id, user_model.User.role == "CH").first()

        forecast_values_usd = {m: 0 for m in months_apr_to_mar}
        forecast_values_po = {m: 0 for m in months_apr_to_mar}
        actual_values = {m: 0 for m in months_apr_to_mar}

        forecast_type_result = (
            db.query(forecast_model.Forecast.forecast_type)
            .filter(forecast_model.Forecast.project_id == p.id)
            .first()
        )
        forecast_type_value = forecast_type_result[0] if forecast_type_result else "N/A"

        # Fixed financial year query
        # FY 2025-26: Apr 2025 to Mar 2026
        # fy_start_year = 2025, fy_end_year = 2026
        existing_forecasts = (
            db.query(forecast_model.Forecast)
            .filter(forecast_model.Forecast.project_id == p.id)
            .filter(
                or_(
                    # Apr-Dec of start year (e.g., Apr-Dec 2025)
                    and_(
                        forecast_model.Forecast.year == fy_start_year,
                        forecast_model.Forecast.month >= 4
                    ),
                    # Jan-Mar of end year (e.g., Jan-Mar 2026)
                    and_(
                        forecast_model.Forecast.year == fy_end_year,
                        forecast_model.Forecast.month <= 3
                    )
                )
            )
            .all()
        )

        total_forecast_regional = 0
        total_forecast_usd = 0
        total_actual_usd = 0

        for f in existing_forecasts:
            forecast_values_usd[f.month] = int(f.forecast_usd)
            forecast_values_po[f.month] = int(f.amount)
            actual_values[f.month] = int(f.actuals)
            total_forecast_regional += f.amount
            total_forecast_usd += f.forecast_usd
            total_actual_usd += f.actuals

        result.append({
            "id": p.id,
            "source_country": p.source_country,
            "forecast_type": forecast_type_value,
            "project_number": p.project_number,
            "op_ids": p.op_ids,
            "project_type": p.project_type,
            "project_group": p.project_group,
            "project_name": p.project_name,
            "customer_group": p.customer_group,
            "customer_name": p.customer_name,
            "region": p.region,
            "status": p.status,
            "currency": p.currency,
            "vertical": p.vertical,
            "execution_country": p.execution_country,
            "remarks": p.remarks,
            "manager_name": manager.name if manager else "",
            "cluster_head_name": cluster_head.name if cluster_head else "",
            "forecasts_usd": forecast_values_usd,
            "forecasts_po": forecast_values_po,
            "actuals": actual_values,
            "total_forecast_regional": total_forecast_regional,
            "total_forecast_usd": total_forecast_usd,
            "total_actual_usd": total_actual_usd
        })

    return result

@router.get("/{project_id}")
def get_project_by_id(project_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Get a specific project by ID with forecasts for current financial year"""
    project = db.query(project_model.Project).filter(project_model.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check if user has access to this project
    if user.role == "PM" and str(project.manager_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "CH":
        ch_user = db.query(user_model.User).filter(user_model.User.id == user.id).first()
        # if project.cluster_id != ch_user.cluster_id:
        #     raise HTTPException(status_code=403, detail="Access denied")

    # Get current financial year forecasts
    current_date = datetime.now()
    current_year = current_date.year
    current_month = current_date.month
    financial_year_start = current_year if current_month >= 4 else current_year - 1

    months_apr_to_mar = list(range(4, 13)) + list(range(1, 4))
    forecast_values = {m: 0 for m in months_apr_to_mar}
    actuals_values = {m: 0 for m in months_apr_to_mar}

    existing_forecasts = (
        db.query(forecast_model.Forecast)
        .filter(forecast_model.Forecast.project_id == project.id)
        .filter(
            or_(
                and_(
                    forecast_model.Forecast.year == financial_year_start,
                    forecast_model.Forecast.month >= 4
                ),
                and_(
                    forecast_model.Forecast.year == financial_year_start + 1,
                    forecast_model.Forecast.month <= 3
                )
            )
        )
        .all()
    )

    for f in existing_forecasts:
        forecast_values[f.month] = int(f.amount)
        actuals_values[f.month] = int(f.actuals)
    
    forecast_type = existing_forecasts[0].forecast_type

    return {
        "id": project.id,
        "source_country": project.source_country,
        "project_number": project.project_number,
        "op_ids": project.op_ids,
        "project_name": project.project_name,
        "region": project.region,
        "cluster_id": project.cluster_id,
        "manager_id": project.manager_id,
        "customer_name": project.customer_name,
        "customer_group": project.customer_group,
        "vertical": project.vertical,
        "project_type": project.project_type,
        "project_group": project.project_group,
        "execution_country": project.execution_country,
        "currency": project.currency,
        "remarks": project.remarks,
        "status": project.status,
        "forecast_type": forecast_type,
        "forecasts": forecast_values,
        "actuals": actuals_values
    }

@router.get("/{project_id}/forecasts")
def get_project_forecasts_by_year(
    project_id: UUID, 
    year: int, 
    db: Session = Depends(get_db), 
    user=Depends(get_current_user)
):
    """Get forecasts for a specific project and financial year"""
    project = db.query(project_model.Project).filter(project_model.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check access permissions
    if user.role == "PM" and str(project.manager_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "CH":
        ch_user = db.query(user_model.User).filter(user_model.User.id == user.id).first()
        if project.cluster_id != ch_user.cluster_id:
            raise HTTPException(status_code=403, detail="Access denied")

    forecasts = (
        db.query(forecast_model.Forecast)
        .filter(forecast_model.Forecast.project_id == project_id)
        .filter(
            or_(
                and_(
                    forecast_model.Forecast.year == year,
                    forecast_model.Forecast.month >= 4
                ),
                and_(
                    forecast_model.Forecast.year == year + 1,
                    forecast_model.Forecast.month <= 3
                )
            )
        )
        .all()
    )

    return [
        {
            "month": f.month,
            "amount": int(f.amount),
            "actuals": int(f.actuals),
            "forecast_type": f.forecast_type
        }
        for f in forecasts
    ]

@router.post("/", status_code=201)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    try:
        # Check if any forecast is OB
        is_ob_forecast = any(f.forecast_type == "OB" for f in project.forecasts)

        if is_ob_forecast:
            # Check if the op_ids already exist
            existing_op_project = db.query(project_model.Project).filter(
                project_model.Project.op_ids == project.op_ids
            ).first()

            if existing_op_project:
                existing_ob_forecast = db.query(forecast_model.Forecast).filter(
                    forecast_model.Forecast.project_id == existing_op_project.id,
                    forecast_model.Forecast.forecast_type == "OB"
                ).first()
                if existing_ob_forecast:
                    raise HTTPException(status_code=400, detail="OP ID with OB forecast already exists")

            if not existing_op_project and not project.project_number:
                raise HTTPException(status_code=400, detail="Project Number is required for new OP ID with OB forecast")

            # Check if project number already exists (to aggregate with)
            if not existing_op_project and project.project_number:
                existing_project_with_number = db.query(project_model.Project).filter(
                    project_model.Project.project_number == project.project_number
                ).first()

                if existing_project_with_number:
                    # ✅ Aggregate logic begins
                    # Merge OP IDs
                    existing_op_ids = (existing_project_with_number.op_ids or "").split(",")
                    new_op_ids = (project.op_ids or "").split(",")
                    combined_op_ids = sorted(set(filter(None, existing_op_ids + new_op_ids)))
                    existing_project_with_number.op_ids = ",".join(combined_op_ids)

                    # Append remarks if any
                    if project.remarks:
                        existing_project_with_number.remarks = (
                            (existing_project_with_number.remarks or "") + " | " + project.remarks
                            if existing_project_with_number.remarks else project.remarks
                        )

                    # Aggregate OB forecasts
                    for f in project.forecasts:
                        if f.forecast_type != "OB":
                            continue

                        forecast_usd = convert_currency(f.amount, project.currency or "USD", "USD", db)

                        existing_forecast = db.query(forecast_model.Forecast).filter(
                            forecast_model.Forecast.project_id == existing_project_with_number.id,
                            forecast_model.Forecast.forecast_type == "OB",
                            forecast_model.Forecast.year == f.year,
                            forecast_model.Forecast.month == f.month
                        ).first()

                        if existing_forecast:
                            existing_forecast.amount += f.amount
                            existing_forecast.forecast_usd += forecast_usd
                        else:
                            new_forecast = forecast_model.Forecast(
                                id=uuid.uuid4(),
                                project_id=existing_project_with_number.id,
                                forecast_type=f.forecast_type,
                                year=f.year,
                                month=f.month,
                                amount=f.amount,
                                forecast_usd=forecast_usd,
                                created_by=existing_project_with_number.manager_id
                            )
                            db.add(new_forecast)

                    db.commit()
                    db.refresh(existing_project_with_number)

                    return {
                        "message": "OB forecasts aggregated successfully",
                        "project_id": str(existing_project_with_number.id),
                        "aggregated": True
                    }

        # ✅ Standard project creation flow (if not aggregating)
        new_project = project_model.Project(
            id=uuid.uuid4(),
            source_country=project.source_country,
            project_number=project.project_number,
            op_ids=project.op_ids,
            project_name=project.project_name,
            region=project.region,
            cluster_id=project.cluster_id,
            manager_id=project.manager_id,
            customer_name=project.customer_name,
            customer_group=project.customer_group,
            vertical=project.vertical,
            project_type=project.project_type,
            project_group=project.project_group,
            execution_country=project.execution_country,
            currency=project.currency,
            remarks=project.remarks,
            status=project.status,
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        for f in project.forecasts:
            forecast_usd = convert_currency(f.amount, project.currency or "USD", "USD", db)

            forecast_entry = forecast_model.Forecast(
                id=uuid.uuid4(),
                project_id=new_project.id,
                forecast_type=f.forecast_type,
                year=f.year,
                month=f.month,
                amount=f.amount,
                forecast_usd=forecast_usd,
                created_by=new_project.manager_id
            )
            db.add(forecast_entry)

        db.commit()

        return {
            "message": "Project created successfully",
            "project_id": str(new_project.id),
            "aggregated": False
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{project_id}")
def update_project(
    project_id: UUID, 
    project_update: ProjectUpdate, 
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    project = db.query(project_model.Project).filter(project_model.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check permissions
    if user.role == "PM" and str(project.manager_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "CH":
        ch_user = db.query(user_model.User).filter(user_model.User.id == user.id).first()
        if project.cluster_id != ch_user.cluster_id:
            raise HTTPException(status_code=403, detail="Access denied")

    # Update project fields
    for field, value in project_update.dict(exclude_unset=True).items():
        if hasattr(project, field):
            setattr(project, field, value)

    project.updated_by = user.id
    project.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(project)
    return {"message": "Project updated successfully"}

@router.put("/{project_id}/forecasts")
def update_project_forecasts(
    project_id: UUID,
    forecast_data: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Update forecasts for a specific project and financial year"""
    project = db.query(project_model.Project).filter(project_model.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check permissions
    if user.role == "PM" and str(project.manager_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "CH":
        ch_user = db.query(user_model.User).filter(user_model.User.id == user.id).first()
        if project.cluster_id != ch_user.cluster_id:
            raise HTTPException(status_code=403, detail="Access denied")

    year = forecast_data.get("year")
    forecasts = forecast_data.get("forecasts", [])

    # Delete existing forecasts for this year
    db.query(forecast_model.Forecast).filter(
        forecast_model.Forecast.project_id == project_id,
        or_(
            and_(
                forecast_model.Forecast.year == year,
                forecast_model.Forecast.month >= 4
            ),
            and_(
                forecast_model.Forecast.year == year + 1,
                forecast_model.Forecast.month <= 3
            )
        )
    ).delete()

    # Insert new forecasts
    for f in forecasts:
        if f["amount"] > 0:  # Only insert non-zero forecasts
            forecast_usd = convert_currency(f["amount"], project.currency or "USD", "USD", db)
            forecast_entry = forecast_model.Forecast(
                id=uuid.uuid4(),
                project_id=project_id,
                forecast_type=f["forecast_type"],
                year=f["year"],
                month=f["month"],
                amount=f["amount"],
                forecast_usd=forecast_usd,
                created_by=str(user.id)
            )
            forecast_entry.updated_by = user.id
            forecast_entry.updated_at = datetime.utcnow()
            db.add(forecast_entry)

    db.commit()
    return {"message": "Forecasts updated successfully"}

@router.put("/{project_id}/forecasts/update-edited")
def update_edited_forecasts(
    project_id: UUID,
    forecast_data: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """
    Update only the edited forecasts for a specific project.
    """
    project = db.query(project_model.Project).filter(project_model.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Permission checks
    if user.role == "PM" and str(project.manager_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")
    elif user.role == "CH":
        ch_user = db.query(user_model.User).filter(user_model.User.id == user.id).first()
        if project.cluster_id != ch_user.cluster_id:
            raise HTTPException(status_code=403, detail="Access denied")

    forecasts = forecast_data.get("forecasts", [])

    for f in forecasts:
        forecast = db.query(forecast_model.Forecast).filter(
            forecast_model.Forecast.project_id == project_id,
            forecast_model.Forecast.year == f["year"],
            forecast_model.Forecast.month == f["month"],
            forecast_model.Forecast.forecast_type == f["forecast_type"]
        ).first()

        if forecast:
            forecast.amount = f["amount"]
            forecast.forecast_usd = convert_currency(f["amount"], project.currency or "USD", "USD", db)
        else:
            new_forecast = forecast_model.Forecast(
                id=uuid.uuid4(),
                project_id=project_id,
                forecast_type=f["forecast_type"],
                year=f["year"],
                month=f["month"],
                amount=f["amount"],
                forecast_usd=convert_currency(f["amount"], project.currency or "USD", "USD", db),
                created_by=str(user.id)
            )
            new_forecast.updated_by = user.id
            new_forecast.updated_at = datetime.utcnow()
            db.add(new_forecast)

    db.commit()
    return {"message": "Edited forecasts updated successfully"}

@router.delete("/{project_id}")
def delete_project(
    project_id: UUID, 
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    """Delete a project and all its forecasts"""
    project = db.query(project_model.Project).filter(project_model.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check permissions - only SH can delete projects
    # if user.role != "SH":
    #     raise HTTPException(status_code=403, detail="Only Senior Heads can delete projects")

    # Delete all forecasts first
    db.query(forecast_model.Forecast).filter(forecast_model.Forecast.project_id == project_id).delete()
    
    # Delete the project
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}

@router.get("/project_number/{project_number}/{op_ids}")
def get_project(project_number: str, op_ids: str, db: Session = Depends(get_db)):
    try:
        project = db.query(project_model.Project).filter(
            project_model.Project.project_number == project_number,
            project_model.Project.op_ids == op_ids,
        ).first()

        if not project:
            return {"message": "Project not found"}

        manager = db.query(user_model.User).filter(
            user_model.User.id == project.manager_id
        ).first()

        # Determine current financial year
        current_date = datetime.now()
        current_year = current_date.year
        current_month = current_date.month
        financial_year_start = current_year if current_month >= 4 else current_year - 1

        months_apr_to_mar = list(range(4, 13)) + list(range(1, 4))

        forecast_values = db.query(forecast_model.Forecast).filter(
            forecast_model.Forecast.project_id == project.id,
            forecast_model.Forecast.year.in_([financial_year_start, financial_year_start + 1]),
            forecast_model.Forecast.month.in_(months_apr_to_mar)
        ).all()

        forecasts = {m: "" for m in months_apr_to_mar}
        for f in forecast_values:
            forecasts[f.month] = float(f.amount)

        return {
            "project": {
                "id": str(project.id),
                "source_country": project.source_country,
                "project_number": project.project_number,
                "op_ids": project.op_ids,
                "project_name": project.project_name,
                "region": project.region,
                "cluster_id": project.cluster_id,
                "customer_name": project.customer_name,
                "customer_group": project.customer_group,
                "vertical": project.vertical,
                "project_type": project.project_type,
                "project_group": project.project_group,
                "execution_country": project.execution_country,
                "currency": project.currency,
                "remarks": project.remarks,
                "status": project.status,
                "forecast_type": project.forecast_type,
            },
            "manager_name": manager.name if manager else "",
            "forecast": {
                "forecastYear": financial_year_start,
                "forecasts": forecasts
            }
        }

    except Exception as ex:
        print(ex)
        return {"message": "Unable to fetch project"}

@router.get('/source-countries/all')
def get_all_source_countries(db: Session = Depends(get_db)):

    try:

        source_countries = db.query(distinct(project_model.Project.source_country)).all()

        print(source_countries)

        if source_countries:

            # return [ { "source_country": source } for source in source_countries]
            return [country[0] for country in source_countries]

    except Exception as Ex:
         

         return { "message": f"Unable to fetch source countries {Ex}" }

@router.get('/project-name/all')
def get_all_project_name(db: Session = Depends(get_db)):

    try:

        projectNames = db.query(distinct(project_model.Project.project_name)).all()

        if projectNames:

            return [projectName[0] for projectName in projectNames]

    except Exception as Ex:
         

         return { "message": f"Unable to fetch project name {Ex}" }
    
@router.get('/customer-name/all')
def get_all_customer_name(db: Session = Depends(get_db)):

    try:

        customerNames = db.query(distinct(project_model.Project.customer_name)).all()

        if customerNames:

            return [customerName[0] for customerName in customerNames]

    except Exception as Ex:
         

         return { "message": f"Unable to fetch project name {Ex}" }
    
@router.get('/customer-group/all')
def get_all_customer_group(db: Session = Depends(get_db)):

    try:

        customerGroups = db.query(distinct(project_model.Project.customer_group)).all()

        if customerGroups:

            return [customerGroup[0] for customerGroup in customerGroups]

    except Exception as Ex:
         

         return { "message": f"Unable to fetch project name {Ex}" }
    
@router.get('/vertical/all')
def get_all_vertical(db: Session = Depends(get_db)):

    try:

        verticals = db.query(distinct(project_model.Project.vertical)).all()

        if verticals:

            return [vertical[0] for vertical in verticals]

    except Exception as Ex:
         

         return { "message": f"Unable to fetch project name {Ex}" }
    
@router.get('/type/all')
def get_all_project_type(db: Session = Depends(get_db)):

    try:

        projectTypes = db.query(distinct(project_model.Project.project_type)).all()

        if projectTypes:

            return [projectType[0] for projectType in projectTypes]

    except Exception as Ex:
         

         return { "message": f"Unable to fetch project name {Ex}" }
    
@router.get('/group/all')
def get_all_group(db: Session = Depends(get_db)):

    try:

        projectGroups = db.query(distinct(project_model.Project.project_group)).all()

        if projectGroups:

            return [projectGroup[0] for projectGroup in projectGroups]

    except Exception as Ex:

         return { "message": f"Unable to fetch project name {Ex}" }

@router.get('/execution-country/all')
def get_all_execution_country(db: Session = Depends(get_db)):

    try:

        executionCountries = db.query(distinct(project_model.Project.execution_country)).all()

        if executionCountries:

            return [executionCountry[0] for executionCountry in executionCountries]

    except Exception as Ex:

         return { "message": f"Unable to fetch project name {Ex}" }

@router.get('/status/all')
def get_all_execution_country(db: Session = Depends(get_db)):

    try:

        projectStatus = db.query(distinct(project_model.Project.status)).all()

        if projectStatus:

            return sorted(list(set([str(status[0]).lower() for status in projectStatus])))

    except Exception as Ex:

         return { "message": f"Unable to fetch project name {Ex}" }
    
@router.get("/project_id_by_number/{project_number}")
def get_project_id_by_number(project_number: str, db: Session = Depends(get_db)):
    project = db.query(project_model.Project).filter(
        project_model.Project.project_number == project_number
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"project_id": str(project.id)}