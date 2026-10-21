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

export function initMsg91Widget(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)

  // Already initialized
  if (typeof window.sendOtp === 'function') {
    return Promise.resolve(true)
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  scriptLoadingPromise = new Promise((resolve) => {
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
          setTimeout(() => resolve(true), 150)
        } else {
          resolve(false)
        }
      } catch {
        resolve(false)
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
        resolve(false)
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

export async function sendMsg91Otp(rawMobile: string): Promise<any> {
  await initMsg91Widget()

  if (typeof window.sendOtp !== 'function') {
    throw new Error('OTP service is initializing. Please try again in a moment.')
  }

  const formatted = formatIndianMobile(rawMobile)

  return new Promise((resolve, reject) => {
    window.sendOtp!(
      formatted,
      (data) => {
        resolve(data)
      },
      (error) => {
        const errMsg = typeof error === 'string' ? error : error?.message || 'Failed to send OTP'
        reject(new Error(errMsg))
      }
    )
  })
}

export async function retryMsg91Otp(channel: '11' | '12' | null = null): Promise<any> {
  await initMsg91Widget()

  if (typeof window.retryOtp !== 'function') {
    throw new Error('OTP service is not ready. Please try again.')
  }

  return new Promise((resolve, reject) => {
    window.retryOtp!(
      channel,
      (data) => {
        resolve(data)
      },
      (error) => {
        const errMsg = typeof error === 'string' ? error : error?.message || 'Failed to resend OTP'
        reject(new Error(errMsg))
      }
    )
  })
}

export async function verifyMsg91Otp(otp: string): Promise<any> {
  await initMsg91Widget()

  if (typeof window.verifyOtp !== 'function') {
    throw new Error('OTP service is not ready. Please try again.')
  }

  return new Promise((resolve, reject) => {
    window.verifyOtp!(
      otp.trim(),
      (data) => {
        resolve(data)
      },
      (error) => {
        const errMsg = typeof error === 'string' ? error : error?.message || 'Invalid OTP. Please check and try again.'
        reject(new Error(errMsg))
      }
    )
  })
}
