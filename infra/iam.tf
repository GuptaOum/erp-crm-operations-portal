data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name               = "${local.name}-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "instance_ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "instance_ecr" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

data "aws_iam_policy_document" "instance_runtime" {
  statement {
    sid = "ProductImageAccess"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = ["${aws_s3_bucket.product_images.arn}/*"]
  }

  statement {
    sid       = "ProductImageBucketList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.product_images.arn]
  }

  statement {
    sid = "ReadApplicationConfiguration"

    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]

    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/*"]
  }
}

resource "aws_iam_role_policy" "instance_runtime" {
  name   = "${local.name}-instance-runtime"
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.instance_runtime.json
}

resource "aws_iam_instance_profile" "instance" {
  name = "${local.name}-instance"
  role = aws_iam_role.instance.name
}

data "tls_certificate" "github_oidc" {
  count = var.github_repository != "" && var.create_github_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_repository != "" && var.create_github_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    data.tls_certificate.github_oidc[0].certificates[length(data.tls_certificate.github_oidc[0].certificates) - 1].sha1_fingerprint,
  ]
}

locals {
  github_oidc_arn = var.github_repository == "" ? "" : (
    var.create_github_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
  )
}

data "aws_iam_policy_document" "github_assume" {
  count = var.github_repository != "" ? 1 : 0

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = distinct(concat(["repo:${var.github_repository}:*"], var.github_subjects))
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  count              = var.github_repository != "" ? 1 : 0
  name               = "${local.name}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume[0].json
}

data "aws_iam_policy_document" "github_deploy" {
  count = var.github_repository != "" ? 1 : 0

  statement {
    sid       = "AuthenticateToRegistry"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "DiscoverStackResources"

    actions = [
      "ecr:DescribeRepositories",
      "s3:ListAllMyBuckets",
      "cloudfront:ListDistributions",
    ]

    resources = ["*"]
  }

  statement {
    sid = "PushApplicationImage"

    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:BatchGetImage",
      "ecr:DescribeImages",
    ]

    resources = [aws_ecr_repository.api.arn]
  }

  statement {
    sid = "PublishFrontendBuild"

    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]

    resources = [
      "arn:aws:s3:::${local.name}-site-${data.aws_caller_identity.current.account_id}",
      "arn:aws:s3:::${local.name}-site-${data.aws_caller_identity.current.account_id}/*",
    ]
  }

  statement {
    sid       = "InvalidateCdnCache"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["*"]
  }

  statement {
    sid = "RollOutNewInstances"

    actions = [
      "autoscaling:StartInstanceRefresh",
      "autoscaling:DescribeAutoScalingGroups",
      "autoscaling:DescribeInstanceRefreshes",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  count  = var.github_repository != "" ? 1 : 0
  name   = "${local.name}-github-deploy"
  role   = aws_iam_role.github_deploy[0].id
  policy = data.aws_iam_policy_document.github_deploy[0].json
}
