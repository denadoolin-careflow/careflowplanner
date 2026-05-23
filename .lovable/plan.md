## Representative Payee — Wealth Hub

A new **Payee** tab inside Wealth Hub that lets a user act as a Representative Payee for one or more beneficiaries (SSI/SSDI recipients). Personal Wealth data stays untouched; payee data is fully segregated per beneficiary so funds are never co-mingled — matching SSA expectations and supporting annual reporting.

### New tab
- Tab `Payee` (icon: Users) added between **Debts** and **Calendar**.
- Empty state explains what a Representative Payee is and a button to enroll the first beneficiary.
- Uses the existing **Hide amounts** eye toggle (consistency).

### Database (new migration)

```text
payee_beneficiaries
  recipient_id (FK → care_recipients, optional — can also be standalone)
  display_name, relationship, ssa_claim_number (masked), benefit_type (SSI/SSDI/Both)
  monthly_benefit_amount, started_payee_on, notes, is_active

payee_income
  beneficiary_id, date, source (SSI/SSDI/Other), amount, note

payee_expenses
  beneficiary_id, date, amount, category (enum below), subcategory, note,
  payment_method, receipt_url (optional)

payee_conserved_funds
  beneficiary_id, date, amount (+ deposit / − withdrawal), account_label, note,
  running_balance (derived in queries)
```

SSA spending categories:
`housing`, `food`, `clothing`, `medical_dental`, `personal_items`,
`recreation`, `education`, `transportation`, `savings_conserved`, `other`.

RLS: every table user-owned (`auth.uid() = user_id`).

### UI components (under `src/components/wealth-hub/payee/`)
- `PayeeTab.tsx` — beneficiary picker + summary header (this-month income, expenses, conserved balance, "Untracked" gap) and sub-tabs.
- `BeneficiaryForm.tsx` — create/edit beneficiary (SSN-style number is stored masked, only last 4 visible).
- `PayeeIncomeList.tsx` — log SSI/SSDI/Other deposits, monthly auto-summary.
- `PayeeExpensesList.tsx` — quick-add expense with SSA category selector, inline edit, monthly grouping.
- `ConservedFundsCard.tsx` — running balance, deposits/withdrawals, gentle note "Conserved funds belong to the beneficiary."
- `AnnualReportPanel.tsx` — Year picker → renders SSA Form 6230-shaped summary (Income received, Spent on housing/food, Spent on personal/clothing/medical, Saved/Conserved). One-click **Export CSV** and **Print** (uses existing `window.print` styling).

### Visual tone
Same calm gradient cards and pastel accents as the rest of Wealth Hub. Soft amber/sage palette for category chips, never harsh red. Gentle copy ("Funds in trust for…", "Saved for their future").

### Privacy
All `tabular-nums` amounts already blur under the existing `wealth-blur` class — no changes needed.

### Notes
- Beneficiaries can optionally link to existing `care_recipients`, so caregivers already tracking someone can connect the records.
- Payee data is **never** mixed into the main Dashboard widgets or Analytics charts — strictly isolated for compliance.
- This phase ships CRUD + report; recurring SSA deposits & calendar overlay can be layered on later if desired.
