'use client'

import { useState, useEffect, useCallback } from 'react'

let cachedOtpEnabled: boolean | null = null

export function useOtpConfig() {
  const [isOtpEnabled, setIsOtpEnabled] = useState<boolean>(cachedOtpEnabled ?? true)
  // A cached value is a fallback, not confirmation of the current server setting.
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setIsLoading(true)
    setHasError(false)
    setAttempt(value => value + 1)
  }, [])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    async function fetchConfig() {
      try {
        const res = await fetch('/api/otp-config', { cache: 'no-store', signal: controller.signal })
        if (!res.ok) throw new Error('OTP configuration unavailable')
        const data = await res.json()
        if (typeof data?.downloadOtpEnabled !== 'boolean') {
          throw new Error('Invalid OTP configuration')
        }
        if (isMounted) {
          cachedOtpEnabled = data.downloadOtpEnabled
          setIsOtpEnabled(data.downloadOtpEnabled)
          setHasError(false)
        }
      } catch {
        if (isMounted) setHasError(true)
      } finally {
        clearTimeout(timeout)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchConfig()

    return () => {
      isMounted = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])

  return { isOtpEnabled, isLoading, hasError, retry }
}
