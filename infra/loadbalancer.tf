resource "aws_lb" "app" {
  count = local.load_balanced ? 1 : 0

  name               = "${local.name}-alb"
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.alb[0].id]

  tags = { Name = "${local.name}-alb" }
}

resource "aws_lb_target_group" "app" {
  count = local.load_balanced ? 1 : 0

  name        = "${local.name}-api"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = local.fargate_app ? "ip" : "instance"

  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  deregistration_delay = 30

  tags = { Name = "${local.name}-api-tg" }
}

resource "aws_lb_listener" "http" {
  count = local.load_balanced ? 1 : 0

  load_balancer_arn = aws_lb.app[0].arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[0].arn
  }
}
