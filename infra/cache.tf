resource "aws_elasticache_subnet_group" "main" {
  count      = local.load_balanced ? 1 : 0
  name       = "${local.name}-cache-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name}-cache-subnets" }
}

resource "aws_elasticache_replication_group" "main" {
  count                = local.load_balanced ? 1 : 0
  replication_group_id = "${local.name}-cache"
  description          = "Shared login rate limit and account lookup cache"

  engine         = "redis"
  engine_version = "7.1"
  node_type      = "cache.t4g.micro"
  port           = 6379

  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true

  subnet_group_name  = aws_elasticache_subnet_group.main[0].name
  security_group_ids = [aws_security_group.redis[0].id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = false

  apply_immediately = true

  tags = { Name = "${local.name}-cache" }
}
