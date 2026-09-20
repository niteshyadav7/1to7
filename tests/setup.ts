// Vitest Global Setup for 1to7 Tests

process.env.JWT_SECRET = 'test-creator-jwt-secret-key-1234567890'
process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-key-0987654321'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key-for-testing'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-for-testing'
