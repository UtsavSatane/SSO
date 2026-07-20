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
    } else {
      window.location.href = '/login'
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
      {currentUser && (
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
          user={currentUser} 
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}

export default App