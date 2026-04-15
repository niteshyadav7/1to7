-- Add 'Payment Requested' to the application_status enum
-- This is needed for the new flow where influencers request payment after admin approval
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'Payment Requested' AFTER 'Approved';
