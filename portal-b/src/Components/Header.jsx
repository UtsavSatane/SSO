function Header({ soundEnabled, setSoundEnabled, currentUser, onProfileClick, started = false, finished = false }) {
  const getAvatarText = (username) => {
    if (!username) return "👤"
    return username.slice(0, 2).toUpperCase()
  }

  const isHidden = started && !finished

  return (
    <header
      className="w-full flex justify-between items-center mb-6 transition-all duration-300 font-sans select-none"
      style={{
        opacity: isHidden ? 0.15 : 1,
        pointerEvents: isHidden ? "none" : "auto",
        transform: isHidden ? "translateY(-5px)" : "none"
      }}
    >
      {/* Brand logo */}
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight select-none">
          type<span style={{ color: "var(--main-color)" }}>sprint</span>
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono select-none"
          style={{
            color: "var(--sub-color)",
            borderColor: "var(--sub-alt-color)"
          }}
        >
          v2.0
        </span>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-3">
        {/* Audio Click Controller */}
        <button
          onClick={() => setSoundEnabled(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono hover:text-[var(--text-color)] transition-all cursor-pointer border-0 outline-none"
          style={{
            color: "var(--sub-color)",
            backgroundColor: "var(--sub-alt-color)"
          }}
        >
          <span>{soundEnabled ? "🔊 sound on" : "🔇 sound off"}</span>
        </button>

        {/* Profile Button */}
        {currentUser ? (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-mono hover:text-[var(--text-color)] transition-all cursor-pointer border border-opacity-30 outline-none h-[28px]"
            style={{
              color: "var(--text-color)",
              backgroundColor: "var(--sub-alt-color)",
              borderColor: "var(--main-color)"
            }}
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] uppercase select-none"
              style={{
                backgroundColor: "var(--bg-color)",
                border: "1px solid var(--main-color)",
                color: "var(--main-color)"
              }}
            >
              {getAvatarText(currentUser.username)}
            </div>
            <span className="font-semibold lowercase truncate max-w-[80px]">{currentUser.username}</span>
          </button>
        ) : (
          <button
            onClick={onProfileClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono hover:text-[var(--text-color)] transition-all cursor-pointer border-0 outline-none"
            style={{
              color: "var(--sub-color)",
              backgroundColor: "var(--sub-alt-color)"
            }}
          >
            <span>👤 sign in</span>
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
