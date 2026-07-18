function StatsBar({ wpm, accuracy, time, isCountdown }) {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0")
    const s = (seconds % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  return (
    <div style={{
      display: "flex",
      gap: "32px",
      justifyContent: "center",
      padding: "20px 32px",
      background: "#1a1a24",
      borderRadius: "12px",
      border: "1px solid #2a2a3a",
      marginBottom: "24px",
      fontFamily: "JetBrains Mono, monospace",
      width: "100%"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", fontWeight: "700", color: "#6c63ff" }}>{wpm}</div>
        <div style={{ fontSize: "12px", color: "#6b6b8a", marginTop: "4px" }}>WPM</div>
      </div>
      <div style={{ width: "1px", background: "#2a2a3a" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", fontWeight: "700", color: "#00d4aa" }}>{accuracy}%</div>
        <div style={{ fontSize: "12px", color: "#6b6b8a", marginTop: "4px" }}>ACCURACY</div>
      </div>
      <div style={{ width: "1px", background: "#2a2a3a" }} />
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: "32px",
          fontWeight: "700",
          color: isCountdown && time <= 10 ? "#ff4d6d" : "#f0f0ff"
        }}>
          {formatTime(time)}
        </div>
        <div style={{ fontSize: "12px", color: "#6b6b8a", marginTop: "4px" }}>
          {isCountdown ? "REMAINING" : "TIME"}
        </div>
      </div>
    </div>
  )
}

export default StatsBar