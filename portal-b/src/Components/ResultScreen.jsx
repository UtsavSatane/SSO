import { useEffect } from "react"
import Header from "./Header"

function ResultScreen({ result, onRestart, onRepeat, soundEnabled, setSoundEnabled, currentUser, onProfileClick }) {
  // Listen for Tab/Shift+Enter shortcuts on result screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Tab") {
        e.preventDefault()
        onRestart()
      } else if (e.shiftKey && e.key === "Enter") {
        e.preventDefault()
        if (onRepeat) onRepeat()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onRestart, onRepeat])

  if (!result) return null

  const { wpm, rawWpm, accuracy, time, consistency, mode, submode, chartData, keyStats } = result

  // Graph sizing configuration (adjusted for widescreen layout)
  const width = 1000
  const height = 280
  const paddingLeft = 32
  const paddingRight = 16
  const paddingTop = 16
  const paddingBottom = 28

  const plotWidth = width - paddingLeft - paddingRight
  const plotHeight = height - paddingTop - paddingBottom

  const secs = chartData.map(d => d.sec)
  const wpms = chartData.map(d => d.wpm)
  const rawWpms = chartData.map(d => d.rawWpm)

  const maxSec = secs.length > 0 ? Math.max(...secs) : 30
  const minSec = 1
  const maxWpm = Math.max(60, ...wpms, ...rawWpms)

  // Scale calculations
  const getX = (sec) => {
    if (maxSec === minSec) return paddingLeft + plotWidth / 2
    return paddingLeft + ((sec - minSec) / (maxSec - minSec)) * plotWidth
  }

  const getY = (val) => {
    return paddingTop + plotHeight - (val / maxWpm) * plotHeight
  }

  // Generate SVG path coordinate strings
  let wpmLinePath = ""
  let wpmAreaPath = ""
  let rawLinePath = ""

  if (chartData.length > 0) {
    // Solid WPM Line
    wpmLinePath = chartData.map((d, idx) => {
      const op = idx === 0 ? "M" : "L"
      return `${op} ${getX(d.sec)} ${getY(d.wpm)}`
    }).join(" ")

    // WPM Area Fill
    const startX = getX(chartData[0].sec)
    const endX = getX(chartData[chartData.length - 1].sec)
    const baseY = paddingTop + plotHeight
    wpmAreaPath = `${wpmLinePath} L ${endX} ${baseY} L ${startX} ${baseY} Z`

    // Dotted Raw WPM Line
    rawLinePath = chartData.map((d, idx) => {
      const op = idx === 0 ? "M" : "L"
      return `${op} ${getX(d.sec)} ${getY(d.rawWpm)}`
    }).join(" ")
  }

  // Horizontal Grid Lines
  const gridSteps = 4
  const gridValues = []
  for (let i = 1; i <= gridSteps; i++) {
    gridValues.push(Math.round((maxWpm / gridSteps) * i))
  }

  // Vertical Timeline Ticks
  const timeTicks = []
  let tickInterval = 5
  if (maxSec > 60) tickInterval = 20
  else if (maxSec > 30) tickInterval = 10

  for (let t = tickInterval; t <= maxSec; t += tickInterval) {
    timeTicks.push(t)
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col justify-between items-center min-h-screen">
      <Header
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        currentUser={currentUser}
        onProfileClick={onProfileClick}
        started={false}
        finished={true}
      />

      {/* Main Results Container */}
      <div className="w-full flex flex-col gap-8 mb-10 select-none font-mono mt-6">
        
        {/* Full-width Graph Section */}
        <div className="w-full flex flex-col">
          <div className="w-full flex items-center justify-between mb-3 text-xs font-mono select-none" style={{ color: "var(--sub-color)" }}>
            <span className="font-semibold uppercase tracking-wider">performance graph</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5" style={{ backgroundColor: "var(--main-color)" }} />
                wpm
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: "var(--sub-color)" }} />
                raw
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--error-color)" }} />
                errors
              </span>
            </div>
          </div>

          {/* SVG Vector Line Chart */}
          <div className="w-full bg-[var(--sub-alt-color)] rounded-2xl p-6 flex justify-center border border-[var(--sub-alt-color)] shadow-sm">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              width="100%" 
              height="100%"
              className="overflow-visible select-none"
            >
              {/* Gradient Shading under WPM path */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--main-color)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--main-color)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Y-Lines & Labels */}
              {gridValues.map((val, idx) => (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={getY(val)}
                    x2={width - paddingRight}
                    y2={getY(val)}
                    stroke="var(--bg-color)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={getY(val) + 3.5}
                    fill="var(--sub-color)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              ))}

              {/* Grid X-Timeline & Labels */}
              {timeTicks.map((sec, idx) => (
                <g key={idx}>
                  <line
                    x1={getX(sec)}
                    y1={paddingTop}
                    x2={getX(sec)}
                    y2={paddingTop + plotHeight}
                    stroke="var(--bg-color)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={getX(sec)}
                    y={paddingTop + plotHeight + 14}
                    fill="var(--sub-color)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                  >
                    {sec}s
                  </text>
                </g>
              ))}

              {/* Plotted Area under Line */}
              {wpmAreaPath && (
                <path
                  d={wpmAreaPath}
                  fill="url(#chartGradient)"
                  stroke="none"
                />
              )}

              {/* Plotted Lines */}
              {rawLinePath && (
                <path
                  d={rawLinePath}
                  fill="none"
                  stroke="var(--sub-color)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
              )}

              {wpmLinePath && (
                <path
                  d={wpmLinePath}
                  fill="none"
                  stroke="var(--main-color)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Error Circle Highlights */}
              {chartData.map((d, idx) => {
                if (d.errors === 0) return null
                return (
                  <circle
                    key={idx}
                    cx={getX(d.sec)}
                    cy={getY(d.wpm)}
                    r="4"
                    fill="var(--error-color)"
                    stroke="var(--bg-color)"
                    strokeWidth="1.5"
                  />
                )
              })}
            </svg>
          </div>
        </div>

        {/* Primary Stats Grid below the graph */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
          {/* WPM Card */}
          <div className="bg-[var(--sub-alt-color)] rounded-2xl p-5 flex flex-col justify-between border border-[var(--sub-alt-color)]">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--sub-color)" }}>wpm</span>
            <span className="text-4xl font-bold mt-2" style={{ color: "var(--main-color)" }}>{wpm}</span>
          </div>

          {/* Accuracy Card */}
          <div className="bg-[var(--sub-alt-color)] rounded-2xl p-5 flex flex-col justify-between border border-[var(--sub-alt-color)]">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--sub-color)" }}>accuracy</span>
            <span className="text-4xl font-bold mt-2" style={{ color: "var(--main-color)" }}>{accuracy}%</span>
          </div>

          {/* Raw WPM Card */}
          <div className="bg-[var(--sub-alt-color)] rounded-2xl p-5 flex flex-col justify-between border border-[var(--sub-alt-color)]">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--sub-color)" }}>raw wpm</span>
            <span className="text-4xl font-bold mt-2" style={{ color: "var(--text-color)" }}>{rawWpm}</span>
          </div>

          {/* Consistency Card */}
          <div className="bg-[var(--sub-alt-color)] rounded-2xl p-5 flex flex-col justify-between border border-[var(--sub-alt-color)]">
            <span className="text-xs uppercase tracking-wider" style={{ color: "var(--sub-color)" }}>consistency</span>
            <span className="text-4xl font-bold mt-2" style={{ color: "var(--text-color)" }}>{consistency}%</span>
          </div>
        </div>

        {/* Secondary Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-sm">
          {/* Test Info Details */}
          <div className="bg-[var(--sub-alt-color)] rounded-2xl p-5 grid grid-cols-2 gap-4 border border-[var(--sub-alt-color)]">
            <div className="flex flex-col justify-center">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
                test type
              </span>
              <span className="capitalize font-bold text-xl mt-1.5" style={{ color: "var(--text-color)" }}>
                {mode} {submode}
              </span>
            </div>
            <div className="flex flex-col justify-center pl-4 border-l border-[var(--sub-color)] border-opacity-15">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
                duration
              </span>
              <span className="font-bold text-xl mt-1.5" style={{ color: "var(--text-color)" }}>
                {time}s
              </span>
            </div>
          </div>

          {/* Key Stats Card */}
          <div className="bg-[var(--sub-alt-color)] rounded-2xl p-5 border border-[var(--sub-alt-color)]">
            <div className="grid grid-cols-4 gap-2 text-center h-full items-center">
              <div className="flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
                  correct
                </span>
                <span className="font-bold text-xl mt-1.5" style={{ color: "var(--main-color)" }}>
                  {keyStats.correct}
                </span>
              </div>
              
              <div className="flex flex-col justify-center border-l border-[var(--sub-color)] border-opacity-15">
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
                  incorrect
                </span>
                <span className="font-bold text-xl mt-1.5" style={{ color: "var(--error-color)" }}>
                  {keyStats.incorrect}
                </span>
              </div>
              
              <div className="flex flex-col justify-center border-l border-[var(--sub-color)] border-opacity-15">
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
                  extra
                </span>
                <span className="font-bold text-xl mt-1.5" style={{ color: "var(--error-extra-color)" }}>
                  {keyStats.extra}
                </span>
              </div>
              
              <div className="flex flex-col justify-center border-l border-[var(--sub-color)] border-opacity-15">
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
                  missed
                </span>
                <span className="font-bold text-xl mt-1.5 opacity-60" style={{ color: "var(--sub-color)" }}>
                  {keyStats.missed}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center items-center">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-semibold transition-all shadow-sm focus:outline-none"
          style={{
            backgroundColor: "var(--main-color)",
            color: "var(--bg-color)"
          }}
          onMouseOver={e => e.currentTarget.style.filter = "brightness(0.9)"}
          onMouseOut={e => e.currentTarget.style.filter = "none"}
        >
          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Next Test
        </button>

        <button
          onClick={onRepeat}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-semibold border transition-all focus:outline-none"
          style={{
            borderColor: "var(--main-color)",
            backgroundColor: "transparent",
            color: "var(--main-color)"
          }}
          onMouseOver={e => {
            e.currentTarget.style.color = "var(--bg-color)"
            e.currentTarget.style.backgroundColor = "var(--main-color)"
          }}
          onMouseOut={e => {
            e.currentTarget.style.color = "var(--main-color)"
            e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Repeat Test (Shift+Enter)
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm font-medium border transition-all focus:outline-none"
          style={{
            borderColor: "var(--sub-alt-color)",
            backgroundColor: "transparent",
            color: "var(--sub-color)"
          }}
          onMouseOver={e => {
            e.currentTarget.style.color = "var(--text-color)"
            e.currentTarget.style.backgroundColor = "var(--sub-alt-color)"
          }}
          onMouseOut={e => {
            e.currentTarget.style.color = "var(--sub-color)"
            e.currentTarget.style.backgroundColor = "transparent"
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
          Restart (Tab)
        </button>
      </div>
    </div>
  )
}

export default ResultScreen