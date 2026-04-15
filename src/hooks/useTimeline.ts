import { useState, useEffect, useRef, useCallback } from 'react'
import { SCENARIO_DURATION } from '../data/scenario'

// 8 scenario-minutes per real second → full 720-min run in ~90 seconds
const DEFAULT_SPEED = 8

export function useTimeline(speed = DEFAULT_SPEED) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(true)
  const rafRef = useRef<number | undefined>(undefined)
  const lastTsRef = useRef<number | undefined>(undefined)

  const tick = useCallback(
    (ts: number) => {
      if (lastTsRef.current !== undefined) {
        const delta = (ts - lastTsRef.current) / 1000   // real seconds
        setTime(prev => {
          const next = prev + delta * speed
          return next >= SCENARIO_DURATION ? 0 : next
        })
      }
      lastTsRef.current = ts
      rafRef.current = requestAnimationFrame(tick)
    },
    [speed],
  )

  useEffect(() => {
    if (playing) {
      lastTsRef.current = undefined
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, tick])

  const seek = useCallback((t: number) => {
    setTime(Math.max(0, Math.min(SCENARIO_DURATION, t)))
    lastTsRef.current = undefined
  }, [])

  const togglePlay = useCallback(() => {
    lastTsRef.current = undefined
    setPlaying(p => !p)
  }, [])

  const reset = useCallback(() => {
    setTime(0)
    lastTsRef.current = undefined
  }, [])

  return { time, playing, seek, togglePlay, reset }
}
