# ============================================
# Ledger Service - Infrastructure
# ============================================
# RDS instance for ledger-service
# 공통 인프라(VPC, EKS)는 boilerplate에서 관리

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "hamkkebu-terraform-state"
    key            = "services/ledger-service/terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      Service     = "ledger"
      ManagedBy   = "terraform"
    }
  }
}

# ============================================
# Data Sources - 공통 인프라 참조
# ============================================
data "terraform_remote_state" "shared" {
  backend = "s3"

  config = {
    bucket = "hamkkebu-terraform-state"
    key    = "environments/dev/terraform.tfstate"
    region = "ap-northeast-2"
  }
}

# ============================================
# RDS Security Group
# ============================================
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-ledger-rds-sg"
  description = "Security group for ledger-service RDS"
  vpc_id      = data.terraform_remote_state.shared.outputs.vpc_id

  ingress {
    description     = "MySQL from EKS"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [data.terraform_remote_state.shared.outputs.eks_cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-ledger-rds-sg"
  }
}

# ============================================
# RDS Subnet Group
# ============================================
resource "aws_db_subnet_group" "ledger" {
  name       = "${var.project_name}-${var.environment}-ledger-db-subnet"
  subnet_ids = data.terraform_remote_state.shared.outputs.private_subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-ledger-db-subnet"
  }
}

# ============================================
# RDS Instance
# ============================================
resource "aws_db_instance" "ledger" {
  identifier = "${var.project_name}-${var.environment}-ledger"

  engine               = "mysql"
  engine_version       = var.db_engine_version
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.ledger.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot     = var.environment == "dev" ? true : false
  final_snapshot_identifier = var.environment == "dev" ? null : "${var.project_name}-${var.environment}-ledger-final"

  backup_retention_period = var.db_backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  multi_az               = var.environment == "prod" ? true : false
  publicly_accessible    = false
  storage_encrypted      = true

  parameter_group_name = aws_db_parameter_group.ledger.name

  tags = {
    Name = "${var.project_name}-${var.environment}-ledger-rds"
  }

  lifecycle {
    prevent_destroy = false  # dev 환경에서는 false
  }
}

# ============================================
# RDS Parameter Group
# ============================================
resource "aws_db_parameter_group" "ledger" {
  name   = "${var.project_name}-${var.environment}-ledger-params"
  family = "mysql8.0"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "character_set_client"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-ledger-params"
  }
}
