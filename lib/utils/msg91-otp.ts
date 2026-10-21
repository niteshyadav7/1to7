 'use client'

declare global {
  interface Window {
    initSendOTP?: (config: any) => void
    sendOtp?: (
      identifier: string,
      success?: (data: any) => void,
      failure?: (error: any) => void
    ) => void
    verifyOtp?: (
      otp: string | number,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string
    ) => void
    retryOtp?: (
      channel: string | null,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      reqId?: string
    ) => void
    getWidgetData?: () => any
    isCaptchaVerified?: () => boolean
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null

export function initMsg91Widget(timeoutMs: number = 4000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)

  // Already initialized
  if (typeof window.sendOtp === 'function') {
    return Promise.resolve(true)
  }

  if (typeof document === 'undefined') return Promise.resolve(false)

  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  scriptLoadingPromise = new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        scriptLoadingPromise = null
        resolve(false)
      }
    }, timeoutMs)

    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '366a6f664b6d303031343336'
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '581511TUmVDywOEL6ad0758aP1'

    const configuration = {
      widgetId,
      tokenAuth,
      exposeMethods: true,
      captchaRenderId: '',
      success: () => {},
      failure: () => {},
    }

    const scriptId = 'msg91-otp-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement | null

    const onScriptLoaded = () => {
      try {
        if (typeof window.initSendOTP === 'function') {
          window.initSendOTP(configuration)
          // Small tick to let methods bind to window
          setTimeout(() => {
            if (!settled) {
              settled = true
              clearTimeout(timer)
              resolve(true)
            }
          }, 150)
        } else {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            scriptLoadingPromise = null
            resolve(false)
          }
        }
      } catch {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          scriptLoadingPromise = null
          resolve(false)
        }
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.type = 'text/javascript'
      script.src = 'https://verify.msg91.com/otp-provider.js'
      script.async = true
      script.onload = onScriptLoaded
      script.onerror = () => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          scriptLoadingPromise = null
          resolve(false)
        }
      }
      document.body.appendChild(script)
    } else {
      onScriptLoaded()
    }
  })

  return scriptLoadingPromise
}

export function formatIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `91${digits}`
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits
  }
  return digits
}

export async function sendMsg91Otp(rawMobile: string, timeoutMs: number = 6000): Promise<any> {
  const isReady =
    typeof window !== 'undefined' && typeof window.sendOtp === 'function'
      ? true
      : await Promise.race([
          initMsg91Widget(),
          new Promise<boolean>((res) => setTimeout(() => res(false), 3500)),
        ])

  if (!isReady || typeof window.sendOtp !== 'function') {
    throw new Error('MSG91 OTP service is unavailable or blocked. Triggering SMS fallback.')
  }

  const formatted = formatIndianMobile(rawMobile)

  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('MSG91 OTP request timed out (CORS/Network error). Falling back to SMS...'))
      }
    }, timeoutMs)

    try {
      window.sendOtp!(
        formatted,
        (data) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(data)
          }
        },
        (error) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            const errMsg = typeof error === 'string' ? error : error?.message || 'Failed to send OTP'
            reject(new Error(errMsg))
          }
        }
      )
    } catch (err: any) {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    }
  })
}

export async function retryMsg91Otp(channel: '11' | '12' | null = null, timeoutMs: number = 6000): Promise<any> {
  const isReady =
    typeof window !== 'undefined' && typeof window.retryOtp === 'function'
      ? true
      : await Promise.race([
          initMsg91Widget(),
          new Promise<boolean>((res) => setTimeout(() => res(false), 3500)),
        ])

  if (!isReady || typeof window.retryOtp !== 'function') {
    throw new Error('MSG91 OTP service is not ready. Falling back to alternative gateway.')
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('MSG91 OTP retry request timed out. Falling back...'))
      }
    }, timeoutMs)

    try {
      window.retryOtp!(
        channel,
        (data) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(data)
          }
        },
        (error) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            const errMsg = typeof error === 'string' ? error : error?.message || 'Failed to resend OTP'
            reject(new Error(errMsg))
          }
        }
      )
    } catch (err: any) {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    }
  })
}

export async function verifyMsg91Otp(otp: string, timeoutMs: number = 6000): Promise<any> {
  const isReady =
    typeof window !== 'undefined' && typeof window.verifyOtp === 'function'
      ? true
      : await Promise.race([
          initMsg91Widget(),
          new Promise<boolean>((res) => setTimeout(() => res(false), 3500)),
        ])

  if (!isReady || typeof window.verifyOtp !== 'function') {
    throw new Error('MSG91 OTP service is not ready. Please try again.')
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('MSG91 OTP verification timed out. Please try again.'))
      }
    }, timeoutMs)

    try {
      window.verifyOtp!(
        otp.trim(),
        (data) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            resolve(data)
          }
        },
        (error) => {
          if (!settled) {
            settled = true
            clearTimeout(timer)
            const errMsg = typeof error === 'string' ? error : error?.message || 'Invalid OTP. Please check and try again.'
            reject(new Error(errMsg))
          }
        }
      )
    } catch (err: any) {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    }
  })
}
