output "task_definition_arn" {
  description = "ARN of the task definition"
  value       = aws_ecs_task_definition.ledger_service.arn
}

output "service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.ledger_service.name
}

output "target_group_arn" {
  description = "ARN of the target group"
  value       = aws_lb_target_group.ledger_service.arn
}

output "log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ledger_service.name
}

output "task_execution_role_arn" {
  description = "ARN of the task execution role"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "ARN of the task role"
  value       = aws_iam_role.ecs_task.arn
}
