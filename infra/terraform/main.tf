terraform {
  required_version = ">= 1.7.0"

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

resource "aws_s3_bucket" "evidence" {
  bucket = "${var.project_name}-${var.environment}-evidence"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_dynamodb_table" "assessments" {
  name         = "${var.project_name}-${var.environment}-assessments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "assessment_id"

  attribute {
    name = "assessment_id"
    type = "S"
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/${var.project_name}/${var.environment}/api"
  retention_in_days = 30
}

