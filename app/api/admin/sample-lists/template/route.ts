import { NextResponse } from 'next/server'

export const SAMPLE_ROSTER_TEMPLATE_HEADERS = [
  'Creator Name',
  'Instagram Username',
  'Followers',
  'Avg Reels Views',
  'Engagement Rate (%)',
  'City',
  'Category / Niche',
  'Sample Reel URL',
  'Commercial Quoted (INR)',
]

export const SAMPLE_ROSTER_TEMPLATE_ROWS = [
  [
    'Pooja Hegde',
    '@pooja_hegde',
    '500K',
    '120K',
    '3.8%',
    'Mumbai',
    'Fashion & Lifestyle',
    'https://www.instagram.com/reel/C3x9abc123',
    '25000',
  ],
  [
    'Rohan Sharma',
    '@rohan_fitness',
    '85K',
    '45K',
    '4.5%',
    'Delhi',
    'Fitness & Health',
    'https://www.instagram.com/reel/D2k8def456',
    '12000',
  ],
  [
    'Ananya Sen',
    '@ananya_eats',
    '150K',
    '80K',
    '5.2%',
    'Bangalore',
    'Food & Cooking',
    'https://www.instagram.com/reel/E1m7ghi789',
    '18000',
  ],
  [
    'Vikram Joshi',
    '@techwithvikram',
    '320K',
    '95K',
    '3.2%',
    'Pune',
    'Technology & Gadgets',
    'https://www.instagram.com/reel/F4p6jkl012',
    '30000',
  ],
  [
    'Simran Kaur',
    '@simran_glam',
    '95K',
    '50K',
    '4.1%',
    'Chandigarh',
    'Beauty & Makeup',
    'https://www.instagram.com/reel/G5q5mno345',
    '15000',
  ],
]

export function generateSampleRosterCSV(): string {
  const headerLine = SAMPLE_ROSTER_TEMPLATE_HEADERS.join(',')
  const dataLines = SAMPLE_ROSTER_TEMPLATE_ROWS.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  )
  return '\uFEFF' + [headerLine, ...dataLines].join('\n')
}

export async function GET() {
  const csv = generateSampleRosterCSV()

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sample_creator_roster_template.csv"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
