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
  description = "1 single server, 2 adds RDS Multi-AZ, 3 adds NAT, ALB, Auto Scaling and CloudFront"
  type        = number
  default     = 1

  validation {
    condition     = contains([1, 2, 3], var.stage)
    error_message = "stage must be 1, 2 or 3."
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
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_read_replica" {
  description = "Create a read replica at stage 3 and point the application at it for reads. Off by default because it doubles the database bill"
  type        = bool
  default     = false
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
