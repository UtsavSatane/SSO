import { useEffect } from "react"

function ProfileModal({ isOpen, onClose, user, onLogout }) {
  // Handle Esc key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !user) return null

  // Ensure stats exists
  const stats = user.stats || []
  const testsCount = stats.length

  // Calculate Metrics
  const avgWpm = testsCount > 0 
    ? Math.round(stats.reduce((acc, curr) => acc + (curr.wpm || 0), 0) / testsCount)
    : 0

  const avgAccuracy = testsCount > 0 
    ? Math.round(stats.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) / testsCount)
    : 0

  const personalBest = testsCount > 0 
    ? Math.max(...stats.map((s) => s.wpm || 0))
    : 0

  const formatDate = (isoString) => {
    if (!isoString) return "N/A"
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatJoinedDate = (isoString) => {
    if (!isoString) return "N/A"
    const d = new Date(isoString)
    return d.toLocaleDateString(undefined, { 
      month: "long", 
      year: "numeric" 
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border p-6 font-sans shadow-2xl relative transition-all duration-300 flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: "var(--bg-color)",
          borderColor: "var(--sub-alt-color)",
          color: "var(--text-color)",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.5)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-xl font-bold cursor-pointer transition-colors focus:outline-none"
          style={{ color: "var(--sub-color)" }}
          onMouseOver={(e) => (e.currentTarget.style.color = "var(--main-color)")}
          onMouseOut={(e) => (e.currentTarget.style.color = "var(--sub-color)")}
        >
          &times;
        </button>

        {/* Profile Header */}
        <div className="flex items-center gap-4 border-b pb-4 mb-5" style={{ borderColor: "var(--sub-alt-color)" }}>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg select-none uppercase"
            style={{
              backgroundColor: "var(--sub-alt-color)",
              border: "2px solid var(--main-color)",
              color: "var(--main-color)"
            }}
          >
            {user.username.slice(0, 2)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold tracking-tight lowercase">{user.username}</h2>
            <p className="text-xs font-mono" style={{ color: "var(--sub-color)" }}>
              {user.email}
            </p>
            {user.sub && (
              <p className="text-[10px] font-mono opacity-85" style={{ color: "var(--sub-color)" }}>
                sub: {user.sub}
              </p>
            )}
          </div>
          <div className="text-right select-none">
            <p className="text-[10px] font-mono" style={{ color: "var(--sub-color)" }}>
              member since
            </p>
            <p className="text-xs font-mono font-semibold" style={{ color: "var(--text-color)" }}>
              {formatJoinedDate(user.joined)}
            </p>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 select-none font-mono">
          <div className="p-3 rounded-xl flex flex-col items-center text-center justify-center" style={{ backgroundColor: "var(--sub-alt-color)" }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
              completed
            </span>
            <span className="text-2xl font-bold mt-1" style={{ color: "var(--main-color)" }}>
              {testsCount}
            </span>
          </div>

          <div className="p-3 rounded-xl flex flex-col items-center text-center justify-center" style={{ backgroundColor: "var(--sub-alt-color)" }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
              avg wpm
            </span>
            <span className="text-2xl font-bold mt-1" style={{ color: "var(--main-color)" }}>
              {avgWpm}
            </span>
          </div>

          <div className="p-3 rounded-xl flex flex-col items-center text-center justify-center" style={{ backgroundColor: "var(--sub-alt-color)" }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
              avg accuracy
            </span>
            <span className="text-2xl font-bold mt-1" style={{ color: "var(--main-color)" }}>
              {avgAccuracy}%
            </span>
          </div>

          <div className="p-3 rounded-xl flex flex-col items-center text-center justify-center" style={{ backgroundColor: "var(--sub-alt-color)" }}>
            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--sub-color)" }}>
              pb wpm
            </span>
            <span className="text-2xl font-bold mt-1" style={{ color: "var(--main-color)" }}>
              {personalBest}
            </span>
          </div>
        </div>

        {/* History Title */}
        <h3 className="text-sm font-semibold tracking-tight uppercase font-mono mb-2" style={{ color: "var(--sub-color)" }}>
          typing history
        </h3>

        {/* Recent Tests Table */}
        <div className="flex-1 overflow-y-auto mb-6 rounded-xl border" style={{ borderColor: "var(--sub-alt-color)" }}>
          {testsCount === 0 ? (
            <div className="p-8 text-center text-xs font-mono select-none" style={{ color: "var(--sub-color)" }}>
              🚀 No tests completed yet. Start typing to build your history!
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead>
                <tr className="sticky top-0 select-none border-b border-opacity-40" style={{ backgroundColor: "var(--sub-alt-color)", borderColor: "var(--sub-color)" }}>
                  <th className="p-2.5 font-bold uppercase" style={{ color: "var(--sub-color)" }}>WPM</th>
                  <th className="p-2.5 font-bold uppercase" style={{ color: "var(--sub-color)" }}>Accuracy</th>
                  <th className="p-2.5 font-bold uppercase" style={{ color: "var(--sub-color)" }}>Consistency</th>
                  <th className="p-2.5 font-bold uppercase" style={{ color: "var(--sub-color)" }}>Mode</th>
                  <th className="p-2.5 font-bold uppercase" style={{ color: "var(--sub-color)" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.slice().reverse().map((test, index) => (
                  <tr
                    key={index}
                    className="hover:bg-[var(--sub-alt-color)] transition-colors border-b last:border-b-0"
                    style={{ borderColor: "var(--sub-alt-color)" }}
                  >
                    <td className="p-2.5 font-semibold" style={{ color: "var(--main-color)" }}>{test.wpm}</td>
                    <td className="p-2.5" style={{ color: "var(--text-color)" }}>{test.accuracy}%</td>
                    <td className="p-2.5 text-opacity-80" style={{ color: "var(--text-color)" }}>{test.consistency}%</td>
                    <td className="p-2.5 lowercase" style={{ color: "var(--sub-color)" }}>
                      {test.mode} {test.submode}
                    </td>
                    <td className="p-2.5" style={{ color: "var(--sub-color)" }}>{formatDate(test.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-auto border-t pt-4" style={{ borderColor: "var(--sub-alt-color)" }}>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl text-xs font-mono font-semibold uppercase hover:bg-opacity-10 cursor-pointer transition-colors border focus:outline-none"
            style={{
              borderColor: "var(--error-color)",
              color: "var(--error-color)",
              backgroundColor: "transparent"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "var(--error-color)"
              e.currentTarget.style.color = "var(--bg-color)"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--error-color)"
            }}
          >
            Sign Out
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono font-semibold uppercase hover:bg-opacity-10 cursor-pointer transition-colors border focus:outline-none"
            style={{
              borderColor: "var(--sub-color)",
              color: "var(--sub-color)",
              backgroundColor: "transparent"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "var(--sub-alt-color)"
              e.currentTarget.style.color = "var(--text-color)"
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--sub-color)"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
