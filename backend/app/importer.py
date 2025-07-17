#!/usr/bin/env python3
"""
Standalone Excel Data Importer
No external model dependencies - defines models inline
"""

import pandas as pd
import uuid
import logging
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, Column, String, Integer, ForeignKey, TIMESTAMP, Text, JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base
from passlib.hash import bcrypt
from datetime import datetime
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create base class
Base = declarative_base()

# Define models inline
class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, unique=True, nullable=False)
    region = Column(Text, CheckConstraint("region IN ('APAC', 'NA', 'EU')"), nullable=False)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    email = Column(Text, nullable=False)
    password_hash = Column(Text, nullable=False)
    role = Column(Text, CheckConstraint("role IN ('PM', 'CH', 'SH')"), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey('clusters.id'))
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(TIMESTAMP, server_default=func.now())

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_country = Column(Text, nullable=False)
    project_number = Column(Text)
    op_ids = Column(Text)
    project_name = Column(Text, nullable=False)
    region = Column(Text, CheckConstraint("region IN ('APAC', 'NA', 'EU')"), nullable=False)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey('clusters.id', ondelete='SET NULL'))
    manager_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    customer_name = Column(Text)
    customer_group = Column(Text)
    vertical = Column(Text)
    project_type = Column(Text)
    project_group = Column(Text)
    execution_country = Column(Text)
    currency = Column(Text)
    remarks = Column(Text)
    status = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Forecast(Base):
    __tablename__ = "forecast_values"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    forecast_type = Column(String, nullable=False)
    source_country = Column(String, nullable=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Integer, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

class ExcelImporter:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        self.clusters_map = {}
        self.users_map = {}
        self.projects_map = {}

    def setup_base_data(self):
        """Create clusters and base users"""
        logger.info("Setting up base clusters and users...")
        
        # Create clusters
        cluster_names = [
            "Rajeev Gopu","Sandeep Kadam", "Anant Saurabh",
            "Milind Joshi", "Alok Agrawal",
        ]
        
        for name in cluster_names:
            # Check if cluster already exists
            existing_cluster = self.session.query(Cluster).filter_by(name=name).first()
            if existing_cluster:
                self.clusters_map[name] = existing_cluster
                logger.info(f"Found existing cluster: {name}")
            else:
                cluster = Cluster(id=uuid.uuid4(), name=name, region="EU")
                self.session.add(cluster)
                self.clusters_map[name] = cluster
                logger.info(f"Created new cluster: {name}")
        
        self.session.commit()
        
        # Create Super Head users
        sh_email = "anand.ananthanarayanan@tatatechnologies.com"
        existing_sh = self.session.query(User).filter_by(email=sh_email).first()
        
        if existing_sh:
            sh1 = existing_sh
            logger.info("Found existing SH user")
        else:
            sh1 = User(
                id=uuid.uuid4(),
                name="Ananthanarayanan, Anand",
                email=sh_email,
                password_hash=bcrypt.hash("admin123"),
                role="SH",
                cluster_id=None,
                created_by=None
            )
            self.session.add(sh1)
            logger.info("Created new SH user")
        
        self.users_map[sh_email] = sh1
        self.session.commit()
        
        # Create Cluster Heads
        cluster_heads = [
            ("Alok Agrawal", "Alok.Agrawal@tatatechnologies.com", "Alok Agrawal"),
            ("Milind Joshi", "Milind.Joshi@tatatechnologies.com", "Milind Joshi"),
            ("Madhup Gupta", "Madhup.Gupta@tatatechnologies.com", "Madhup Gupta"),
            ("Rajeev Gopu", "Rajeev.Gopu@tatatechnologies.com", "Rajeev Gopu"),
            ("Sandeep Kadam", "Sandeep.Kadam@tatatechnologies.com", "Sandeep Kadam"),
            ("Saurabh Sharma", "Saurabh.Sharma@tatatechnologies.com", "Saurabh Sharma"),
            ("Mahesh Byahatti", "Mahesh.Byahatti@tatatechnologies.com", "Mahesh Byahatti"),
        ]
        
        for name, email, cluster_name in cluster_heads:
            existing_ch = self.session.query(User).filter_by(email=email).first()
            if existing_ch:
                self.users_map[email] = existing_ch
                logger.info(f"Found existing CH user: {name}")
            else:
                cluster = self.clusters_map.get(cluster_name)
                ch_user = User(
                    id=uuid.uuid4(),
                    name=name,
                    email=email,
                    password_hash=bcrypt.hash("ch123"),
                    role="CH",
                    cluster_id=cluster.id if cluster else None,
                    created_by=sh1.id
                )
                self.session.add(ch_user)
                self.users_map[email] = ch_user
                logger.info(f"Created new CH user: {name}")
        
        self.session.commit()
        logger.info("Base setup completed")

    def clean_value(self, value):
        if pd.isna(value) or value is None:
            return None
        return str(value).strip()

    def parse_amount(self, amount_str):
        if pd.isna(amount_str) or not amount_str:
            return 0
        
        amount_str = str(amount_str).strip()
        if amount_str in ['-', '', 'None']:
            return 0
        
        # Handle parentheses for negative numbers
        if amount_str.startswith('(') and amount_str.endswith(')'):
            amount_str = '-' + amount_str[1:-1]
        
        cleaned = re.sub(r'[^\d\-\.]', '', amount_str)
        try:
            return int(float(cleaned)) if cleaned else 0
        except ValueError:
            logger.warning(f"Could not parse amount: {amount_str}")
            return 0

    def generate_email(self, name):
        if not name:
            return None
        
        name = name.strip().replace(',', '')
        parts = name.split()
        if len(parts) >= 2:
            return f"{parts[0].lower()}.{parts[-1].lower()}@tatatechnologies.com"
        return f"{name.lower().replace(' ', '.')}@tatatechnologies.com"

    def get_or_create_user(self, name, role="PM", cluster_name=None):
        if not name:
            return None
            
        email = self.generate_email(name)
        
        # Check if user already exists in our map
        if email in self.users_map:
            return self.users_map[email]
        
        # Check if user exists in database
        existing_user = self.session.query(User).filter_by(email=email).first()
        if existing_user:
            self.users_map[email] = existing_user
            return existing_user
        
        cluster = self.clusters_map.get(cluster_name) if cluster_name else None
        
        created_by = None
        if role == "PM" and cluster_name:
            ch_email = self.generate_email(cluster_name)
            created_by = self.users_map.get(ch_email)
        
        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            password_hash=bcrypt.hash("pm123" if role == "PM" else "ch123"),
            role=role,
            cluster_id=cluster.id if cluster else None,
            created_by=created_by.id if created_by else None
        )
        
        self.session.add(user)
        self.session.flush()  # Flush immediately to get the user in the database
        self.users_map[email] = user
        logger.info(f"Created new {role} user: {name}")
        return user

    def import_from_excel(self, file_path):
        logger.info(f"Reading Excel file: {file_path}")
        
        try:
            # Read Excel file
            df = pd.read_excel(file_path, sheet_name="FY26", header=1)
            df.columns = df.columns.str.strip()
            df = df.dropna(subset=['Project Name'])
            
            logger.info(f"Processing {len(df)} rows from Excel")
            
            # Forecast columns mapping
            forecast_columns = {
                'Apr-24 Forecast': (2024, 4), 'May-24 Forecast': (2024, 5), 'Jun-24 Forecast': (2024, 6),
                'Jul-24 Forecast': (2024, 7), 'Aug-24 Forecast': (2024, 8), 'Sep-24 Forecast': (2024, 9),
                'Oct-24 Forecast': (2024, 10), 'Nov-24 Forecast': (2024, 11), 'Dec-24 Forecast': (2024, 12),
                'Jan-25 Forecast': (2025, 1), 'Feb-25 Forecast': (2025, 2), 'Mar-25 Forecast': (2025, 3),
                'Apr-25 Forecast': (2025, 4), 'May-25 Forecast': (2025, 5), 'Jun-25 Forecast': (2025, 6),
                'Jul-25 Forecast': (2025, 7), 'Aug-25 Forecast': (2025, 8), 'Sep-25 Forecast': (2025, 9),
                'Oct-25 Forecast': (2025, 10), 'Nov-25 Forecast': (2025, 11), 'Dec-25 Forecast': (2025, 12),
                'Jan-26 Forecast': (2026, 1), 'Feb-26 Forecast': (2026, 2), 'Mar-26 Forecast': (2026, 3)
            }
            
            projects_created = 0
            forecasts_created = 0
            
            for index, row in df.iterrows():
                try:
                    project_number = self.clean_value(row.get('Project No\n/ OP Number'))
                    project_name = self.clean_value(row.get('Project Name'))
                    
                    if not project_number or not project_name:
                        continue
                    
                    # Check if project already exists
                    existing_project = self.session.query(Project).filter_by(project_number=project_number).first()
                    
                    if existing_project:
                        project = existing_project
                        self.projects_map[project_number] = project
                        logger.info(f"Found existing project: {project_name}")
                    else:
                        pm_name = self.clean_value(row.get('Project Manager'))
                        cluster_head_name = self.clean_value(row.get('Cluster Head'))
                        
                        # Create/get PM user first and commit before creating project
                        pm_user = self.get_or_create_user(pm_name, "PM", cluster_head_name)
                        
                        cluster = self.clusters_map.get(cluster_head_name)
                        
                        project = Project(
                            id=uuid.uuid4(),
                            source_country=self.clean_value(row.get('Source Country')),
                            project_number=project_number,
                            op_ids=self.clean_value(row.get('OP IDs /New Accounts')),
                            project_name=project_name,
                            region="EU",
                            cluster_id=cluster.id if cluster else None,
                            manager_id=pm_user.id if pm_user else None,
                            customer_name=self.clean_value(row.get('Customer Name')),
                            customer_group=self.clean_value(row.get('Customer Group')),
                            vertical=self.clean_value(row.get('Vertical')),
                            project_type=self.clean_value(row.get('Project Type')),
                            project_group=self.clean_value(row.get('Project Group')),
                            execution_country=self.clean_value(row.get('Execution Country')),
                            currency=self.clean_value(row.get('Currency')),
                            remarks=self.clean_value(row.get('Remarks')),
                            status=self.clean_value(row.get('Status'))
                        )
                        
                        self.session.add(project)
                        self.session.flush()  # Flush to get project ID before creating forecasts
                        self.projects_map[project_number] = project
                        projects_created += 1
                        logger.info(f"Created new project: {project_name}")
                    
                    # Get PM user for forecasts (might be different from project creation)
                    pm_name = self.clean_value(row.get('Project Manager'))
                    cluster_head_name = self.clean_value(row.get('Cluster Head'))
                    pm_user = self.get_or_create_user(pm_name, "PM", cluster_head_name)
                    
                    # Create forecasts
                    forecast_type = self.clean_value(row.get('Forecast Type', 'OB'))
                    source_country = self.clean_value(row.get('Source Country'))
                    
                    for col_name, (year, month) in forecast_columns.items():
                        amount_value = None
                        for col in df.columns:
                            if col and col.strip() == col_name.strip():
                                amount_value = row[col]
                                break
                        
                        if amount_value is not None:
                            amount = self.parse_amount(amount_value)
                            
                            if amount != 0:
                                # Check if forecast already exists
                                existing_forecast = self.session.query(Forecast).filter_by(
                                    project_id=project.id,
                                    year=year,
                                    month=month,
                                    forecast_type=forecast_type
                                ).first()
                                
                                if not existing_forecast:
                                    forecast = Forecast(
                                        id=uuid.uuid4(),
                                        project_id=project.id,
                                        forecast_type=forecast_type,
                                        source_country=source_country,
                                        year=year,
                                        month=month,
                                        amount=amount,
                                        created_by=pm_user.id if pm_user else None
                                    )
                                    self.session.add(forecast)
                                    forecasts_created += 1
                    
                    # Commit every 5 rows instead of 10 to avoid transaction issues
                    if (index + 1) % 5 == 0:
                        try:
                            self.session.commit()
                            logger.info(f"Processed {index + 1} rows...")
                        except Exception as commit_error:
                            logger.error(f"Error committing batch at row {index + 1}: {str(commit_error)}")
                            self.session.rollback()
                            raise
                        
                except Exception as e:
                    logger.error(f"Error processing row {index + 2}: {str(e)}")
                    continue
            
            self.session.commit()
            
            logger.info(f"Import completed:")
            logger.info(f"  - Projects created: {projects_created}")
            logger.info(f"  - Forecasts created: {forecasts_created}")
            logger.info(f"  - Users in system: {len(self.users_map)}")
            logger.info(f"  - Clusters in system: {len(self.clusters_map)}")
            
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            raise

    def run_import(self, excel_file_path):
        try:
            logger.info("Starting Excel import process...")
            self.setup_base_data()
            self.import_from_excel(excel_file_path)
            logger.info("Excel import completed successfully!")
            
        except Exception as e:
            logger.error(f"Import failed: {str(e)}")
            self.session.rollback()
            raise
        finally:
            self.session.close()


def main():
    """Main function"""
    # *** UPDATE THESE CONFIGURATIONS ***
    DATABASE_URL="postgresql://postgres:postgres@172.28.77.151:5432/forecast_management_db"
    EXCEL_FILE_PATH = "FY26 Forecast Template_EU_PLM-Jun-25 1.xlsb"
    
    try:
        importer = ExcelImporter(DATABASE_URL)
        importer.run_import(EXCEL_FILE_PATH)
        print("✅ Import completed successfully!")
        
    except Exception as e:
        print(f"❌ Import failed: {str(e)}")
        return False
    
    return True


if __name__ == "__main__":
    print("🚀 Starting Standalone Excel Data Import...")
    print("📝 Make sure to update DATABASE_URL and EXCEL_FILE_PATH in the script")
    print()
    
    success = main()
    
    if success:
        print("\n🎉 All data imported successfully!")
        print("📊 Check your database tables:")
        print("   - clusters")
        print("   - users") 
        print("   - projects")
        print("   - forecast_values")
    else:
        print("\n💥 Import failed. Check the logs above for details.")