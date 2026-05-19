output "evidence_bucket_name" {
  value = aws_s3_bucket.evidence.bucket
}

output "assessment_table_name" {
  value = aws_dynamodb_table.assessments.name
}

