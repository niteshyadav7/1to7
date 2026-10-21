import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatIndianMobile,
  sendMsg91Otp,
  retryMsg91Otp,
  verifyMsg91Otp,
} from '@/lib/utils/msg91-otp'

describe('MSG91 OTP Utilities and Circuit Breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(global as any).window = {}
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (global as any).window
  })

  describe('formatIndianMobile', () => {
    it('formats 10-digit number by prefixing 91', () => {
      expect(formatIndianMobile('9876543210')).toBe('919876543210')
      expect(formatIndianMobile('+91 98765 43210')).toBe('919876543210')
    })

    it('preserves existing 12-digit number starting with 91', () => {
      expect(formatIndianMobile('919876543210')).toBe('919876543210')
    })

    it('strips dashes and spaces properly', () => {
      expect(formatIndianMobile('9876-543-210')).toBe('919876543210')
    })
  })

  describe('sendMsg91Otp Circuit Breaker', () => {
    it('throws immediate error if window.sendOtp is not defined', async () => {
      delete (global as any).window.sendOtp

      const promise = sendMsg91Otp('9876543210', 1000)
      const assertion = expect(promise).rejects.toThrow(/unavailable or blocked/i)
      await vi.advanceTimersByTimeAsync(4000)
      await assertion
    })

    it('rejects with timeout error when window.sendOtp hangs (CORS/preflight failure)', async () => {
      // Mock window.sendOtp that hangs and never calls callbacks
      ;(global as any).window.sendOtp = vi.fn(() => {
        // Intentionally do nothing (simulate unhandled CORS preflight rejection)
      })

      const sendPromise = sendMsg91Otp('9876543210', 2000)
      const assertion = expect(sendPromise).rejects.toThrow(/timed out/i)
      await vi.advanceTimersByTimeAsync(2100)
      await assertion
    })

    it('resolves cleanly if window.sendOtp succeeds before timeout', async () => {
      ;(global as any).window.sendOtp = vi.fn((_mobile, success) => {
        setTimeout(() => success({ type: 'success', message: 'OTP sent' }), 500)
      })

      const sendPromise = sendMsg91Otp('9876543210', 3000)
      await vi.advanceTimersByTimeAsync(600)

      const result = await sendPromise
      expect(result).toEqual({ type: 'success', message: 'OTP sent' })
    })

    it('rejects if window.sendOtp calls failure callback', async () => {
      ;(global as any).window.sendOtp = vi.fn((_mobile, _success, failure) => {
        setTimeout(() => failure({ message: 'Invalid mobile number' }), 300)
      })

      const sendPromise = sendMsg91Otp('9876543210', 3000)
      const assertion = expect(sendPromise).rejects.toThrow('Invalid mobile number')
      await vi.advanceTimersByTimeAsync(400)
      await assertion
    })
  })

  describe('retryMsg91Otp and verifyMsg91Otp Circuit Breakers', () => {
    it('retryMsg91Otp times out when vendor callback hangs', async () => {
      ;(global as any).window.retryOtp = vi.fn(() => {})

      const retryPromise = retryMsg91Otp('11', 1500)
      const assertion = expect(retryPromise).rejects.toThrow(/timed out/i)
      await vi.advanceTimersByTimeAsync(1600)
      await assertion
    })

    it('verifyMsg91Otp times out when vendor callback hangs', async () => {
      ;(global as any).window.verifyOtp = vi.fn(() => {})

      const verifyPromise = verifyMsg91Otp('123456', 1500)
      const assertion = expect(verifyPromise).rejects.toThrow(/timed out/i)
      await vi.advanceTimersByTimeAsync(1600)
      await assertion
    })
  })
})
