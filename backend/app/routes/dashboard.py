import tempfile
import os
import shutil
import pandas
from decimal import Decimal
from turtle import pd
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from logging import info, basicConfig, getLogger, INFO, ERROR
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, distinct
from core.auth import get_current_user
from core.database import get_db
from models import projects as project_model, forecasts as forecast_model, users as user_model
from models.exchange_rates import ExchangeRates
from datetime import datetime
from typing import Optional
import io
from uuid import UUID

from schemas.currency import CurrencyRatesUpdateRequest

basicConfig(level=ERROR)
logger = getLogger("uvicorn")
logger.setLevel(ERROR)

router = APIRouter()

def get_user_projects(user, db: Session):
    """Reuse project filtering logic from projects.py"""
    if user.role == "PM":
        return db.query(project_model.Project).filter(project_model.Project.manager_id == user.id).all()
    elif user.role == "CH":
        return db.query(project_model.Project).filter(project_model.Project.cluster_id == user.cluster_id).all()
    else:  # SH
        return db.query(project_model.Project).all()

def get_financial_year_info(year=None):
    """Get financial year start, end and year based on current date or provided year"""
    now = datetime.now()
    if year:
        fy_year = year
        if now.month < 4:
            fy_start = datetime(year - 1, 4, 1)
            fy_end = datetime(year, 3, 31)
        else:
            fy_start = datetime(year, 4, 1)
            fy_end = datetime(year + 1, 3, 31)
    else:
        if now.month < 4:
            fy_start = datetime(now.year - 1, 4, 1)
            fy_end = datetime(now.year, 3, 31)
            fy_year = now.year - 1
        else:
            fy_start = datetime(now.year, 4, 1)
            fy_end = datetime(now.year + 1, 3, 31)
            fy_year = now.year
    
    return fy_start, fy_end, fy_year

def get_quarter_months(quarter):
    """Get months for a specific quarter in financial year (Apr-Mar)"""
    quarter_months = {
        "Q1": [4, 5, 6],     # Apr-Jun
        "Q2": [7, 8, 9],     # Jul-Sep
        "Q3": [10, 11, 12],  # Oct-Dec
        "Q4": [1, 2, 3]      # Jan-Mar
    }
    return quarter_months.get(quarter, [])

def get_forecasts_for_fy(project_ids, fy_year, db: Session, quarter=None, forecast_type=None):
    """Get forecasts for financial year (Apr-Mar) with optional quarter and forecast type filter"""
    base_query = db.query(forecast_model.Forecast).filter(
        forecast_model.Forecast.project_id.in_(project_ids) if project_ids else False,
        or_(
            and_(
                forecast_model.Forecast.year == fy_year,
                forecast_model.Forecast.month >= 4
            ),
            and_(
                forecast_model.Forecast.year == fy_year + 1,
                forecast_model.Forecast.month <= 3
            )
        )
    )
    
    # Apply quarter filter if specified
    if quarter and quarter != "all":
        quarter_months = get_quarter_months(quarter)
        if quarter_months:
            base_query = base_query.filter(forecast_model.Forecast.month.in_(quarter_months))
    
    # Apply forecast type filter if specified
    if forecast_type and forecast_type != "all":
        base_query = base_query.filter(forecast_model.Forecast.forecast_type == forecast_type)
    
    return base_query.all()

def convert_currency(amount, from_currency, to_currency, db: Session):
    """Convert amount from one currency to another using exchange rates"""
    if from_currency == to_currency:
        return float(amount)
    
    # Get exchange rates
    from_rate = db.query(ExchangeRates).filter(ExchangeRates.currency_code == from_currency).first()
    to_rate = db.query(ExchangeRates).filter(ExchangeRates.currency_code == to_currency).first()
    
    if not from_rate or not to_rate:
        # Fallback to original amount if rates not found
        return float(amount)
    
    # Convert to USD first, then to target currency
    usd_amount = float(amount) * float(from_rate.rate_to_usd)
    target_amount = usd_amount / float(to_rate.rate_to_usd)
    
    return target_amount

def convert_usd_to_currency(usd_amount, to_currency, db: Session):
    """Convert USD amount to target currency using exchange rates"""
    if to_currency == "USD":
        return float(usd_amount)
    
    # Get exchange rate for target currency
    to_rate = db.query(ExchangeRates).filter(ExchangeRates.currency_code == to_currency).first()
    
    if not to_rate:
        # Fallback to original amount if rate not found
        return float(usd_amount)
    
    # Convert from USD to target currency
    target_amount = float(usd_amount) / float(to_rate.rate_to_usd)
    
    return target_amount

