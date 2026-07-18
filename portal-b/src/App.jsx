import { useState, useEffect } from "react"
import RaceScreen from "./Components/RaceScreen"
import ResultScreen from "./Components/ResultScreen"
import ProfileModal from "./Components/ProfileModal"

function App() {
  const [screen, setScreen] = useState("race")
  const [result, setResult] = useState(null)
  const [repeatWordList, setRepeatWordList] = useState(null)
  const [repeatHistory, setRepeatHistory] = useState(null)
  
  // Test settings state (lifted to prevent resets when changing screens/repeating)
  const [mode, setMode] = useState("time")
  const [submode, setSubmode] = useState(30)

  // Auth States
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  
  // Theme state synced with LocalStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("typesprint-theme") || "carbon"
  })

  // Font state synced with LocalStorage
  const [font, setFont] = useState(() => {
    return localStorage.getItem("typesprint-font") || "jetbrains-mono"
  })
  
  // Sound settings state synced with LocalStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("typesprint-sound")
    return saved === null ? true : saved === "true"
  })

  // Check SSO Session on Mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/session')
        const sessionData = await res.json()
        
        if (sessionData.authenticated) {
          const email = sessionData.user.email
          const name = sessionData.user.name
          const sub = sessionData.user.sub
          
          const users = JSON.parse(localStorage.getItem("typesprint-users") || "[]")
          let userObj = users.find(u => u.email === email)
          if (!userObj) {
            userObj = {
              username: name,
              email: email,
              sub: sub,
              joined: new Date().toISOString(),
              stats: []
            }
            users.push(userObj)
            localStorage.setItem("typesprint-users", JSON.stringify(users))
          } else {
            userObj.username = name
            userObj.sub = sub
          }
          setCurrentUser(userObj)
        } else {
          setCurrentUser(null)
        }
      } catch (err) {
        console.error('Error checking SSO session:', err)
        setCurrentUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  // Apply theme to document.body
  useEffect(() => {
    const classes = Array.from(document.body.classList)
    classes.forEach(c => {
      if (c.startsWith("theme-")) {
        document.body.classList.remove(c)
      }
    })
    document.body.classList.add(`theme-${theme}`)
    localStorage.setItem("typesprint-theme", theme)
  }, [theme])

  // Apply font to document.body
  useEffect(() => {
    const classes = Array.from(document.body.classList)
    classes.forEach(c => {
      if (c.startsWith("font-family-")) {
        document.body.classList.remove(c)
      }
    })
    document.body.classList.add(`font-family-${font}`)
    localStorage.setItem("typesprint-font", font)
  }, [font])

  // Save sound setting
  useEffect(() => {
    localStorage.setItem("typesprint-sound", soundEnabled.toString())
  }, [soundEnabled])

  const saveTestResult = (username, resultData) => {
    const users = JSON.parse(localStorage.getItem("typesprint-users") || "[]")
    const userIdx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase())
    if (userIdx !== -1) {
      const newStat = {
        wpm: resultData.wpm,
        rawWpm: resultData.rawWpm,
        accuracy: resultData.accuracy,
        consistency: resultData.consistency,
        time: resultData.time,
        mode: resultData.mode,
        submode: resultData.submode,
        date: new Date().toISOString()
      }
      
      users[userIdx].stats = users[userIdx].stats || []
      users[userIdx].stats.push(newStat)
      
      localStorage.setItem("typesprint-users", JSON.stringify(users))
      setCurrentUser(users[userIdx])
    }
  }

  const goToResult = (resultData) => {
    setResult(resultData)
    setScreen("result")

    if (currentUser) {
      saveTestResult(currentUser.username, resultData)
    }
  }

  const goToRace = () => {
    setResult(null)
    setRepeatWordList(null)
    setRepeatHistory(null)
    setScreen("race")
  }

  const handleRepeatTest = () => {
    if (result) {
      setRepeatWordList(result.wordList)
      setRepeatHistory(result.keystrokeHistory)
      setMode(result.mode)
      setSubmode(result.submode)
      setScreen("race")
    }
  }

  const handleLogout = () => {
    window.location.href = '/logout'
  }

  const handleProfileClick = () => {
    if (currentUser) {
      const users = JSON.parse(localStorage.getItem("typesprint-users") || "[]")
      const freshUser = users.find(u => u.email === currentUser.email)
      if (freshUser) {
        setCurrentUser(freshUser)
      }
      setIsProfileModalOpen(true)
    }
  }

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 font-sans select-none"
        style={{ backgroundColor: "var(--bg-color)", color: "var(--main-color)" }}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "var(--main-color)" }}></div>
          <span className="text-xl font-bold tracking-widest lowercase">loading typesprint...</span>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 font-sans select-none"
        style={{ backgroundColor: "var(--bg-color)", color: "var(--text-color)" }}
      >
        <div 
          className="w-full max-w-md rounded-2xl border p-8 shadow-xl flex flex-col items-center text-center"
          style={{ 
            borderColor: "var(--sub-alt-color)", 
            backgroundColor: "rgba(0, 0, 0, 0.15)"
          }}
        >
          {/* Lock Icon */}
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl mb-6 animate-bounce"
            style={{
              backgroundColor: "var(--sub-alt-color)",
              border: "2px solid var(--main-color)",
              color: "var(--main-color)"
            }}
          >
            🔒
          </div>
          
          {/* Logo */}
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-2">
            typesprint <span className="text-xs px-2 py-0.5 rounded font-mono tracking-normal uppercase" style={{ backgroundColor: "var(--main-color)", color: "var(--bg-color)" }}>sso</span>
          </h1>
          
          <p className="text-sm mb-8 max-w-sm font-sans" style={{ color: "var(--sub-color)" }}>
            Welcome to Portal B. This application is integrated with the central Secure Single Sign-On (SSO) Provider. Please sign in to access your dashboard.
          </p>
          
          {/* Login Button */}
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full py-4 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer focus:outline-none text-base font-sans"
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--bg-color)",
              boxShadow: "0 4px 14px 0 rgba(0, 0, 0, 0.2)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            Sign in with SSO
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {screen === "race" && (
        <RaceScreen 
          theme={theme}
          setTheme={setTheme}
          font={font}
          setFont={setFont}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          onFinish={goToResult} 
          repeatWordList={repeatWordList}
          repeatHistory={repeatHistory}
          clearRepeat={() => {
            setRepeatWordList(null)
            setRepeatHistory(null)
          }}
          currentUser={currentUser}
          onProfileClick={handleProfileClick}
          mode={mode}
          setMode={setMode}
          submode={submode}
          setSubmode={setSubmode}
        />
      )}
      {screen === "result" && (
        <ResultScreen 
          result={result} 
          onRestart={goToRace}
          onRepeat={handleRepeatTest}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          currentUser={currentUser}
          onProfileClick={handleProfileClick}
        />
      )}

      {/* Profile Dialog Modal */}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        user={currentUser} 
        onLogout={handleLogout}
      />
    </div>
  )
}

export default App