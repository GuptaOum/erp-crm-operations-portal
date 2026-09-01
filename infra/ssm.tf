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

resource "aws_ssm_parameter" "database_url" {
  count = local.managed_database ? 1 : 0
  name  = "/${local.name}/DATABASE_URL"
  type  = "SecureString"
  value = "postgresql://${var.db_username}:${urlencode(var.db_password)}@${aws_db_instance.main[0].endpoint}/${var.db_name}"

  tags = { Name = "${local.name}-database-url" }
}
