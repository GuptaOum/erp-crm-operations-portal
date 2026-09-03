# Screen Recording Script — Operations Portal

Target length: 8–10 minutes. Read the bracketed cues as actions, not narration.

**Before hitting record:**
- Open https://erp-portal-web.onrender.com once and let it finish loading (free tier sleeps after
  ~15 min idle, first hit takes ~50s cold). Do this 2–3 minutes before you record.
- Close other tabs/notifications. 1080p, browser zoom 100%.
- Have these four logins ready: `admin@example.com`, `sales@example.com`, `warehouse@example.com`,
  `accounts@example.com` — all password `Portal@2026`.

---

## 1. Intro (20s)

"This is the ERP and CRM operations portal I built for the case study — a mini distributor system
with role-based auth, customer CRM, products and inventory, and sales challans. It's live on Render
with a Supabase Postgres backend. I'll walk through it by role, since access is enforced per role,
not just hidden in the UI."

## 2. Admin login + dashboard (60s)

- Log in as `admin@example.com`.
- Point out the dashboard is role-scoped — admin sees everything: customer figures, stock, sales.
- "Admin is the only role that can manage staff accounts." Go to **Users**.
- Create a throwaway user, change its role, deactivate it, reactivate it. Mention: an admin can't
  demote or deactivate themselves — that's what keeps at least one admin alive. No public sign-up,
  by design — accounts are admin-issued only.

## 3. Customers / CRM (90s)

- Go to **Customers**. Show the list, search, filter, pagination.
- Open a customer, show notes (free-text follow-up log — "this is a contact-and-follow-up CRM, not
  a deal pipeline — deliberate scope call for a 48-hour brief, not an oversight").
- Try creating a customer with a mobile number already in use → show the 409 conflict. "Mobile is
  unique server-side now, this used to silently create duplicates."
- Go to **Customers → Follow-ups**. Show the overdue/today/upcoming tabs. "This turns the dashboard
  into an actual queue instead of a passive teaser."

## 4. Products & inventory (60s)

- Go to **Products**. Show list, search, add/edit a product.
- Go to **Stock movements**. Record a stock in/out, show the quantity update.
- Mention image upload is S3-backed if you upload a product image live — otherwise just state it.

## 5. Challans + PDF export (60s)

- Create a new challan against a customer, add line items.
- Generate/download the PDF, open it on screen briefly to show it rendered correctly.

## 6. RBAC proof — switch roles (2–3 min, the important part)

Log out, log in as **warehouse@example.com**:
- Dashboard looks different — no customer/sales figures.
- Try to open **Customers** directly (or via URL) → 403. "Warehouse gets no customer data at all,
  enforced server-side, not just hidden nav."
- Open a challan assigned to warehouse → point out `gstNumber` is null on the response, delivery
  address still present.
- Products and stock movements are still accessible.

Log out, log in as **sales@example.com**:
- Customers and follow-ups visible, stock movements are not (403 if you try the URL).

Log out, log in as **accounts@example.com**:
- Customers visible (read/notes), stock movements 403, users page not accessible.

"This is enforced by an `authorize()` check on every route, not just conditional rendering — and the
user is reloaded from the DB on every request, so deactivating someone or changing their role takes
effect on their very next call, not after their token expires."

## 7. Wrap-up (20s)

"That covers auth with four roles, CRM, products and inventory, and challans, plus the bonus items —
Docker, GitHub Actions CI, PDF export, and S3 image upload. Repo and README are linked in the
submission, along with a note on what's deliberately out of scope for a 48-hour brief and what a
fuller version would add next."

---

## If asked live / for Q&A section (optional, cut if tight on time)

- "Why isn't there a sales pipeline?" → CRM here is contact-and-follow-up (LEAD/ACTIVE/INACTIVE +
  notes), not deals/stages/expected value. Named explicitly as a scope decision in the README, not
  an oversight — a fuller version would add typed activities, expected value/close date, and
  credit limit / outstanding balance tracking.
- "Is this tested?" → 218 tests across 8 files, green in GitHub Actions against a real Postgres
  service container. Point at the Actions tab if useful.
- "Why Render/Supabase instead of AWS?" → AWS deployment was a bonus and was built and verified
  (Terraform, ECS/ASG, RDS, CloudFront) but is torn down between demos to control cost; free hosting
  on Render/Supabase is what the brief actually expects and is what's live and stable.
