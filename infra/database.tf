resource "aws_db_subnet_group" "main" {
  count      = local.managed_database ? 1 : 0
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name}-db-subnets" }
}

resource "aws_db_instance" "replica" {
  count      = local.load_balanced && var.db_read_replica ? 1 : 0
  identifier = "${local.name}-db-replica"

  replicate_source_db = aws_db_instance.main[0].identifier
  instance_class      = var.db_instance_class

  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false

  skip_final_snapshot = true
  apply_immediately   = true

  tags = { Name = "${local.name}-db-replica" }
}

resource "aws_db_instance" "main" {
  count      = local.managed_database ? 1 : 0
  identifier = "${local.name}-db"

  engine                     = "postgres"
  engine_version             = "17"
  auto_minor_version_upgrade = true
  instance_class             = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  tags = { Name = "${local.name}-db" }
}
