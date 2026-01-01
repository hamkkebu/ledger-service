# ============================================
# RDS Outputs
# ============================================
output "rds_endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.ledger.endpoint
}

output "rds_address" {
  description = "RDS hostname (without port)"
  value       = aws_db_instance.ledger.address
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.ledger.port
}

output "rds_database_name" {
  description = "Database name"
  value       = aws_db_instance.ledger.db_name
}

output "rds_connection_string" {
  description = "JDBC connection string"
  value       = "jdbc:mysql://${aws_db_instance.ledger.endpoint}/${aws_db_instance.ledger.db_name}?useSSL=true&requireSSL=true"
  sensitive   = true
}

output "db_host" {
  description = "Database host for application configuration"
  value       = aws_db_instance.ledger.address
}

output "db_port" {
  description = "Database port for application configuration"
  value       = tostring(aws_db_instance.ledger.port)
}
