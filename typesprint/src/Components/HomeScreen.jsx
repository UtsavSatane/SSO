import { useState } from "react"

const MODES = [
  { id: "quote", label: "Quote Mode", desc: "Type famous quotes" },
  { id: "words", label: "Word Mode", desc: "Common English words" },
  { id: "code", label: "Code Mode", desc: "Type real code snippets" },
]

function HomeScreen({ onStart }) {
  const [selectedMode, setSelectedMode] = useState("quote")

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "Inter, sans-serif"
    }}>

      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h1 style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "48px",
          fontWeight: "700",
          color: "#f0f0ff",
          letterSpacing: "-1px"
        }}>
          type<span style={{ color: "#6c63ff" }}>racer</span>
        </h1>
        <p style={{ color: "#6b6b8a", marginTop: "8px", fontSize: "16px" }}>
          Race your fingers. Beat your best.
        </p>
      </div>

      {/* Mode Selector */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "40px", flexWrap: "wrap", justifyContent: "center" }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMode(m.id)}
            style={{
              padding: "16px 24px",
              borderRadius: "12px",
              border: `2px solid ${selectedMode === m.id ? "#6c63ff" : "#2a2a3a"}`,
              background: selectedMode === m.id ? "#6c63ff22" : "#1a1a24",
              color: selectedMode === m.id ? "#f0f0ff" : "#6b6b8a",
              cursor: "pointer",
              textAlign: "left",
              minWidth: "160px",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: "4px" }}>{m.label}</div>
            <div style={{ fontSize: "13px", opacity: 0.7 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Start Button */}
      <button
        onClick={() => onStart(selectedMode)}
        style={{
          padding: "16px 48px",
          borderRadius: "12px",
          border: "none",
          background: "#6c63ff",
          color: "#fff",
          fontSize: "18px",
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "1px",
          transition: "opacity 0.2s"
        }}
        onMouseOver={e => e.target.style.opacity = "0.85"}
        onMouseOut={e => e.target.style.opacity = "1"}
      >
        Start Race →
      </button>

    </div>
  )
}

export default HomeScreen