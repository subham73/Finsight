from uuid import UUID
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from models.exchange_rates import ExchangeRates
from routes.dashboard import get_user_projects
from schemas.projects import ProjectCreate, ProjectUpdate
from core.auth import get_current_user
from core.database import get_db
from models import projects as project_model, users as user_model, forecasts as forecast_model
from datetime import datetime
from sqlalchemy import or_, and_
from typing import List, Optional
 
router = APIRouter()
 
@router.get("/filters")
def get_filter_options(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all available filter options based on user role"""
   
    # Get projects using existing logic
    projects = get_user_projects(user, db)
   
    # Extract unique values
    regions = list(set(p.region for p in projects if p.region))
    statuses = list(set(p.status for p in projects if p.status))
    verticals = list(set(p.vertical for p in projects if p.vertical))
    customer_groups = list(set(p.customer_group for p in projects if p.customer_group))
    customer_names = list(set(p.customer_name for p in projects if p.customer_name))
 
    # Get available currencies from projects
    currencies = list(set(p.currency for p in projects if p.currency))
   
    # Get clusters - since you don't have clusters table, we'll get unique cluster_ids from projects
    cluster_ids = list(set(p.cluster_id for p in projects if p.cluster_id))
    clusters_data = []
    for cluster_id in cluster_ids:
        # Get cluster head name as cluster name
        cluster_head = db.query(user_model.User).filter(
            user_model.User.cluster_id == cluster_id,
            user_model.User.role == "CH"
        ).first()
        if cluster_head:
            clusters_data.append({
                "id": str(cluster_id),
                "name": f"{cluster_head.name}"
            })
   
    # Get managers based on user role
    if user.role == "SH":
        managers = db.query(user_model.User).filter(user_model.User.role == "PM").order_by(user_model.User.name).all()
        managers_data = [{"id": str(m.id), "name": m.name} for m in managers]
    elif user.role == "CH":
        # Get PMs in the same cluster
        managers = db.query(user_model.User).filter(
            and_(user_model.User.role == "PM", user_model.User.cluster_id == user.cluster_id)
        ).order_by(user_model.User.name).all()
        managers_data = [{"id": str(m.id), "name": m.name} for m in managers]
    else:  # PM
        managers_data = [{"id": str(user.id), "name": user.name}]
   
    # Get all available currencies from exchange rates table
    all_currencies = db.query(ExchangeRates.currency_code).all()
    available_currencies = [curr[0] for curr in all_currencies]
   
    return {
        "regions": sorted(regions),
        "statuses": sorted(statuses),
        "verticals": sorted(verticals),
        "currencies": sorted(currencies),  # Currencies from projects
        "available_currencies": sorted(available_currencies),  # All available currencies for conversion
        "clusters": clusters_data,
        "managers": managers_data,
        "customer_groups": customer_groups,
        "customer_names": customer_names
    }
 
"""
FILTERING CUSTOMER NAME BASED ON CUSTOMER GROUP
"""
@router.get("/customer_group={customer_group}")
def get_customer_names_by_group(customer_group: str, db: Session = Depends(get_db)):
 
    try:
 
        if not customer_group:
 
            return { "message": f"Invalid customer group" }, 400
       
        customer_names = db.query(project_model.Project).filter(
            project_model.Project.customer_group == customer_group
        ).all()
 
        return list(set([project.customer_name for project in customer_names]))
 
    except Exception as Ex:
 
        return { "message": f"Unable to fetch customer names {Ex}" }
   
@router.get("/all")
def get_all_data(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all project data with all fields for cascading filters"""
   
    try:
        # Get projects based on user role using existing logic
        projects = get_user_projects(user, db)
       
        # Prepare the data structure for frontend
        all_data = []
       
        for project in projects:
            # Get manager details
            manager_info = None
            if project.manager_id:
                manager = db.query(user_model.User).filter(
                    user_model.User.id == project.manager_id
                ).first()
                if manager:
                    manager_info = {
                        "id": str(manager.id),
                        "name": manager.name
                    }
           
            # Get cluster details
            cluster_info = None
            if project.cluster_id:
                cluster_head = db.query(user_model.User).filter(
                    user_model.User.cluster_id == project.cluster_id,
                    user_model.User.role == "CH"
                ).first()
                if cluster_head:
                    cluster_info = {
                        "id": str(project.cluster_id),
                        "name": cluster_head.name
                    }
           
            # Get forecasts for this project to extract years, quarters, and forecast types
            forecasts = db.query(forecast_model.Forecast).filter(
                forecast_model.Forecast.project_id == project.id
            ).all()
           
         
 
            # Extract unique years, quarters, and forecast types from forecasts
            years = list(set(f.year for f in forecasts if f.year))
           
            forecast_types = list(set(f.forecast_type for f in forecasts if f.forecast_type))
           
            # Create entries for each combination of year, quarter, and forecast_type
            # This allows proper cascading filtering
            if forecasts:
                for forecast in forecasts:
                    project_data = {
                        "id": str(project.id),
                        "project_name": project.project_name,
                        "region": project.region,
                        "status": project.status,
                        "vertical": project.vertical,
                        "currency": project.currency,
                        "customer_group": project.customer_group,
                        "customer_name": project.customer_name,
                        "manager": manager_info,
                        "cluster": cluster_info,
                        "year": forecast.year,
                        "forecast_type": forecast.forecast_type,
                        "project_number":project.project_number,
                       
                    }
                    all_data.append(project_data)
            else:
                # If no forecasts, still include the project with null forecast fields
                project_data = {
                    "id": str(project.id),
                    "project_name": project.project_name,
                    "region": project.region,
                    "status": project.status,
                    "vertical": project.vertical,
                    "currency": project.currency,
                    "customer_group": project.customer_group,
                    "customer_name": project.customer_name,
                    "manager": manager_info,
                    "cluster": cluster_info,
                    "year": None,
                    "forecast_type": None,
                    "project_number":project.project_number,                  
                }
                all_data.append(project_data)
       
        return all_data
       
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching data: {str(e)}"
        )
   
