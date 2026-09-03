resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name}/JWT_SECRET"
  type  = "SecureString"
  value = var.jwt_secret

  tags = { Name = "${local.name}-jwt-secret" }
}

resource "aws_ssm_parameter" "image_bucket" {
  name  = "/${local.name}/S3_IMAGE_BUCKET"
  type  = "String"
  value = aws_s3_bucket.product_images.bucket

  tags = { Name = "${local.name}-image-bucket" }
}

locals {
  database_url_direct = local.managed_database ? "postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.main[0].endpoint}/${var.db_name}" : ""
  database_url_pooled = local.load_balanced ? "postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_proxy.main[0].endpoint}:5432/${var.db_name}?sslmode=require" : ""
}

resource "aws_ssm_parameter" "database_url" {
  count = local.managed_database ? 1 : 0
  name  = "/${local.name}/DATABASE_URL"
  type  = "SecureString"
  value = local.load_balanced ? local.database_url_pooled : local.database_url_direct

  tags = { Name = "${local.name}-database-url" }
}

resource "aws_ssm_parameter" "database_url_direct" {
  count = local.load_balanced ? 1 : 0
  name  = "/${local.name}/DATABASE_URL_DIRECT"
  type  = "SecureString"
  value = local.database_url_direct

  tags = { Name = "${local.name}-database-url-direct" }
}

resource "aws_ssm_parameter" "database_replica_url" {
  count = local.load_balanced && var.db_read_replica ? 1 : 0
  name  = "/${local.name}/DATABASE_REPLICA_URL"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.replica[0].endpoint}/${var.db_name}"

  tags = { Name = "${local.name}-database-replica-url" }
}

resource "aws_ssm_parameter" "redis_url" {
  count = local.load_balanced ? 1 : 0
  name  = "/${local.name}/REDIS_URL"
  type  = "String"
  value = "redis://${aws_elasticache_replication_group.main[0].primary_endpoint_address}:6379"

  tags = { Name = "${local.name}-redis-url" }
}
