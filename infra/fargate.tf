resource "aws_ecs_cluster" "main" {
  count = local.fargate_app ? 1 : 0

  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = { Name = "${local.name}-cluster" }
}

resource "aws_cloudwatch_log_group" "api" {
  count = local.fargate_app ? 1 : 0

  name              = "/ecs/${local.name}-api"
  retention_in_days = 7

  tags = { Name = "${local.name}-api-logs" }
}

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  count = local.fargate_app ? 1 : 0

  name               = "${local.name}-task-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  count = local.fargate_app ? 1 : 0

  role       = aws_iam_role.task_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "task_execution_parameters" {
  statement {
    sid = "ReadApplicationConfiguration"

    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]

    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/*"]
  }
}

resource "aws_iam_role_policy" "task_execution_parameters" {
  count = local.fargate_app ? 1 : 0

  name   = "${local.name}-task-execution-parameters"
  role   = aws_iam_role.task_execution[0].id
  policy = data.aws_iam_policy_document.task_execution_parameters.json
}

resource "aws_iam_role" "task" {
  count = local.fargate_app ? 1 : 0

  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy" "task_runtime" {
  count = local.fargate_app ? 1 : 0

  name   = "${local.name}-task-runtime"
  role   = aws_iam_role.task[0].id
  policy = data.aws_iam_policy_document.instance_runtime.json
}

resource "aws_iam_role_policy_attachment" "task_exec_command" {
  count = local.fargate_app ? 1 : 0

  role       = aws_iam_role.task[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

locals {
  api_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "4000" },
    { name = "CORS_ORIGIN", value = "*" },
    { name = "AWS_REGION", value = var.region },
    { name = "DASHBOARD_CACHE_SECONDS", value = tostring(var.dashboard_cache_seconds) },
  ]

  api_secrets = local.fargate_app ? concat(
    [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url[0].arn },
      { name = "JWT_SECRET", valueFrom = aws_ssm_parameter.jwt_secret.arn },
      { name = "S3_IMAGE_BUCKET", valueFrom = aws_ssm_parameter.image_bucket.arn },
      { name = "REDIS_URL", valueFrom = aws_ssm_parameter.redis_url[0].arn },
    ],
    var.db_read_replica ? [
      { name = "DATABASE_REPLICA_URL", valueFrom = aws_ssm_parameter.database_replica_url[0].arn },
    ] : []
  ) : []
}

resource "aws_ecs_task_definition" "api" {
  count = local.fargate_app ? 1 : 0

  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.task_execution[0].arn
  task_role_arn            = aws_iam_role.task[0].arn

  container_definitions = jsonencode([
    {
      name        = "api"
      image       = "${aws_ecr_repository.api.repository_url}:latest"
      essential   = true
      environment = local.api_environment
      secrets     = local.api_secrets

      portMappings = [
        {
          containerPort = 4000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api[0].name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  tags = { Name = "${local.name}-api" }
}

resource "aws_ecs_service" "api" {
  count = local.fargate_app ? 1 : 0

  name                   = "${local.name}-api"
  cluster                = aws_ecs_cluster.main[0].id
  task_definition        = aws_ecs_task_definition.api[0].arn
  desired_count          = var.asg_min_size
  launch_type            = "FARGATE"
  enable_execute_command = true

  health_check_grace_period_seconds = 120

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.web.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app[0].arn
    container_name   = "api"
    container_port   = 4000
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.app, aws_route.private_nat]
}

resource "aws_appautoscaling_target" "api" {
  count = local.fargate_app ? 1 : 0

  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main[0].name}/${aws_ecs_service.api[0].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.asg_min_size
  max_capacity       = var.asg_max_size
}

resource "aws_appautoscaling_policy" "api_cpu" {
  count = local.fargate_app ? 1 : 0

  name               = "${local.name}-task-cpu-target"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension

  target_tracking_scaling_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value = 60
  }
}
