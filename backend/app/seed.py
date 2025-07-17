from core.database import SessionLocal
from models.users import User
from models.clusters import Cluster
from models.projects import Project
from sqlalchemy.exc import IntegrityError
from passlib.hash import bcrypt
import uuid
from datetime import datetime

def seed():
    db = SessionLocal()
    try:
        # Create Clusters
        cluster1 = Cluster(id=uuid.uuid4(), name="Cluster A", region="APAC")
        cluster2 = Cluster(id=uuid.uuid4(), name="Cluster B", region="NA")
        db.add_all([cluster1, cluster2])
        db.commit()

        # Create Superhead
        sh = User(
            id=uuid.uuid4(),
            name="Ananthanarayanan, Anand",
            email="anand.ananthanarayanan@tatatechnologies.com",
            password_hash=bcrypt.hash("admin123"),
            role="SH",
            cluster_id=None,
            created_by=None
        )
        db.add(sh)
        db.commit()

        # Create Cluster Head
        ch1 = User(
            id=uuid.uuid4(),
            name="Gopal, Varadarajan",
            email="Varadarajan.Gopal@tatatechnologies.com",
            password_hash=bcrypt.hash("ch123"),
            role="CH",
            cluster_id=cluster1.id,
            created_by=sh.id
        )

        ch2 = User(
            id=uuid.uuid4(),
            name="Aditi, Kisti",
            email="Aditi.kisti@tatatechnologies.com",
            password_hash=bcrypt.hash("ch456"),
            role="CH",
            cluster_id=cluster2.id,
            created_by=sh.id
        )
        db.add_all([ch1,ch2])
        db.commit()

        # Create Project Managers
        pm1 = User(
            id=uuid.uuid4(),
            name="Pragya Gupta",
            email="Pragya.G.Gupta@tatatechnologies.com",
            password_hash=bcrypt.hash("pm1123"),
            role="PM",
            cluster_id=cluster1.id,
            created_by=ch1.id
        )
        pm2 = User(
            id=uuid.uuid4(),
            name="B Kavitha",
            email="B.Kavitha@tatatechnologies.com",
            password_hash=bcrypt.hash("pm2123"),
            role="PM",
            cluster_id=cluster1.id,
            created_by=sh.id
        )
        db.add_all([pm1, pm2])
        db.commit()

        pm3 = User(
            id=uuid.uuid4(),
            name="Chakravarty, Sumita",
            email="Sumita.Chakravarty@tatatechnologies.com",
            password_hash=bcrypt.hash("pm3123"),
            role="PM",
            cluster_id=cluster1.id,
            created_by=sh.id
        )
       
        db.add(pm3)
        db.commit()

        # Create Projects
        project1 = Project(
            id=uuid.uuid4(),
            source_country="India",
            project_number="PJT-001",
            op_ids="OP-1001",
            project_name="JLR",
            region="EU",
            cluster_id=cluster1.id,
            manager_id=pm1.id,
            customer_name="JLR",
            customer_group="ARV",
            vertical="T&M",
            project_type="Implementation",
            project_group="Infra",
            execution_country="India",
            currency="INR",
            remarks="High Priority",
            status="Planned"
        )
        project2 = Project(
            id=uuid.uuid4(),
            source_country="India",
            project_number="PJT-002",
            op_ids="OP-1002",
            project_name="JLR",
            region="EU",
            cluster_id=cluster1.id,
            manager_id=pm2.id,
            customer_name="JLR",
            customer_group="ARV",
            vertical="T&M",
            project_type="Implementation",
            project_group="Infra",
            execution_country="India",
            currency="INR",
            remarks="High Priority",
            status="Planned"
        )
        project3 = Project(
            id=uuid.uuid4(),
            source_country="India",
            project_number="PJT-003",
            op_ids="OP-1003",
            project_name="JLR",
            region="NA",
            cluster_id=cluster2.id,
            manager_id=pm3.id,
            customer_name="JLR",
            customer_group="ARV",
            vertical="T&M",
            project_type="Implementation",
            project_group="Infra",
            execution_country="India",
            currency="INR",
            remarks="High Priority",
            status="Planned"
        )
        db.add_all([project1, project2, project3])
        db.commit()

        print("✅ Sample data seeded successfully.")
    
    except IntegrityError as e:
        db.rollback()
        print("❌ Integrity Error:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
