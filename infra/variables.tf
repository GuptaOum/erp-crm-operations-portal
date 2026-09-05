variable "project" {
  description = "Name prefix applied to every resource"
  type        = string
  default     = "erp-portal"
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "stage" {
  description = "1 single server, 2 adds RDS Multi-AZ, 3 adds NAT, ALB, Auto Scaling and CloudFront, 4 runs the same application on ECS Fargate instead of EC2"
  type        = number
  default     = 1

  validation {
    condition     = contains([1, 2, 3, 4], var.stage)
    error_message = "stage must be 1, 2, 3 or 4."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "instance_type" {
  description = "EC2 instance type for the application"
  type        = string
  default     = "t3.small"
}

variable "key_name" {
  description = "Optional EC2 key pair name, shell access uses SSM Session Manager when empty"
  type        = string
  default     = ""
}

variable "db_instance_class" {
  description = "RDS instance class. db.m6g.large is sized for four thousand concurrent users and is deliberately not burstable, because a t class exhausts its CPU credits under sustained load and silently drops to baseline. db.t4g.medium is the measured floor for a thousand staff and db.t3.micro is enough for a demo"
  type        = string
  default     = "db.m6g.large"
}

variable "db_read_replica" {
  description = "Create a read replica at stage 3 and point the application at it for reads. On by default because roughly ninety five percent of this workload is reads, which makes the replica the cheapest way past the database ceiling. Set false to halve the database bill for a short demo"
  type        = bool
  default     = true
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "erp_portal"
}

variable "db_username" {
  description = "Master database username"
  type        = string
  default     = "erp_admin"
}

variable "db_password" {
  description = "Master database password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret used to sign API access tokens"
  type        = string
  sensitive   = true
}

variable "budget_alert_email" {
  description = "Address that receives the monthly spend alert"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the deploy role, in owner/name form"
  type        = string
  default     = ""
}

variable "asg_min_size" {
  description = "Minimum number of application instances at stage 3"
  type        = number
  default     = 2
}

variable "asg_max_size" {
  description = "Maximum number of application instances at stage 3"
  type        = number
  default     = 8
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC provider, set to false if the account already has one"
  type        = bool
  default     = true
}

variable "github_subjects" {
  description = "Extra OIDC subject patterns allowed to assume the deploy role. The plain repo:owner/name:* form is always allowed; add the immutable id form here when the account emits customised subject claims. Those ids change if the repository is deleted and recreated, which is why they are additive rather than a replacement"
  type        = list(string)
  default     = []
}


variable "task_cpu" {
  description = "Fargate task CPU units at stage 4. 1024 is one vCPU, which matches a t3.small closely enough for the two builds to be compared"
  type        = number
  default     = 1024
}

variable "task_memory" {
  description = "Fargate task memory in MiB at stage 4. Fargate only accepts certain pairings, and 2048 is the smallest allowed with 1024 CPU units"
  type        = number
  default     = 2048
}

variable "dashboard_cache_seconds" {
  description = "How long the per role dashboard summary is cached in Redis. Zero everywhere, including stage 4, because the summary carries low stock alerts and due follow ups that are wrong the moment they are stale"
  type        = number
  default     = 0
}
