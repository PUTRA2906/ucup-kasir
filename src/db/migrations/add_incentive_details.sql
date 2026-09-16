-- Migration: Add incentive_details column to payrolls table
-- Date: 2026-09-16

-- Add incentive_details column if not exists
ALTER TABLE payrolls ADD COLUMN incentive_details TEXT;

-- Note: This migration is idempotent and safe to run multiple times
