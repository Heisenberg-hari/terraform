import { useEffect, useRef, useState } from 'react'

export function useAmbientAudio({ enabled, mood = 'calm' }) {
  const [supported, setSupported] = useState(true)
  const ctxRef = useRef(null)
  const gainRef = useRef(null)
  const oscARef = useRef(null)
  const oscBRef = useRef(null)

  useEffect(() => {
    return () => {
      try {
        if (oscARef.current) oscARef.current.stop()
        if (oscBRef.current) oscBRef.current.stop()
      } catch {
        // Ignore stop failures during teardown.
      }
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {})
      }
      ctxRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      if (gainRef.current && ctxRef.current) {
        gainRef.current.gain.linearRampToValueAtTime(0.0001, ctxRef.current.currentTime + 0.35)
      }
      return
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      setSupported(false)
      return
    }

    if (!ctxRef.current) {
      const ctx = new AudioContextClass()
      const gain = ctx.createGain()
      gain.gain.value = 0.0001

      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = 420

      const oscA = ctx.createOscillator()
      oscA.type = 'triangle'
      oscA.frequency.value = 78

      const oscB = ctx.createOscillator()
      oscB.type = 'sine'
      oscB.frequency.value = 116

      oscA.connect(gain)
      oscB.connect(gain)
      gain.connect(lowpass)
      lowpass.connect(ctx.destination)

      oscA.start()
      oscB.start()

      ctxRef.current = ctx
      gainRef.current = gain
      oscARef.current = oscA
      oscBRef.current = oscB
    }

    const ctx = ctxRef.current
    const gain = gainRef.current
    const baseVolume = mood === 'pulse' ? 0.02 : 0.012

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    gain.gain.cancelScheduledValues(ctx.currentTime)
    gain.gain.linearRampToValueAtTime(baseVolume, ctx.currentTime + 0.4)

    if (oscARef.current && oscBRef.current) {
      oscARef.current.frequency.setTargetAtTime(mood === 'pulse' ? 96 : 78, ctx.currentTime, 0.35)
      oscBRef.current.frequency.setTargetAtTime(mood === 'pulse' ? 138 : 116, ctx.currentTime, 0.35)
    }
  }, [enabled, mood])

  return { supported }
}
