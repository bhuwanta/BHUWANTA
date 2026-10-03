'use client'

import { useState, useEffect } from 'react'

let cachedOtpEnabled: boolean | null = null

export function useOtpConfig() {
  const [isOtpEnabled, setIsOtpEnabled] = useState<boolean>(cachedOtpEnabled ?? true)
  const [isLoading, setIsLoading] = useState<boolean>(cachedOtpEnabled === null)

  useEffect(() => {
    let isMounted = true

    async function fetchConfig() {
      try {
        const res = await fetch('/api/otp-config', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (typeof data?.downloadOtpEnabled === 'boolean') {
            cachedOtpEnabled = data.downloadOtpEnabled
            if (isMounted) {
              setIsOtpEnabled(data.downloadOtpEnabled)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load OTP config:', err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchConfig()

    return () => {
      isMounted = false
    }
  }, [])

  return { isOtpEnabled, isLoading }
}
