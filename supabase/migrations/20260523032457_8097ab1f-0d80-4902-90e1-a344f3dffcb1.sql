
CREATE TABLE public.payee_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid,
  display_name text NOT NULL,
  relationship text,
  benefit_type text NOT NULL DEFAULT 'SSI',
  claim_number_last4 text,
  monthly_benefit_amount numeric NOT NULL DEFAULT 0,
  started_payee_on date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payee_beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payee_beneficiaries all" ON public.payee_beneficiaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_payee_beneficiaries_updated BEFORE UPDATE ON public.payee_beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payee_beneficiaries_user ON public.payee_beneficiaries(user_id, is_active);

CREATE TABLE public.payee_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  beneficiary_id uuid NOT NULL REFERENCES public.payee_beneficiaries(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'SSI',
  amount numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payee_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payee_income all" ON public.payee_income
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_payee_income_updated BEFORE UPDATE ON public.payee_income
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payee_income_ben ON public.payee_income(beneficiary_id, date DESC);

CREATE TABLE public.payee_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  beneficiary_id uuid NOT NULL REFERENCES public.payee_beneficiaries(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  subcategory text,
  note text,
  payment_method text,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payee_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payee_expenses all" ON public.payee_expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_payee_expenses_updated BEFORE UPDATE ON public.payee_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payee_expenses_ben ON public.payee_expenses(beneficiary_id, date DESC);

CREATE TABLE public.payee_conserved_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  beneficiary_id uuid NOT NULL REFERENCES public.payee_beneficiaries(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  account_label text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payee_conserved_funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payee_conserved_funds all" ON public.payee_conserved_funds
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_payee_conserved_updated BEFORE UPDATE ON public.payee_conserved_funds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_payee_conserved_ben ON public.payee_conserved_funds(beneficiary_id, date DESC);
