import { useState, useEffect } from "react"

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState("login") // "login" | "register"
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    setUsername("")
    setPassword("")
    setConfirmPassword("")
    setError("")
    setSuccess("")
  }, [isOpen, activeTab])

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

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setError("Username cannot be empty")
      return
    }
    if (cleanUsername.length < 3) {
      setError("Username must be at least 3 characters long")
      return
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters long")
      return
    }

    const storedUsers = JSON.parse(localStorage.getItem("typesprint-users") || "[]")

    if (activeTab === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      // Check if username already exists
      const userExists = storedUsers.some(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      )
      if (userExists) {
        setError("Username is already taken")
        return
      }

      // Create new user
      const newUser = {
        username: cleanUsername,
        password: password, // In a client-only demo, simple text password is standard
        joined: new Date().toISOString(),
        stats: []
      }

      const updatedUsers = [...storedUsers, newUser]
      localStorage.setItem("typesprint-users", JSON.stringify(updatedUsers))

      setSuccess("Account created successfully! Logging you in...")
      setTimeout(() => {
        onLoginSuccess(newUser)
      }, 1000)
    } else {
      // Login
      const user = storedUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername.toLowerCase() &&
          u.password === password
      )

      if (!user) {
        setError("Invalid username or password")
        return
      }

      setSuccess("Logged in successfully!")
      setTimeout(() => {
        onLoginSuccess(user)
      }, 800)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 font-sans shadow-2xl relative transition-all duration-300"
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

        {/* Logo Icon / Title */}
        <div className="flex flex-col items-center mb-6">
          <span className="text-2xl font-bold tracking-tight mb-1 select-none">
            type<span style={{ color: "var(--main-color)" }}>sprint</span>
          </span>
          <span className="text-xs" style={{ color: "var(--sub-color)" }}>
            {activeTab === "login" ? "Welcome back!" : "Join the sprint"}
          </span>
        </div>

        {/* Tabs switcher */}
        <div
          className="flex rounded-lg p-1 mb-6 text-sm font-medium select-none"
          style={{ backgroundColor: "var(--sub-alt-color)" }}
        >
          <button
            onClick={() => setActiveTab("login")}
            className="flex-1 py-1.5 rounded-md text-center transition-colors focus:outline-none cursor-pointer"
            style={{
              backgroundColor: activeTab === "login" ? "var(--bg-color)" : "transparent",
              color: activeTab === "login" ? "var(--main-color)" : "var(--sub-color)"
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className="flex-1 py-1.5 rounded-md text-center transition-colors focus:outline-none cursor-pointer"
            style={{
              backgroundColor: activeTab === "register" ? "var(--bg-color)" : "transparent",
              color: activeTab === "register" ? "var(--main-color)" : "var(--sub-color)"
            }}
          >
            Register
          </button>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div
            className="p-3 mb-4 rounded-xl border text-xs font-mono text-center flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: "rgba(202, 71, 84, 0.1)",
              borderColor: "var(--error-color)",
              color: "var(--error-color)"
            }}
          >
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div
            className="p-3 mb-4 rounded-xl border text-xs font-mono text-center flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: "rgba(21, 255, 0, 0.1)",
              borderColor: "var(--main-color)",
              color: "var(--main-color)"
            }}
          >
            <span>✔️</span> {success}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="block text-[11px] uppercase tracking-wider font-mono font-bold mb-1.5"
              style={{ color: "var(--sub-color)" }}
            >
              Username
            </label>
            <input
              type="text"
              required
              placeholder="e.g. utsav"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm font-mono focus:outline-none border transition-all"
              style={{
                backgroundColor: "var(--sub-alt-color)",
                borderColor: "transparent",
                color: "var(--text-color)"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--main-color)"
                e.target.style.boxShadow = "0 0 6px var(--main-color)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "transparent"
                e.target.style.boxShadow = "none"
              }}
            />
          </div>

          <div>
            <label
              className="block text-[11px] uppercase tracking-wider font-mono font-bold mb-1.5"
              style={{ color: "var(--sub-color)" }}
            >
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm font-mono focus:outline-none border transition-all"
              style={{
                backgroundColor: "var(--sub-alt-color)",
                borderColor: "transparent",
                color: "var(--text-color)"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--main-color)"
                e.target.style.boxShadow = "0 0 6px var(--main-color)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "transparent"
                e.target.style.boxShadow = "none"
              }}
            />
          </div>

          {activeTab === "register" && (
            <div>
              <label
                className="block text-[11px] uppercase tracking-wider font-mono font-bold mb-1.5"
                style={{ color: "var(--sub-color)" }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm font-mono focus:outline-none border transition-all"
                style={{
                  backgroundColor: "var(--sub-alt-color)",
                  borderColor: "transparent",
                  color: "var(--text-color)"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--main-color)"
                  e.target.style.boxShadow = "0 0 6px var(--main-color)"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "transparent"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all mt-2 focus:outline-none cursor-pointer"
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--bg-color)"
            }}
            onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
            onMouseOut={(e) => (e.currentTarget.style.filter = "none")}
          >
            {activeTab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AuthModal
