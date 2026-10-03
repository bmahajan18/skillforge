# Multi-Cloud Infrastructure Definition: AWS (Primary Compute & DB) + GCP (Secondary Storage & CDN)

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# 1. AWS Provider (Primary Region: Frankfurt, Germany)
provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "eu-central-1"
}

# AWS EKS Kubernetes Cluster
resource "aws_eks_cluster" "primary_eks" {
  name     = "skillforge-aws-eks"
  role_arn = aws_iam_role.eks_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.subnet_a.id, aws_subnet.subnet_b.id]
  }
}

# AWS RDS PostgreSQL Instance
resource "aws_db_instance" "primary_postgres" {
  allocated_storage   = 20
  db_name             = "skillforge_db"
  engine              = "postgres"
  engine_version      = "16.1"
  instance_class      = "db.t4g.micro"
  username            = "skillforge"
  password            = "SkillForgeProductionPass2026!"
  skip_final_snapshot = true
}

# 2. GCP Provider (Secondary Touch: CDN Asset Distribution & Automated Backups)
provider "google" {
  project = var.gcp_project_id
  region  = "europe-west3" # Frankfurt
}

variable "gcp_project_id" {
  default = "skillforge-production-gcp"
}

# GCP Bucket for DB Backups & CDN Asset Caching
resource "google_storage_bucket" "secondary_backup_bucket" {
  name          = "skillforge-db-backups-gcp"
  location      = "EUROPE-WEST3"
  force_destroy = true

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}

resource "aws_vpc" "skillforge_vpc" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "subnet_a" {
  vpc_id            = aws_vpc.skillforge_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
}

resource "aws_subnet" "subnet_b" {
  vpc_id            = aws_vpc.skillforge_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
}

resource "aws_iam_role" "eks_role" {
  name = "skillforge-eks-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}
