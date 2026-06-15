import { useEffect, useState } from 'react'

export function LoadingScreen() {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const frames = ['', '.', '..', '...']
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % frames.length
      setDots(frames[i])
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #3B2F2F 0%, #5C3A21 50%, #3B2F2F 100%)' }}
    >
      {/* Glow ring */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full border-2 border-amber-500/30 animate-pulse" />
        <div className="absolute inset-2 rounded-full border border-amber-400/20 animate-pulse" style={{ animationDelay: '0.3s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-amber-400/60 animate-ping" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl text-amber-100 tracking-wider mb-3"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        创建你的食堂{dots}
      </h2>

      {/* Subtitle */}
      <p className="text-amber-400/40 text-sm">
        正在准备仿真场景...
      </p>
    </div>
  )
}
