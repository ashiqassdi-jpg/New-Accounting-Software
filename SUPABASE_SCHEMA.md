# Supabase Database Schema

Run the following SQL in your Supabase SQL Editor to set up the accounting backend.

```sql
-- Companies Table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  tax_id TEXT,
  bin TEXT,
  fiscal_year_start DATE DEFAULT '2024-01-01',
  currency_symbol TEXT DEFAULT '৳',
  financial_status TEXT DEFAULT 'ACTIVE' CHECK (financial_status IN ('ACTIVE', 'CLOSED', 'AUDITED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Profiles Table (RBAC)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  designation TEXT,
  joining_date DATE,
  role TEXT DEFAULT 'MODERATOR' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')),
  companies UUID[] DEFAULT '{}',
  can_add BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT true,
  can_manage_companies BOOLEAN DEFAULT false,
  can_wipe_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts Table (Chart of Accounts)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  parent_id UUID REFERENCES accounts(id),
  current_balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE accounts 
    SET current_balance = current_balance + (NEW.debit - NEW.credit)
    WHERE id = NEW.account_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE accounts 
    SET current_balance = current_balance - (OLD.debit - OLD.credit)
    WHERE id = OLD.account_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE accounts 
    SET current_balance = current_balance - (OLD.debit - OLD.credit)
    WHERE id = OLD.account_id;
    UPDATE accounts 
    SET current_balance = current_balance + (NEW.debit - NEW.credit)
    WHERE id = NEW.account_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Vouchers Table
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  voucher_no TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PAYMENT', 'RECEIPT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE')),
  payment_channel TEXT CHECK (payment_channel IN ('CASH', 'BANK', 'BKASH', 'NAGAD')),
  narration TEXT,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- Transactions Table (Double Entry)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for demo - in production use more granular relational checks)
-- Companies
CREATE POLICY "Enable all for all users" ON companies FOR ALL USING (true) WITH CHECK (true);

-- Profiles
CREATE POLICY "Enable all for all users" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Accounts
CREATE POLICY "Enable all for all users" ON accounts FOR ALL USING (true) WITH CHECK (true);

-- Vouchers
CREATE POLICY "Enable all for all users" ON vouchers FOR ALL USING (true) WITH CHECK (true);

-- Transactions
CREATE POLICY "Enable all for all users" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- Functions
CREATE OR REPLACE FUNCTION initialize_chart_of_accounts() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO accounts (company_id, name, code, type, current_balance) VALUES
  (NEW.id, 'Cash', '1001', 'ASSET', 0),
  (NEW.id, 'Bank', '1002', 'ASSET', 0),
  (NEW.id, 'bKash', '1003', 'ASSET', 0),
  (NEW.id, 'Nagad', '1004', 'ASSET', 0),
  (NEW.id, 'Accounts Receivable', '1201', 'ASSET', 0),
  (NEW.id, 'Inventory', '1301', 'ASSET', 0),
  (NEW.id, 'Accounts Payable', '2001', 'LIABILITY', 0),
  (NEW.id, 'Loan', '2101', 'LIABILITY', 0),
  (NEW.id, 'Owner Capital', '3001', 'EQUITY', 0),
  (NEW.id, 'Sales Revenue', '4001', 'INCOME', 0),
  (NEW.id, 'Cost of Goods Sold', '5001', 'EXPENSE', 0),
  (NEW.id, 'Marketing Expense', '5002', 'EXPENSE', 0),
  (NEW.id, 'Salaries Expense', '5003', 'EXPENSE', 0),
  (NEW.id, 'Utilities Expense', '5004', 'EXPENSE', 0),
  (NEW.id, 'Rent Expense', '5005', 'EXPENSE', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_coa
AFTER INSERT ON companies
FOR EACH ROW EXECUTE FUNCTION initialize_chart_of_accounts();
```
