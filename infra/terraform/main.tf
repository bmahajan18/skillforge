terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "eu-central-1" # Frankfurt region for European job market focus
}

# VPC Module
resource "aws_vpc" "skillforge_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "skillforge-vpc"
    Env  = "production"
  }
}

# RDS PostgreSQL Subnet & Instance
resource "aws_db_instance" "postgres" {
  allocated_storage    = 20
  max_allocated_storage = 100
  db_name              = "skillforge_db"
  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t4g.micro"
  username             = "skillforge"
  password             = var.db_password
  skip_final_snapshot  = true
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "SkillForgeProductionPass2026!"
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "skillforge-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# AWS EKS Cluster
resource "aws_eks_cluster" "eks" {
  name     = "skillforge-eks-cluster"
  role_arn = aws_iam_role.eks_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.subnet_a.id, aws_subnet.subnet_b.id]
  }
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
