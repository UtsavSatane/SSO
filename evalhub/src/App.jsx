import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [session, setSession] = useState({ authenticated: false, user: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes', 'leaderboard', 'history'
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const autoNextTimerRef = useRef(null);
  const answersRef = useRef({});

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState(() => localStorage.getItem('evalhub-theme') || 'dark');

  // Modal State for Unauthenticated User
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedQuizForAuth, setSelectedQuizForAuth] = useState(null);

  useEffect(() => {
    fetchSession();
    fetchQuizzes();
    fetchLeaderboard();
  }, []);

  // Sync theme with document.body
  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('evalhub-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Countdown timer for active quiz
  useEffect(() => {
    if (!activeQuiz || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleQuizSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeQuiz, timeLeft]);

  // Clean up auto-next timer on unmount
  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  const requestFullscreenMode = () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (err) {
      console.log('Fullscreen request ignored:', err);
    }
  };

  const exitFullscreenMode = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.log('Exit fullscreen ignored:', err);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/session');
      const data = await res.json();
      setSession(data);
    } catch (err) {
      console.error('Failed to fetch session:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  const startQuiz = async (quiz) => {
    if (!session.authenticated) {
      setSelectedQuizForAuth(quiz);
      setShowAuthModal(true);
      return;
    }
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    answersRef.current = {};

    try {
      const res = await fetch(`/api/quiz/${quiz.id}/questions`);
      const data = await res.json();
      const freshQuiz = {
        ...quiz,
        questions: data.questions && data.questions.length > 0 ? data.questions : quiz.questions
      };
      requestFullscreenMode();
      setActiveQuiz(freshQuiz);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setAnswers({});
      setQuizResult(null);
      setTimeLeft(quiz.timeLimitSeconds || 240);
    } catch (err) {
      console.error('Failed to fetch dynamic questions:', err);
      requestFullscreenMode();
      setActiveQuiz(quiz);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswered(false);
      setAnswers({});
      setQuizResult(null);
      setTimeLeft(quiz.timeLimitSeconds || 240);
    }
  };

  const cancelQuiz = () => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    exitFullscreenMode();
    setActiveQuiz(null);
  };

  const handleOptionClick = (optIdx) => {
    if (isAnswered || !activeQuiz) return;
    setSelectedOption(optIdx);
    setIsAnswered(true);

    const currentQ = activeQuiz.questions[currentQuestionIndex];
    answersRef.current[currentQ.id] = optIdx;
    setAnswers({ ...answersRef.current });

    // Clear existing timer if any
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
    }

    // Automatically transition to the next question after 2 seconds (2000ms)
    autoNextTimerRef.current = setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (!activeQuiz) return;

    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      handleQuizSubmit();
    }
  };

  const handleQuizSubmit = async () => {
    if (!activeQuiz) return;
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    exitFullscreenMode();

    const submittedAnswers = { ...answersRef.current };

    try {
      const res = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          userAnswers: submittedAnswers,
          submittedQuestions: activeQuiz.questions,
          timeSpent: (activeQuiz.timeLimitSeconds || 240) - timeLeft
        })
      });

      const data = await res.json();
      if (res.ok) {
        setQuizResult(data);
        setActiveQuiz(null);
        fetchSession();
        fetchLeaderboard();
      } else {
        alert(data.error || 'Failed to submit assessment.');
      }
    } catch (err) {
      console.error('Quiz submit error:', err);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const OPTION_BADGES = [
    { label: 'A', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', symbol: '▲' },
    { label: 'B', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', symbol: '◆' },
    { label: 'C', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', symbol: '●' },
    { label: 'D', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', symbol: '■' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-purple-400 font-medium text-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <span>Loading EvalHub SSO Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col selection:bg-purple-600 selection:text-white transition-colors duration-300 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Navbar (hidden during active quiz mode for immersive full-screen experience) */}
      {!activeQuiz && (
        <nav className="glass-nav sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 font-bold text-white text-xl">
                EH
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-500 bg-clip-text text-transparent">
                  EvalHub
                </span>
                <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-500 font-semibold">
                  SSO Client C
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className={`hidden md:flex items-center gap-1 ml-6 p-1 rounded-xl border ${
              theme === 'light' ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900/60 border-slate-800'
            }`}>
              <button
                onClick={() => { setActiveTab('quizzes'); setActiveQuiz(null); setQuizResult(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'quizzes'
                    ? 'bg-purple-600 text-white shadow-md'
                    : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Assessments
              </button>
              <button
                onClick={() => { setActiveTab('leaderboard'); setActiveQuiz(null); setQuizResult(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-purple-600 text-white shadow-md'
                    : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Leaderboard
              </button>
              {session.authenticated && (
                <button
                  onClick={() => { setActiveTab('history'); setActiveQuiz(null); setQuizResult(null); }}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'history'
                      ? 'bg-purple-600 text-white shadow-md'
                      : theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  My Badges
                </button>
              )}
            </div>
          </div>

          {/* SSO App Switcher & Theme Toggle & Profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-yellow-300 hover:border-yellow-500/50'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-purple-500 shadow-sm'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              <span>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
            </button>

            {/* SSO Suite Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setAppSwitcherOpen(!appSwitcherOpen)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'bg-slate-100 border-slate-300 text-slate-800 hover:border-purple-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/40'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                SSO Suite Apps
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {appSwitcherOpen && (
                <div className={`absolute right-0 mt-2 w-64 border rounded-xl shadow-2xl p-2 z-50 ${
                  theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold px-3 py-1.5">
                    Connected Single Sign-On Apps
                  </div>
                  <a
                    href="https://localhost:5000/admin/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all"
                  >
                    <div className="w-7 h-7 rounded bg-purple-500/20 text-purple-500 flex items-center justify-center font-bold text-xs">IDP</div>
                    <div>
                      <div className="font-semibold">Identity Provider</div>
                      <div className="text-xs text-slate-500">Port 5000 (Central Auth)</div>
                    </div>
                  </a>
                  <a
                    href="https://localhost:6030"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all"
                  >
                    <div className="w-7 h-7 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs">ELMS</div>
                    <div>
                      <div className="font-semibold">ELMS Platform</div>
                      <div className="text-xs text-slate-500">Port 6030 (Client A)</div>
                    </div>
                  </a>
                  <a
                    href="https://localhost:5002"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-all"
                  >
                    <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">TS</div>
                    <div>
                      <div className="font-semibold">TypeSprint</div>
                      <div className="text-xs text-slate-500">Port 5002 (Client B)</div>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-200 text-sm font-medium">
                    <div className="w-7 h-7 rounded bg-purple-500 text-white flex items-center justify-center font-bold text-xs">EH</div>
                    <div>
                      <div className="font-semibold">EvalHub (Current)</div>
                      <div className="text-xs text-purple-400">Port 5003 (Client C)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {session.authenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold">{session.user.name || 'SSO User'}</div>
                  <div className="text-xs text-purple-500">{session.user.email}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                  {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
                </div>
                <a
                  href="/logout"
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 text-xs font-semibold transition-all"
                >
                  Logout
                </a>
              </div>
            ) : (
              <a
                href="/login"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login with SSO
              </a>
            )}
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 max-w-6xl w-full mx-auto px-6 ${activeQuiz ? 'py-4 flex flex-col justify-center min-h-screen' : 'py-8'}`}>
        {/* Banner if not logged in */}
        {!session.authenticated && !activeQuiz && (
          <div className={`mb-8 p-6 rounded-2xl glass-card border flex flex-col md:flex-row items-center justify-between gap-4 ${
            theme === 'light'
              ? 'border-purple-300 bg-gradient-to-r from-purple-100 via-white to-indigo-100'
              : 'border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-slate-900 to-indigo-900/20'
          }`}>
            <div>
              <h2 className="text-xl font-bold text-purple-600 dark:text-purple-200">Single Sign-On Authentication Required</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Log in via your central Identity Provider (`https://localhost:5000`) to take skill assessments, earn verified badges, and record your scores.
              </p>
            </div>
            <a
              href="/login"
              className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 transition-all"
            >
              Sign In with SSO
            </a>
          </div>
        )}

        {/* Immersive Fullscreen Quiz Player View */}
        {activeQuiz ? (
          <div className="glass-card rounded-3xl p-8 border border-purple-500/40 relative flex flex-col justify-between min-h-[82vh] shadow-2xl animate-slide-up">
            {/* Top Bar: Title, Progress & Time */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-5 mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs uppercase tracking-wider font-extrabold bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40">
                    {activeQuiz.category}
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">{activeQuiz.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                  {/* Quiz Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 text-yellow-300'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <span>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
                  </button>

                  <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/40 text-purple-600 dark:text-purple-300 font-mono font-extrabold text-lg shadow-lg">
                    ⏱️ {formatTime(timeLeft)}
                  </div>
                  <button
                    onClick={cancelQuiz}
                    className="text-slate-500 hover:text-red-500 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 hover:border-red-500/30 transition-all bg-slate-100 dark:bg-slate-900/60"
                  >
                    Exit Fullscreen ✕
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                <span>Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</span>
                <span className="text-purple-500 font-extrabold">
                  {Math.round(((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100)}% Completed
                </span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800 mb-8 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 transition-all duration-500 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                ></div>
              </div>

              {/* Current Question Title */}
              {(() => {
                const currentQ = activeQuiz.questions[currentQuestionIndex];
                return (
                  <div>
                    <div className={`p-6 md:p-8 rounded-2xl border text-center mb-8 shadow-2xl ${
                      theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/90 border-slate-800 text-white'
                    }`}>
                      <h3 className="text-2xl md:text-3xl font-extrabold leading-relaxed tracking-tight">
                        {currentQ.question}
                      </h3>
                    </div>

                    {/* Animated 4 Square Cards Layout for Options (2x2 Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                      {currentQ.options.map((optionText, optIdx) => {
                        const badgeInfo = OPTION_BADGES[optIdx % 4];
                        const isCorrect = optIdx === currentQ.correctAnswer;
                        const isSelected = selectedOption === optIdx;

                        let cardStyle = theme === 'light'
                          ? 'bg-white border-slate-200 text-slate-900 hover:border-purple-500 hover:bg-purple-50/50 cursor-pointer hover:-translate-y-1 shadow-md'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-purple-500/60 hover:bg-slate-800/90 cursor-pointer hover:-translate-y-1 hover:shadow-purple-500/10';
                        
                        let badgeContent = <span className="font-bold">{badgeInfo.symbol} {badgeInfo.label}</span>;
                        let badgeStyle = badgeInfo.bg;
                        let animationClass = '';

                        if (isAnswered) {
                          if (isCorrect) {
                            // Turn GREEN with elastic pop & glowing pulse
                            cardStyle = 'bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 shadow-2xl shadow-emerald-500/40 scale-[1.02]';
                            badgeContent = <span>✓ CORRECT</span>;
                            badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold';
                            animationClass = 'animate-card-pop animate-correct-pulse';
                          } else if (isSelected) {
                            // Turn RED with subtle shake effect
                            cardStyle = 'bg-red-950/90 border-2 border-red-500 text-red-100 shadow-2xl shadow-red-500/40';
                            badgeContent = <span>✗ INCORRECT</span>;
                            badgeStyle = 'bg-red-500 text-white border-red-400 font-extrabold';
                            animationClass = 'animate-wrong-shake';
                          } else {
                            // Dim non-selected wrong options
                            cardStyle = theme === 'light'
                              ? 'opacity-30 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'opacity-30 bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed';
                          }
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleOptionClick(optIdx)}
                            className={`p-6 rounded-2xl border flex flex-col justify-between min-h-[140px] transition-all duration-300 relative group shadow-xl ${cardStyle} ${animationClass}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className={`px-3.5 py-1 rounded-xl text-xs border font-mono tracking-wider transition-all shadow-md ${badgeStyle}`}>
                                {badgeContent}
                              </span>
                              {isAnswered && isCorrect && (
                                <span className="text-emerald-400 text-2xl font-black animate-bounce">✓</span>
                              )}
                              {isAnswered && isSelected && !isCorrect && (
                                <span className="text-red-400 text-2xl font-black animate-pulse">✗</span>
                              )}
                            </div>
                            <div className="text-lg md:text-xl font-bold leading-snug">
                              {optionText}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Animated Explanation Banner */}
                    {isAnswered && (
                      <div className={`p-5 rounded-2xl border mb-6 animate-slide-up transition-all shadow-xl ${
                        selectedOption === currentQ.correctAnswer
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                          : 'bg-red-950/80 border-red-500/40 text-red-200'
                      }`}>
                        <div className="font-extrabold text-sm flex items-center gap-2 mb-1">
                          {selectedOption === currentQ.correctAnswer ? (
                            <span className="text-emerald-400">🎉 Correct Answer!</span>
                          ) : (
                            <span className="text-red-400">❌ Incorrect Choice</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          💡 <span className="font-bold text-white">Explanation:</span> {currentQ.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Next / Finish Action Bar & Auto-Advance Progress */}
            <div className="mt-6 border-t border-slate-200 dark:border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAnswered ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                    <span className="text-purple-500 dark:text-purple-300 font-bold">⚡ Next question in 2 seconds...</span>
                  </div>
                ) : (
                  <span>Tap one of the 4 option cards above to submit your answer.</span>
                )}
              </div>

              {isAnswered && (
                <button
                  onClick={handleNextQuestion}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-2xl shadow-purple-600/40 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Skip Wait ➔' : 'Finish Now ➔'}</span>
                </button>
              )}
            </div>
          </div>
        ) : quizResult ? (
          /* Quiz Results View */
          <div className="glass-card rounded-3xl p-8 border border-purple-500/30 text-center max-w-2xl mx-auto animate-slide-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-xl mb-4 text-3xl">
              {quizResult.result.passed ? '🎉' : '📚'}
            </div>
            <h2 className="text-3xl font-extrabold">
              {quizResult.result.passed ? 'Assessment Passed!' : 'Assessment Complete'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {quizResult.result.passed
                ? `Congratulations! You earned the "${quizResult.result.badge}" Skill Badge.`
                : 'Keep practicing and retake the quiz to earn your verified badge.'}
            </p>

            <div className="my-6 p-6 rounded-2xl bg-purple-500/5 border border-slate-200 dark:border-slate-800 flex justify-around items-center">
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-500">Score</div>
                <div className="text-4xl font-extrabold text-purple-500 mt-1">{quizResult.result.score}%</div>
              </div>
              <div className="h-10 w-px bg-slate-300 dark:bg-slate-800"></div>
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-500">Correct</div>
                <div className="text-4xl font-extrabold text-emerald-500 mt-1">
                  {quizResult.result.correctCount} / {quizResult.result.totalQuestions}
                </div>
              </div>
            </div>

            {/* Answer Explanations */}
            <div className="text-left space-y-4 mb-8">
              <h4 className="text-sm font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Question Explanations</h4>
              {quizResult.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs bg-slate-100 dark:bg-slate-900">
                  <div className="font-semibold">{idx + 1}. {q.question}</div>
                  <div className="text-purple-600 dark:text-purple-300 mt-1">💡 {q.explanation}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setQuizResult(null)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                Back to Assessments
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
              >
                View Leaderboard
              </button>
            </div>
          </div>
        ) : (
          /* Main Tab Content */
          <>
            {activeTab === 'quizzes' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-3xl font-extrabold">Skill Assessments & Quizzes</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Select an assessment track to test your knowledge and claim SSO-verified badges.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {quizzes.map(quiz => (
                    <div
                      key={quiz.id}
                      className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-500">
                            {quiz.category}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            ⏱️ {Math.round(quiz.timeLimitSeconds / 60)} mins
                          </span>
                        </div>
                        <h3 className="text-xl font-bold group-hover:text-purple-500 transition-colors">
                          {quiz.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                          {quiz.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                        <div className="text-xs text-emerald-500 font-medium">
                          🏆 <span className="font-bold">{quiz.badge}</span>
                        </div>
                        <button
                          onClick={() => startQuiz(quiz)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                        >
                          Start Quiz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-3xl font-extrabold">SSO Leaderboard</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Top score achievements across all authenticated SSO users.
                  </p>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="p-4">Rank</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Badge Earned</th>
                        <th className="p-4 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-sm">
                      {leaderboard.map((item, idx) => (
                        <tr key={idx} className="hover:bg-purple-500/5 transition-colors">
                          <td className="p-4 font-bold text-purple-500">#{idx + 1}</td>
                          <td className="p-4 font-semibold">{item.name}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-500">
                              {item.badge}
                            </span>
                          </td>
                          <td className="p-4 text-right font-extrabold text-emerald-500">{item.score}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'history' && session.authenticated && (
              <div>
                <div className="mb-8">
                  <h1 className="text-3xl font-extrabold">My Assessment Badges</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Your authenticated test results and skill achievements for user <span className="text-purple-500 font-semibold">{session.user.email}</span>.
                  </p>
                </div>

                {session.history && session.history.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {session.history.map((hist, idx) => (
                      <div key={idx} className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-purple-500 font-bold">{hist.badge}</div>
                          <div className="text-base font-bold mt-0.5">{hist.quizTitle}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(hist.completedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-emerald-500">{hist.score}%</div>
                          <div className="text-xs text-slate-400">{hist.passed ? 'PASSED' : 'FAILED'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
                    <p>No assessment history recorded yet. Complete a quiz to earn your first badge!</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Authentication Required Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-card rounded-3xl p-8 max-w-md w-full border border-purple-500/30 text-center relative shadow-2xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm p-2 font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-500 flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
              🔒
            </div>

            <h3 className="text-2xl font-extrabold text-white">Authentication Required</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              To start the <span className="text-purple-300 font-bold">{selectedQuizForAuth?.title}</span> assessment and record your verified skill badge, please sign in or register with your SSO account.
            </p>

            <div className="mt-6 space-y-3">
              <a
                href="/login"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In with SSO
              </a>

              <a
                href="/login"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                Create New Account (Sign Up)
              </a>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="mt-5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel & Return to Browsing
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      {!activeQuiz && (
        <footer className="border-t border-slate-200 dark:border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
          EvalHub Portal — Single Sign-On via OIDC Central IdP (`https://localhost:5000`)
        </footer>
      )}
    </div>
  );
}
