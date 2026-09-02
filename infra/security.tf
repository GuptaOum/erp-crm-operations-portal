resource "aws_security_group" "alb" {
  count       = local.load_balanced ? 1 : 0
  name        = "${local.name}-alb"
  description = "Public entry point in front of the application"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-alb-sg" }
}

resource "aws_security_group" "web" {
  name        = "${local.name}-web"
  description = "Application instances"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-web-sg" }
}

resource "aws_security_group" "rds" {
  count       = local.managed_database ? 1 : 0
  name        = "${local.name}-rds"
  description = "PostgreSQL reachable only from the application"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-rds-sg" }
}

resource "aws_security_group" "redis" {
  count       = local.load_balanced ? 1 : 0
  name        = "${local.name}-redis"
  description = "Redis reachable only from the application"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-redis-sg" }
}

resource "aws_security_group" "db_proxy" {
  count       = local.load_balanced ? 1 : 0
  name        = "${local.name}-db-proxy"
  description = "Connection pooler in front of PostgreSQL"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.name}-db-proxy-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  count             = local.load_balanced ? 1 : 0
  security_group_id = aws_security_group.alb[0].id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP from CloudFront"
}

resource "aws_vpc_security_group_egress_rule" "alb_all" {
  count             = local.load_balanced ? 1 : 0
  security_group_id = aws_security_group.alb[0].id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_vpc_security_group_ingress_rule" "web_http" {
  count             = local.single_server ? 1 : 0
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "HTTP for the single server stages"
}

resource "aws_vpc_security_group_ingress_rule" "web_https" {
  count             = local.single_server ? 1 : 0
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS for the single server stages"
}

resource "aws_vpc_security_group_ingress_rule" "web_from_alb" {
  count                        = local.load_balanced ? 1 : 0
  security_group_id            = aws_security_group.web.id
  referenced_security_group_id = aws_security_group.alb[0].id
  from_port                    = 4000
  to_port                      = 4000
  ip_protocol                  = "tcp"
  description                  = "API traffic from the load balancer only"
}

resource "aws_vpc_security_group_egress_rule" "web_all" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_web" {
  count                        = local.managed_database ? 1 : 0
  security_group_id            = aws_security_group.rds[0].id
  referenced_security_group_id = aws_security_group.web.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from application instances"
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_proxy" {
  count                        = local.load_balanced ? 1 : 0
  security_group_id            = aws_security_group.rds[0].id
  referenced_security_group_id = aws_security_group.db_proxy[0].id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from the connection pooler"
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_web" {
  count                        = local.load_balanced ? 1 : 0
  security_group_id            = aws_security_group.db_proxy[0].id
  referenced_security_group_id = aws_security_group.web.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Pooler reachable from application instances only"
}

resource "aws_vpc_security_group_egress_rule" "proxy_all" {
  count             = local.load_balanced ? 1 : 0
  security_group_id = aws_security_group.db_proxy[0].id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_vpc_security_group_ingress_rule" "redis_from_web" {
  count                        = local.load_balanced ? 1 : 0
  security_group_id            = aws_security_group.redis[0].id
  referenced_security_group_id = aws_security_group.web.id
  from_port                    = 6379
  to_port                      = 6379
  ip_protocol                  = "tcp"
  description                  = "Redis from application instances only"
}
