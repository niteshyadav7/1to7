-- Add new statuses to application_status enum for imported data
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'In Progress';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'Submit Link';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'Under Review';
