import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET_KEY || 'default_super_secret_dev_key_1to7'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // 30 days expiration
    .sign(key)
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const payload = await decrypt(token)
    return payload as { userId: string }
  } catch {
    return null
  }
}
