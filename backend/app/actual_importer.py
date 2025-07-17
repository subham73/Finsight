import re
import uuid
from logging import info, basicConfig, getLogger, INFO, ERROR
from decimal import Decimal
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import pandas as pd
import numpy as np

from config import SessionLocal
from sqlalchemy.exc import SQLAlchemyError
from models import User, Cluster, Project, Forecast
from werkzeug.security import generate_password_hash as hash
from os import path, getenv
from dotenv import load_dotenv

load_dotenv()

basicConfig(level=ERROR)
logger = getLogger("uvicorn")
logger.setLevel(ERROR)


FILES_PATHS = "PLM revenue file sample.xlsx"


class ActualExcelImporter:

    def __init__(self, created_by_user_id: str):

        self.created_by_user_id = self.create_admin(created_by_user_id)

        self.column_mapping = {
            'project_number': ['IPMS ID'],
        }

    def create_admin(self, user_id: str) -> str:

        session = SessionLocal()

        try:

            existing_user = session.query(User).filter_by(id=user_id).first()

            if existing_user:

                info(f"User already exists: {user_id}")
                return user_id
            
            logger.warning("User not found")

            user = User(
                id=user_id,
                name="admin_1",
                email="admin_1@tatatechnologies.com",
                password_hash=hash("123456"),
                role="SH"
            )

            session.add(user)
            session.commit()

            return user.id

        except SQLAlchemyError as Ex:
            session.rollback()
            info(f"Error validating/creating user: {Ex}")
            raise SQLAlchemyError(f"Error validating/creating user: {Ex}")
        
        finally:
            session.close()

    def create_cluster(self, session, cluster_name, region):

        try:

            existing_cluster = session.query(Cluster).filter(
                Cluster.name == cluster_name,
                Cluster.region == region
            ).first()

            if existing_cluster:

                return existing_cluster.id
            
            cluster = Cluster(
                name=cluster_name,
                region=region
            )

            session.add(cluster)
            session.commit()

            return cluster.id

        except SQLAlchemyError as Ex:
            session.rollback()
            logger.error(f"Error handling cluster {cluster_name}: {Ex}")
            raise

    def parse_month_year(self, month_str: str) -> Tuple[int, int]:
        """
        Parse month-year from forecast column headers
        Examples: 'Apr-25', 'Jan-26', 'Apr-25 Forecast'
        
        Returns:
            Tuple of (year, month)
        """
        try:
            # Clean the string
            # month_str = month_str.strip().replace(' Forecast', '')
            
            # Common month abbreviations
            month_map = {
                'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6, 'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
            }
            
            # Extract month and year using regex
            # pattern = r'([a-z]{10})\'(\d{2})'
            # match = re.search(pattern, month_str.lower())

            month_nd_year = month_str.split('\'')
            
            if month_nd_year:
                month_abbr = month_nd_year[0]
                year_suffix = month_nd_year[1]
                month = month_map.get(month_abbr.lower())
                
                if month:
                    # Convert 2-digit year to 4-digit year
                    year_suffix = int(year_suffix)
                    if year_suffix >= 0 and year_suffix <= 30:  # Assume 2000-2030
                        year = 2000 + year_suffix
                    else:  # Assume 1970-1999
                        year = 1900 + year_suffix
                    
                    return (year, month)
            
            logger.warning(f"Could not parse month/year from: {month_str}")
            return (2025, 1)  # Default fallback
            
        except Exception as e:
            logger.error(f"Error parsing month/year from '{month_str}': {e}")
            return (2025, 1)  # Default fallback

    def clean_forecast_value(self, value: Any) -> Decimal:
        """
        Clean and convert forecast values to Decimal
        Handles null, '-', empty strings, and non-numeric values
        """
        if pd.isna(value) or value is None:
            return Decimal('0')
        
        if isinstance(value, str):
            value = value.strip()
            if value == '' or value == '-' or value.lower() == 'null':
                return Decimal('0')
        
        try:
            # Convert to float first, then to Decimal
            num_value = float(value)
            if num_value < 0:
                logger.warning(f"Negative forecast value found: {num_value}, setting to 0")
                return Decimal('0')
            return Decimal(str(num_value))
        except (ValueError, TypeError):
            logger.warning(f"Invalid forecast value: {value}, setting to 0")
            return Decimal('0')

    def import_to_database(self, file_data: Dict[str, Any]) -> None:

        session = SessionLocal()


        try:

            projects = file_data["projects"]

            for project in projects:

                project_number = project['project_number']

                actuals = project['actuals']

                existing_project = session.query(Project).filter_by(
                    project_number=project_number
                ).first()

                if existing_project:

                    for actual in actuals:

                        forecast = session.query(Forecast).filter(
                            Forecast.project_id == existing_project.id,
                            Forecast.year == actual['year'],
                            Forecast.month == actual['month'],
                            Forecast.forecast_type == "OB"
                        ).first()

                        if forecast:

                            forecast.actual_amount = actual['actual_amount']

                    session.commit()


        except Exception as Ex:

            session.rollback()
            logger.error(f"Unable to save it in db: {Ex}")
            raise

        finally:
            session.close()

    def import_files(self, file_paths: List[str]) -> None:

        valid_paths = []

        for file_path in file_paths:

            if Path(file_path).exists():
                valid_paths.append(file_path)

            else:
                logger.warning(f"File not Found: {file_path}")

        if not valid_paths:
            logger.error("No valid files found to import")
            return

        successful_import = 0
        failed_import = 0

        for valid_path in valid_paths:

            try:

                file_data = self.process_excel(valid_path)

                self.import_to_database(file_data)

                successful_import += 1
                info(f"Successfully imported: {file_path}")

            except Exception as Ex:
                failed_import += 1
                logger.error(f"Failed to import {file_path}")

        info(f"Import Completed. Succees: {successful_import}, Failed: {failed_import}") 
        
    def find_column_index(self, headers: List[str], column_names: List[str]) -> Optional[int]:
        """Find the index of a column by trying multiple possible names"""
        for col_name in column_names:
            for i, header in enumerate(headers):
                if header and col_name.lower() in header.lower():
                    return i
        return None

    def process_excel(self, file_path: str) -> Dict[str, Any]:

        logger.info(f"Processing file: {file_path}")

        try:

            df = pd.read_excel(file_path, sheet_name=0, header=3, dtype=str)

            headers = df.columns.to_list()

            column_indices = {}
            for key, possible_names in self.column_mapping.items():
                idx = self.find_column_index(headers, possible_names)
                if idx is not None:
                    column_indices[key] = idx
                    logger.debug(f"Found {key} at column {idx}: {headers[idx]}")

            # print(column_indices)

            actual_columns = []
            for i, header in enumerate(headers):
                if isinstance(header, str) and any(
                    month in header.lower() for month in ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
                ):
                    year, month = self.parse_month_year(header)
                    actual_columns.append({
                        'index': i,
                        'header': header,
                        'year': year,
                        'month': month
                    })

            
            logger.info(f"Found {len(actual_columns)} actual columns")


            projects = []
            for idx, row in df.iterrows():
                # Skip empty rows
                # if pd.isna(row.iloc[column_indices.get('project_name', 6)]):
                #     continue
                
                project_data = {
                    'project_number': str(row.iloc[column_indices.get('project_number', 2)]) if not pd.isna(row.iloc[column_indices.get('project_number', 2)]) else '',
                    'actuals': []
                }

                # Handle OP IDs / New Accounts rule
                # if not project_data['op_ids'] or project_data['op_ids'] == 'nan':
                #     project_data['op_ids'] = project_data['project_number']
                
                # Extract forecast values
                for actual_col in actual_columns:
                    forecast_value = self.clean_forecast_value(row.iloc[actual_col['index']])
                    if forecast_value > 0:  # Only include non-zero forecasts
                        project_data['actuals'].append({
                            'year': actual_col['year'],
                            'month': actual_col['month'],
                            'actual_amount': forecast_value
                        })
                
                projects.append(project_data)

            logger.info(f"Processed {len(projects)} projects from {file_path}")

            return {
                'file_path': file_path,
                'projects': projects
            }
            

        except Exception as Ex:

            logger.error(f"Error processing file {file_path}: {Ex}")
            raise

def execute_actual():

    admin_user = getenv("CREATED_BY_USER_ID")
    importer = ActualExcelImporter(admin_user)

    importer.import_files(FILES_PATHS)

