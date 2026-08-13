import { extractInstagramUsername, getInstagramUrl, getInstagramDisplayHandle } from '../lib/instagram-utils.ts'

const testCases = [
  'creatorrashiii',
  '@creatorrashiii',
  'https://www.instagram.com/creatorrashiii',
  'https://instagram.com/creatorrashiii/',
  'https://www.instagram.com/creatorrashiii?igsh=MW9nd3Fvcnc1MTJ3dQ%3D%3D',
  'https://www.instagram.com/https://www.instagram.com/creatorrashiii?igsh=MW9nd3Fvcnc1MTJ3dQ%3D%3D',
  'http://instagram.com/creatorrashiii#bio',
  '  @creatorrashiii  ',
  '',
  null,
  undefined
]

console.log('--- Testing extractInstagramUsername ---')
for (const tc of testCases) {
  const extracted = extractInstagramUsername(tc)
  const url = getInstagramUrl(tc)
  const handle = getInstagramDisplayHandle(tc)
  console.log(`INPUT: "${tc}"`)
  console.log(`  -> Extracted: "${extracted}"`)
  console.log(`  -> Full URL:  "${url}"`)
  console.log(`  -> Display:   "${handle}"`)
}
