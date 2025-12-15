-- Migration: Extend diagnostic_logs table to support 'reward' and 'trigger' categories
-- This migration updates the existing diagnostic_logs table to support new categories

-- Drop the old check constraint
ALTER TABLE diagnostic_logs DROP CONSTRAINT IF EXISTS diagnostic_logs_category_check;

-- Add new check constraint with extended categories
ALTER TABLE diagnostic_logs ADD CONSTRAINT diagnostic_logs_category_check 
  CHECK (category IN ('altar', 'admin', 'reward', 'trigger'));

-- Note: This migration is safe to run multiple times (idempotent)
-- The constraint will be updated if it already exists
