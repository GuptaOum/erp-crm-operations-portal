output "stage" {
  description = "Architecture stage currently applied"
  value       = var.stage
}

output "vpc_id" {
  description = "VPC identifier"
  value       = aws_vpc.main.id
}

output "instance_id" {
  description = "Instance id of the single server, stages 1 and 2"
  value       = local.single_server ? aws_instance.single_server[0].id : null
}

output "server_public_ip" {
  description = "Elastic IP of the single server, stages 1 and 2"
  value       = local.single_server ? aws_eip.single_server[0].public_ip : null
}

output "portal_host" {
  description = "Hostname to use for Let's Encrypt at stages 1 and 2"
  value       = local.single_server ? "${replace(aws_eip.single_server[0].public_ip, ".", "-")}.nip.io" : null
}

output "database_endpoint" {
  description = "RDS endpoint, stages 2 and 3"
  value       = local.managed_database ? aws_db_instance.main[0].endpoint : null
}

output "load_balancer_dns" {
  description = "Application load balancer hostname, stage 3"
  value       = local.load_balanced ? aws_lb.app[0].dns_name : null
}

output "cloudfront_domain" {
  description = "Public site address, stage 3"
  value       = local.load_balanced ? "https://${aws_cloudfront_distribution.main[0].domain_name}" : null
}

output "cloudfront_distribution_id" {
  description = "Distribution id used for cache invalidation"
  value       = local.load_balanced ? aws_cloudfront_distribution.main[0].id : null
}

output "site_bucket" {
  description = "Bucket holding the built frontend, stage 3"
  value       = local.load_balanced ? aws_s3_bucket.site[0].bucket : null
}

output "product_image_bucket" {
  description = "Bucket holding uploaded product images"
  value       = aws_s3_bucket.product_images.bucket
}

output "ecr_repository_url" {
  description = "Container image repository"
  value       = aws_ecr_repository.api.repository_url
}

output "autoscaling_group_name" {
  description = "Auto Scaling group name, stage 3"
  value       = local.load_balanced ? aws_autoscaling_group.app[0].name : null
}

output "github_deploy_role_arn" {
  description = "Role assumed by GitHub Actions"
  value       = var.github_repository != "" ? aws_iam_role.github_deploy[0].arn : null
}
