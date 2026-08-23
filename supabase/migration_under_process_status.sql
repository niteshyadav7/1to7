-- Add 'Under Process' to application_status enum
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'Under Process';