def get_currency_symbol(currency_code):
    """Get currency symbol based on currency code"""
    symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'INR': '₹',
        'CNY': '¥',
        'AUD': 'A$',
        'CAD': 'C$',
        'CHF': 'CHF',
        'SGD': 'S$'
    }
    return symbols.get(currency_code, currency_code)

@router.get("/summary")
def get_dashboard_summary(
    project_number: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    cluster: Optional[str] = Query(None),
    manager: Optional[str] = Query(None),
    vertical: Optional[str] = Query(None),
    forecast_type: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    display_currency: Optional[str] = Query("INR"),
    year: Optional[int] = Query(None),
    quarter: Optional[str] = Query(None),
    customer_group: Optional[str] = Query(None),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # --- 1. Prepare basic info ---
    fy_start, fy_end, fy_year = get_financial_year_info(year)
    projects = get_user_projects(user, db)

    # Filter projects in memory
    if project_number and project_number != "all":
        projects = [p for p in projects if p.project_number == project_number]
    if region and region != "all":
        projects = [p for p in projects if p.region == region]
    if status and status != "all":
        projects = [p for p in projects if p.status == status]
    if vertical and vertical != "all":
        projects = [p for p in projects if p.vertical == vertical]
    if customer_group and customer_group != "all":
        projects = [p for p in projects if p.customer_group == customer_group]
    
    if cluster and cluster != "all":
        try:
            cluster_uuid = UUID(cluster)
            projects = [p for p in projects if p.cluster_id == cluster_uuid]
        except ValueError:
            projects = []
    if manager and manager != "all":
        try:
            manager_uuid = UUID(manager)
            projects = [p for p in projects if p.manager_id == manager_uuid]
        except ValueError:
            projects = []
    if currency and currency != "all":
        projects = [p for p in projects if p.currency == currency]

    project_ids = [p.id for p in projects]
    project_map = {p.id: p for p in projects}

    # --- 2. Get forecasts and exchange rate map ---
    forecasts = get_forecasts_for_fy(project_ids, fy_year, db, quarter, forecast_type)
    fy_years = db.query(forecast_model.Forecast.year).distinct().all()
    fy_years_forecast = {year[0]: 0 for year in fy_years}
    fy_years_actual = {year[0]: 0 for year in fy_years}
    rates = db.query(ExchangeRates).all()
    rate_map = {r.currency_code: float(r.rate_to_usd) for r in rates}

    def convert_usd(usd_amount):
        if display_currency == "USD":
            return usd_amount
        rate = rate_map.get(display_currency)
        return usd_amount / rate if rate else usd_amount

    # --- 3. Setup ---
    display_months = get_quarter_months(quarter) if quarter and quarter != "all" else list(range(4, 13)) + list(range(1, 4))
    forecast_by_month = {month: 0 for month in display_months}
    fa_variance_by_month = {month: 0 for month in display_months}
    actual_by_month = {month: 0 for month in display_months}

    # P-fetch cluster heads
    cluster_heads = db.query(user_model.User).filter(user_model.User.role == "CH").all()
    cluster_map = {ch.cluster_id: ch.name for ch in cluster_heads}

    # --- 4. Aggregate forecasts ---
    total_forecast = 0
    total_actual = 0
    region_forecast = {}
    vertical_forecast = {}

    for f in forecasts:
        if f.month not in display_months:
            continue

        usd_amount = float(f.forecast_usd) if f.forecast_usd else 0
        converted = convert_usd(usd_amount)
        forecast_by_month[f.month] += converted
        # total_forecast += converted

        actual_amount = float(f.actuals) if f.actuals else 0
        actual_converted = convert_usd(actual_amount)
        actual_by_month[f.month] += actual_converted
        total_actual += actual_converted

        fa_variance_by_month[f.month] = actual_converted - converted;

        if f.actuals != 0:
            total_forecast += actual_converted
        else:
            total_forecast += converted

        if f.month < 4:
            fy_years_forecast[f.year] += converted
            fy_years_actual[f.year] += actual_converted
        else:
            fy_years_actual[f.year+1] += actual_converted
            fy_years_forecast[f.year+1] += converted 
        
        project = project_map.get(f.project_id)
        if not project:
            continue

        if project.region:
            region_forecast[project.region] = region_forecast.get(project.region, 0) + converted
        if project.vertical:
            vertical_forecast[project.vertical] = vertical_forecast.get(project.vertical, 0) + converted

    # --- 5. Group by properties ---
    projects_by_region = {}
    projects_by_status = {}
    projects_by_vertical = {}
    projects_by_cluster = {}
    projects_by_currency = {}

    for p in projects:
        if p.region:
            projects_by_region[p.region] = projects_by_region.get(p.region, 0) + 1
        if p.status:
            projects_by_status[p.status] = projects_by_status.get(p.status, 0) + 1
        if p.vertical:
            projects_by_vertical[p.vertical] = projects_by_vertical.get(p.vertical, 0) + 1
        if p.currency:
            projects_by_currency[p.currency] = projects_by_currency.get(p.currency, 0) + 1
        if p.cluster_id:
            cluster_name = f"Cluster - {cluster_map.get(p.cluster_id, 'Unknown')}"
            projects_by_cluster[cluster_name] = projects_by_cluster.get(cluster_name, 0) + 1

    # --- 6. Currency breakdown ---
    currency_breakdown = {}
    for curr, count in projects_by_currency.items():
        curr_total = sum(
            convert_usd(float(f.forecast_usd)) for f in forecasts
            if project_map.get(f.project_id) and project_map[f.project_id].currency == curr
        )
        currency_breakdown[curr] = {
            "project_count": count,
            "total_forecast": curr_total
        }

    # --- 7. Forecast by quarter ---
    if quarter and quarter != "all":
        forecast_by_quarter = {quarter: total_forecast}
        actual_by_quarter = {quarter: total_actual}
    else:
        forecast_by_quarter = {
            "Q1": sum(forecast_by_month.get(m, 0) for m in [4, 5, 6]),
            "Q2": sum(forecast_by_month.get(m, 0) for m in [7, 8, 9]),
            "Q3": sum(forecast_by_month.get(m, 0) for m in [10, 11, 12]),
            "Q4": sum(forecast_by_month.get(m, 0) for m in [1, 2, 3])
        }

        actual_by_quarter = {
            "Q1": sum(actual_by_month.get(m, 0) for m in [4, 5, 6]),
            "Q2": sum(actual_by_month.get(m, 0) for m in [7, 8, 9]),
            "Q3": sum(actual_by_month.get(m, 0) for m in [10, 11, 12]),
            "Q4": sum(actual_by_month.get(m, 0) for m in [1, 2, 3])
        }
        
    # --- 8. Final response ---
    return {
        "role": user.role,
        "financial_year": f"{fy_year}-{fy_year + 1}",
        "display_currency": display_currency,
        "currency_symbol": get_currency_symbol(display_currency),
        "total_projects": len(projects),
        "total_forecast_amount": total_forecast,
        "total_actual_amount": total_actual,
        "fy_years_actual": fy_years_actual,
        "fy_years_forecast": fy_years_forecast,
        "forecast_by_month": forecast_by_month,
        "actual_by_month": actual_by_month,
        "fa_variance_by_month": fa_variance_by_month,
        "forecast_by_quarter": forecast_by_quarter,
        "actual_by_quarter": actual_by_quarter,
        "projects_by_region": projects_by_region,
        "projects_by_status": projects_by_status,
        "projects_by_vertical": projects_by_vertical,
        "projects_by_cluster": projects_by_cluster,
        "projects_by_currency": projects_by_currency,
        "currency_breakdown": currency_breakdown,
        "region_forecast": region_forecast,
        "vertical_forecast": vertical_forecast,
    }


@router.get("/trends")
def get_trend_analysis(
    display_currency: Optional[str] = Query("INR"),
    quarter: Optional[str] = Query(None),  # Add quarter filter to trends
    user=Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get trend analysis comparing current vs previous periods with currency conversion"""
    
    # Get current and previous FY info
    _, _, current_fy = get_financial_year_info()
    previous_fy = current_fy - 1
    
    # Get projects using existing logic
    projects = get_user_projects(user, db)
    project_ids = [p.id for p in projects]
    
    # Get forecasts for both years with quarter filter
    current_forecasts = get_forecasts_for_fy(project_ids, current_fy, db, quarter)
    previous_forecasts = get_forecasts_for_fy(project_ids, previous_fy, db, quarter)
    
    # Calculate totals using forecast_usd
    current_total = 0
    for f in current_forecasts:
        usd_amount = float(f.forecast_usd) if f.forecast_usd else 0
        converted_amount = convert_usd_to_currency(usd_amount, display_currency, db)
        current_total += converted_amount
    
    previous_total = 0
    for f in previous_forecasts:
        usd_amount = float(f.forecast_usd) if f.forecast_usd else 0
        converted_amount = convert_usd_to_currency(usd_amount, display_currency, db)
        previous_total += converted_amount
    
    growth_rate = ((current_total - previous_total) / previous_total * 100) if previous_total > 0 else 0
    
    period_suffix = f" ({quarter})" if quarter and quarter != "all" else ""
    
    return {
        "current_fy_total": current_total,
        "previous_fy_total": previous_total,
        "growth_rate": growth_rate,
        "current_fy": f"{current_fy}-{current_fy + 1}{period_suffix}",
        "previous_fy": f"{previous_fy}-{previous_fy + 1}{period_suffix}",
        "display_currency": display_currency,
        "currency_symbol": get_currency_symbol(display_currency),
        "quarter_filter": quarter
    }

@router.get("/exchange-rates")
def get_exchange_rates(db: Session = Depends(get_db)):
    """Get current exchange rates"""
    rates = db.query(ExchangeRates).all()
    return {
        "rates": [
            {
                "currency_code": rate.currency_code,
                "rate_to_usd": float(rate.rate_to_usd),
                "last_updated": rate.last_updated
            }
            for rate in rates
        ]
    }

@router.get("/currency-rates")
def get_currency_rates(
    user=Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get all currency exchange rates - Only accessible by SH role"""
    if user.role != "SH":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only SH role users can access currency rates."
        )
    
    rates = db.query(ExchangeRates).order_by(ExchangeRates.currency_code).all()
    return [
        {
            "currency_code": rate.currency_code,
            "rate_to_usd": float(rate.rate_to_usd),
            "last_updated": rate.last_updated
        }
        for rate in rates
    ]

@router.put("/currency-rates")
def update_currency_rates(
    request: CurrencyRatesUpdateRequest,
    user=Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Update currency exchange rates - Only accessible by SH role"""
    if user.role != "SH":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only SH role users can modify currency rates."
        )
    
    try:
        # Update each currency rate
        for rate_update in request.rates:
            # Find existing rate
            existing_rate = db.query(ExchangeRates).filter(
                ExchangeRates.currency_code == rate_update.currency_code
            ).first()
            
            if existing_rate:
                # Update existing rate
                existing_rate.rate_to_usd = rate_update.rate_to_usd
                existing_rate.last_updated = func.now()
            else:
                # Create new rate if it doesn't exist
                new_rate = ExchangeRates(
                    currency_code=rate_update.currency_code,
                    rate_to_usd=rate_update.rate_to_usd
                )
                db.add(new_rate)
        
        db.commit()
        return {"message": "Currency rates updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update currency rates: {str(e)}"
        )

@router.post("/import-actuals")
async def import_actuals(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_file_path = tmp.name

        # First, let's inspect the file structure to find the correct header row
        df_inspect = pandas.read_excel(temp_file_path, sheet_name=0, header=None, nrows=10)
        
        logger.info("Inspecting Excel file structure:")
        for i in range(min(10, len(df_inspect))):
            row_values = df_inspect.iloc[i].tolist()
            logger.info(f"Row {i}: {row_values}")
        
        # Read the file with the detected header row
        df = pandas.read_excel(temp_file_path, sheet_name=0, header=0, dtype=str)
        headers = df.columns.to_list()
        
        # Clean headers
        clean_headers = []
        for i, h in enumerate(headers):
            if h is not None and str(h).strip() != 'nan' and str(h).strip() != '':
                clean_headers.append(str(h).strip())
            else:
                clean_headers.append(f'Unnamed_{i}')
        
        df.columns = clean_headers
        headers = clean_headers

        logger.info(f"Found headers after cleaning: {headers}")
        
        # Find project column
        project_col_index = None
        ipms_variations = ['ipms id', 'ipms_id', 'ipmsid', 'project id', 'project_id', 'projectid', 'project number', 'project_number', 'project']
        
        for i, header in enumerate(headers):
            header_lower = str(header).lower().strip()
            if header_lower in ipms_variations or any(variation in header_lower for variation in ipms_variations):
                project_col_index = i
                logger.info(f"Found project ID column at index {i}: '{header}'")
                break

        if project_col_index is None:
            available_headers = [f"'{h}'" for h in headers]
            error_msg = f"Excel must contain 'IPMS ID' or 'Project' column. Available headers: {', '.join(available_headers)}"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)

        # Identify actual columns
        month_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
            'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }

        actual_columns = []
        for i, header in enumerate(headers):
            header_str = str(header).strip()
            
            if header_str and "'" in header_str:
                try:
                    parts = header_str.lower().split("'")
                    if len(parts) == 2:
                        month_part = parts[0].strip()
                        year_part = parts[1].strip()
                        
                        if month_part in month_map:
                            month = month_map[month_part]
                            year_suffix = int(year_part)
                            year = 2000 + year_suffix if year_suffix <= 50 else 1900 + year_suffix
                            
                            actual_columns.append({
                                'index': i,
                                'header': header_str,
                                'year': year,
                                'month': month
                            })
                            logger.info(f"Added actual column: {header_str} -> {month}/{year}")
                except Exception as e:
                    logger.warning(f"Error processing header '{header_str}': {e}")
                    continue

        logger.info(f"Found {len(actual_columns)} actual columns")

        # Debug: Check what projects exist in the database
        existing_projects = db.query(project_model.Project).all()
        logger.info(f"Found {len(existing_projects)} projects in database")
        for proj in existing_projects[:5]:  # Show first 5 for debugging
            logger.info(f"DB Project: ID={proj.id}, Number='{proj.project_number}'")

        # Debug: Check what forecasts exist
        existing_forecasts = db.query(forecast_model.Forecast).filter(forecast_model.Forecast.forecast_type == "OB").all()
        logger.info(f"Found {len(existing_forecasts)} OB forecasts in database")
        for forecast in existing_forecasts[:5]:  # Show first 5 for debugging
            project = db.query(project_model.Project).filter(project_model.Project.id == forecast.project_id).first()
            logger.info(f"DB Forecast: Project={project.project_number if project else 'Unknown'}, Year={forecast.year}, Month={forecast.month}, Type={forecast.forecast_type}")

        # Process each row
        updated_count = 0
        processed_projects = set()
        not_found_projects = set()
        no_matching_forecasts = []
        
        for idx, row in df.iterrows():
            project_number = str(row.iloc[project_col_index]).strip() if not pandas.isna(row.iloc[project_col_index]) else ''
            
            if not project_number or project_number.lower() in ['nan', 'none', '']:
                logger.info(f"Skipping row {idx} - empty project number")
                continue

            logger.info(f"Processing row {idx}: project_number='{project_number}'")
            
            # Find the project
            project = db.query(project_model.Project).filter(project_model.Project.project_number == project_number).first()
            if not project:
                logger.warning(f"Project not found in database: '{project_number}'")
                not_found_projects.add(project_number)
                continue
            
            processed_projects.add(project_number)
            logger.info(f"Found project: ID={project.id}, Number='{project.project_number}'")

            # Process each actual column
            for actual_col in actual_columns:
                raw_value = row.iloc[actual_col['index']]
                
                # Parse the actual amount
                actual_amount = Decimal('0')
                try:
                    if pandas.isna(raw_value) or raw_value in ['', '-', 'null', None]:
                        actual_amount = Decimal('0')
                    else:
                        clean_value = str(raw_value).strip().replace(',', '').replace(' ', '')
                        if clean_value:
                            num_value = float(clean_value)
                            actual_amount = Decimal(str(num_value)) if num_value >= 0 else Decimal('0')
                        else:
                            actual_amount = Decimal('0')
                except Exception as e:
                    logger.warning(f"Invalid actual value: {raw_value} for project {project_number}, setting to 0. Error: {e}")
                    actual_amount = Decimal('0')

                logger.info(f"Looking for forecast: Project_ID={project.id}, Year={actual_col['year']}, Month={actual_col['month']}, Type='OB'")

                # Try to find existing forecast
                forecast = db.query(forecast_model.Forecast).filter(
                    forecast_model.Forecast.project_id == project.id,
                    forecast_model.Forecast.year == actual_col['year'],
                    forecast_model.Forecast.month == actual_col['month'],
                    forecast_model.Forecast.forecast_type == "OB"
                ).first()

                if forecast:
                    old_amount = forecast.actuals
                    forecast.actuals = actual_amount
                    updated_count += 1
                    logger.info(f"✓ Updated forecast for {project_number} - {actual_col['month']}/{actual_col['year']}: {old_amount} -> {actual_amount}")
                else:
                    logger.warning(f"✗ No matching forecast found for {project_number} - {actual_col['month']}/{actual_col['year']}")
                    no_matching_forecasts.append({
                        'project_number': project_number,
                        'project_id': project.id,
                        'year': actual_col['year'],
                        'month': actual_col['month'],
                        'amount': actual_amount
                    })

        # Commit all changes
        db.commit()
        os.remove(temp_file_path)

        logger.info(f"Import completed: {updated_count} forecasts updated, {len(processed_projects)} projects processed")
        logger.info(f"Projects not found: {list(not_found_projects)}")
        logger.info(f"No matching forecasts: {len(no_matching_forecasts)} entries")

        return JSONResponse(content={
            "message": "Actuals import completed"
        })

    except Exception as e:
        logger.error(f"Import failed: {e}")
        if 'temp_file_path' in locals():
            try:
                os.remove(temp_file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")