-- Basic data-integrity constraints for transactions.
-- The app validates sells against FIFO holdings client-side; these checks
-- stop obviously invalid rows (non-positive quantity, negative price,
-- unknown type/asset_class) from any client that bypasses the UI.
-- Run in the Supabase SQL Editor after 001_initial_schema.sql.

alter table public.transactions
  add constraint transactions_quantity_positive check (quantity > 0);

alter table public.transactions
  add constraint transactions_price_non_negative check (price >= 0);

alter table public.transactions
  add constraint transactions_type_valid check (type in ('Buy', 'Sell'));

alter table public.transactions
  add constraint transactions_asset_class_valid check (asset_class in ('Stock', 'Crypto'));