@router.get("/filtered")
def get_filtered_data(
        year: Optional[int] = Query(None),
        region: Optional[str] = Query(None),
        status: Optional[str] = Query(None),
        forecast_type: Optional[str] = Query(None),
        customer_group: Optional[str] = Query(None),
        customer_name: Optional[str] = Query(None),
        vertical: Optional[str] = Query(None),
        cluster: Optional[str] = Query(None),
        manager: Optional[str] = Query(None),
        project_number:Optional[str] = Query(None),
        user=Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
    """Get filtered project data based on query parameters"""
   
    try:
        # Get all data first
        all_data = get_all_data(user, db)
       
        # Apply filters
        filtered_data = all_data
       
        if year and year != "all":
            filtered_data = [item for item in filtered_data if item["year"] == year]
       
        if region and region != "all":
            filtered_data = [item for item in filtered_data if item["region"] == region]
       
        if status and status != "all":
            filtered_data = [item for item in filtered_data if item["status"] == status]
       
        if forecast_type and forecast_type != "all":
            filtered_data = [item for item in filtered_data if item["forecast_type"] == forecast_type]
       
        if customer_group and customer_group != "all":
            filtered_data = [item for item in filtered_data if item["customer_group"] == customer_group]
       
        if customer_name and customer_name != "all":
            filtered_data = [item for item in filtered_data if item["customer_name"] == customer_name]
       
        if vertical and vertical != "all":
            filtered_data = [item for item in filtered_data if item["vertical"] == vertical]
       
        if cluster and cluster != "all":
            filtered_data = [item for item in filtered_data if item["cluster"] and item["cluster"]["id"] == cluster]
       
        if manager and manager != "all":
            filtered_data = [item for item in filtered_data if item["manager"] and item["manager"]["id"] == manager]
       
        return filtered_data
       
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching filtered data: {str(e)}"
        )
       
   
 