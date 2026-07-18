import { useRef, useCallback } from "react"

function useAudioSynth() {
  const audioCtxRef = useRef(null)

  const playClick = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") {
        ctx.resume()
      }

      const now = ctx.currentTime

      // 1. Noise transient (high-frequency click)
      const bufferSize = ctx.sampleRate * 0.015 // 15ms buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }
      const noiseNode = ctx.createBufferSource()
      noiseNode.buffer = buffer

      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = "highpass"
      noiseFilter.frequency.setValueAtTime(1200 + Math.random() * 600, now)

      const noiseEnvelope = ctx.createGain()
      noiseEnvelope.gain.setValueAtTime(0.06, now)
      noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.012)

      noiseNode.connect(noiseFilter)
      noiseFilter.connect(noiseEnvelope)
      noiseEnvelope.connect(ctx.destination)

      // 2. Sine tone sweep (the lower resonance bottom-out sound)
      const osc = ctx.createOscillator()
      const oscEnvelope = ctx.createGain()

      osc.type = "sine"
      const startFreq = 200 + Math.random() * 50
      osc.frequency.setValueAtTime(startFreq, now)
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.025)

      oscEnvelope.gain.setValueAtTime(0.1, now)
      oscEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.02)

      osc.connect(oscEnvelope)
      oscEnvelope.connect(ctx.destination)

      noiseNode.start(now)
      noiseNode.stop(now + 0.02)
      osc.start(now)
      osc.stop(now + 0.025)

    } catch (e) {
      console.warn("Audio synthesis error:", e)
    }
  }, [])

  return { playClick }
}

export default useAudioSynth
