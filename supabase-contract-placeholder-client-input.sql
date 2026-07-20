-- Allow "Vyplní zákazník" placeholder mapping in the contract editor.
ALTER TYPE public.contract_placeholder_type ADD VALUE IF NOT EXISTS 'client_input';
