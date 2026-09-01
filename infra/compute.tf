resource "aws_instance" "single_server" {
  count = local.single_server ? 1 : 0

  ami                    = data.aws_ssm_parameter.amazon_linux.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[1].id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  key_name               = var.key_name != "" ? var.key_name : null

  user_data = templatefile("${path.module}/templates/single-server.sh.tftpl", {
    compose_version = "v5.5.0"
  })

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = { Name = "${local.name}-server" }
}

resource "aws_eip" "single_server" {
  count    = local.single_server ? 1 : 0
  instance = aws_instance.single_server[0].id
  domain   = "vpc"

  tags = { Name = "${local.name}-server-eip" }
}

resource "aws_launch_template" "app" {
  count = local.load_balanced ? 1 : 0

  name_prefix   = "${local.name}-app-"
  image_id      = data.aws_ssm_parameter.amazon_linux.value
  instance_type = var.instance_type
  key_name      = var.key_name != "" ? var.key_name : null

  iam_instance_profile {
    name = aws_iam_instance_profile.instance.name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.web.id]
  }

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size = 20
      volume_type = "gp3"
      encrypted   = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/app-instance.sh.tftpl", {
    region           = var.region
    parameter_prefix = "/${local.name}"
    registry         = split("/", aws_ecr_repository.api.repository_url)[0]
    image            = "${aws_ecr_repository.api.repository_url}:latest"
  }))

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tag_specifications {
    resource_type = "instance"
    tags          = { Name = "${local.name}-app" }
  }
}

resource "aws_autoscaling_group" "app" {
  count = local.load_balanced ? 1 : 0

  name                      = "${local.name}-app"
  min_size                  = var.asg_min_size
  max_size                  = var.asg_max_size
  desired_capacity          = var.asg_min_size
  vpc_zone_identifier       = aws_subnet.private[*].id
  target_group_arns         = [aws_lb_target_group.app[0].arn]
  health_check_type         = "ELB"
  health_check_grace_period = 180

  launch_template {
    id      = aws_launch_template.app[0].id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"

    preferences {
      min_healthy_percentage = 50
    }
  }

  tag {
    key                 = "Name"
    value               = "${local.name}-app"
    propagate_at_launch = true
  }

  depends_on = [aws_route.private_nat]
}

resource "aws_autoscaling_policy" "cpu" {
  count = local.load_balanced ? 1 : 0

  name                   = "${local.name}-cpu-target"
  autoscaling_group_name = aws_autoscaling_group.app[0].name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }

    target_value = 60
  }
}
