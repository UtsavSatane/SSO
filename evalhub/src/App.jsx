import React, { useState, useEffect } from 'react';

export default function App() {
  const [session, setSession] = useState({ authenticated: false, user: null, history: [] });
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes', 'leaderboard', 'history'
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Modal State for Unauthenticated User
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedQuizForAuth, setSelectedQuizForAuth] = useState(null);

  useEffect(() => {
    fetchSession();
    fetchQuizzes();
    fetchLeaderboard();
  }, []);

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

  const startQuiz = (quiz) => {
    if (!session.authenticated) {
      setSelectedQuizForAuth(quiz);
      setShowAuthModal(true);
      return;
    }
    setActiveQuiz(quiz);
    setAnswers({});
    setQuizResult(null);
    setTimeLeft(quiz.timeLimitSeconds || 180);
  };

  const handleOptionSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleQuizSubmit = async () => {
    if (!activeQuiz) return;

    try {
      const res = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: activeQuiz.id,
          userAnswers: answers,
          timeSpent: (activeQuiz.timeLimitSeconds || 180) - timeLeft
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Navbar */}
      <nav className="glass-nav sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 font-bold text-white text-xl">
              EH
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                EvalHub
              </span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold">
                SSO Client C
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 ml-6 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => { setActiveTab('quizzes'); setActiveQuiz(null); setQuizResult(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'quizzes' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Assessments
            </button>
            <button
              onClick={() => { setActiveTab('leaderboard'); setActiveQuiz(null); setQuizResult(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'leaderboard' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Leaderboard
            </button>
            {session.authenticated && (
              <button
                onClick={() => { setActiveTab('history'); setActiveQuiz(null); setQuizResult(null); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'history' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Badges
              </button>
            )}
          </div>
        </div>

        {/* SSO App Switcher & User Profile / Login */}
        <div className="flex items-center gap-3">
          {/* SSO Suite Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setAppSwitcherOpen(!appSwitcherOpen)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-purple-500/40 text-xs font-semibold text-slate-300 flex items-center gap-2 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SSO Suite Apps
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {appSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold px-3 py-1.5">
                  Connected Single Sign-On Apps
                </div>
                <a
                  href="https://localhost:5000/admin/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all"
                >
                  <div className="w-7 h-7 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">IDP</div>
                  <div>
                    <div className="font-semibold">Identity Provider</div>
                    <div className="text-xs text-slate-500">Port 5000 (Central Auth)</div>
                  </div>
                </a>
                <a
                  href="https://localhost:6030"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all"
                >
                  <div className="w-7 h-7 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">ELMS</div>
                  <div>
                    <div className="font-semibold">ELMS Platform</div>
                    <div className="text-xs text-slate-500">Port 6030 (Client A)</div>
                  </div>
                </a>
                <a
                  href="https://localhost:5002"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-sm font-medium transition-all"
                >
                  <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">TS</div>
                  <div>
                    <div className="font-semibold">TypeSprint</div>
                    <div className="text-xs text-slate-500">Port 5002 (Client B)</div>
                  </div>
                </a>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/30 text-purple-200 text-sm font-medium">
                  <div className="w-7 h-7 rounded bg-purple-500 text-white flex items-center justify-center font-bold text-xs">EH</div>
                  <div>
                    <div className="font-semibold">EvalHub (Current)</div>
                    <div className="text-xs text-purple-300/70">Port 5003 (Client C)</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {session.authenticated ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-100">{session.user.name || 'SSO User'}</div>
                <div className="text-xs text-purple-400">{session.user.email}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
                {(session.user.name || session.user.email || 'U')[0].toUpperCase()}
              </div>
              <a
                href="/logout"
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all"
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Banner if not logged in */}
        {!session.authenticated && (
          <div className="mb-8 p-6 rounded-2xl glass-card border border-purple-500/30 bg-gradient-to-r from-purple-900/20 via-slate-900 to-indigo-900/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-purple-200">Single Sign-On Authentication Required</h2>
              <p className="text-sm text-slate-400 mt-1">
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

        {/* Active Quiz Player Screen */}
        {activeQuiz ? (
          <div className="glass-card rounded-3xl p-8 border border-purple-500/30 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-purple-400">{activeQuiz.category}</span>
                <h2 className="text-2xl font-extrabold text-white mt-1">{activeQuiz.title}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-300 font-mono font-bold text-lg">
                  ⏱️ {formatTime(timeLeft)}
                </div>
                <button
                  onClick={() => setActiveQuiz(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm font-semibold px-3 py-1.5 rounded-lg border border-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-8">
              {activeQuiz.questions.map((q, qIndex) => (
                <div key={q.id} className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80">
                  <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-sm flex items-center justify-center shrink-0">
                      {qIndex + 1}
                    </span>
                    <span>{q.question}</span>
                  </h3>
                  <div className="space-y-3">
                    {q.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        onClick={() => handleOptionSelect(q.id, optIdx)}
                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-all ${
                          answers[q.id] === optIdx
                            ? 'bg-purple-900/40 border-purple-500 text-white shadow-md'
                            : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={answers[q.id] === optIdx}
                          onChange={() => {}}
                          className="accent-purple-500 w-4 h-4"
                        />
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleQuizSubmit}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-purple-600/30 transition-all"
              >
                Submit Assessment
              </button>
            </div>
          </div>
        ) : quizResult ? (
          /* Quiz Results View */
          <div className="glass-card rounded-3xl p-8 border border-purple-500/30 text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-xl mb-4 text-3xl">
              {quizResult.result.passed ? '🎉' : '📚'}
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              {quizResult.result.passed ? 'Assessment Passed!' : 'Assessment Complete'}
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              {quizResult.result.passed
                ? `Congratulations! You earned the "${quizResult.result.badge}" Skill Badge.`
                : 'Keep practicing and retake the quiz to earn your verified badge.'}
            </p>

            <div className="my-6 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex justify-around items-center">
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-500">Score</div>
                <div className="text-4xl font-extrabold text-purple-400 mt-1">{quizResult.result.score}%</div>
              </div>
              <div className="h-10 w-px bg-slate-800"></div>
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-500">Correct</div>
                <div className="text-4xl font-extrabold text-emerald-400 mt-1">
                  {quizResult.result.correctCount} / {quizResult.result.totalQuestions}
                </div>
              </div>
            </div>

            {/* Answer Explanations */}
            <div className="text-left space-y-4 mb-8">
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Question Explanations</h4>
              {quizResult.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  <div className="font-semibold text-slate-200">{idx + 1}. {q.question}</div>
                  <div className="text-purple-300 mt-1">💡 {q.explanation}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setQuizResult(null)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all"
              >
                Back to Assessments
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 transition-all"
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
                  <h1 className="text-3xl font-extrabold text-white">Skill Assessments & Quizzes</h1>
                  <p className="text-slate-400 mt-1 text-sm">
                    Select an assessment track to test your knowledge and claim SSO-verified badges.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {quizzes.map(quiz => (
                    <div
                      key={quiz.id}
                      className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            {quiz.category}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            ⏱️ {Math.round(quiz.timeLimitSeconds / 60)} mins
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                          {quiz.title}
                        </h3>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                          {quiz.description}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="text-xs text-emerald-400 font-medium">
                          🏆 Badge: <span className="font-bold">{quiz.badge}</span>
                        </div>
                        <button
                          onClick={() => startQuiz(quiz)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all"
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
                  <h1 className="text-3xl font-extrabold text-white">SSO Leaderboard</h1>
                  <p className="text-slate-400 mt-1 text-sm">
                    Top score achievements across all authenticated SSO users.
                  </p>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                        <th className="p-4">Rank</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Badge Earned</th>
                        <th className="p-4 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {leaderboard.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-4 font-bold text-purple-400">#{idx + 1}</td>
                          <td className="p-4 font-semibold text-slate-200">{item.name}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300">
                              {item.badge}
                            </span>
                          </td>
                          <td className="p-4 text-right font-extrabold text-emerald-400">{item.score}%</td>
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
                  <h1 className="text-3xl font-extrabold text-white">My Assessment Badges</h1>
                  <p className="text-slate-400 mt-1 text-sm">
                    Your authenticated test results and skill achievements for user <span className="text-purple-400 font-semibold">{session.user.email}</span>.
                  </p>
                </div>

                {session.history && session.history.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {session.history.map((hist, idx) => (
                      <div key={idx} className="glass-card rounded-2xl p-5 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-purple-400 font-bold">{hist.badge}</div>
                          <div className="text-base font-bold text-white mt-0.5">{hist.quizTitle}</div>
                          <div className="text-xs text-slate-500 mt-1">{new Date(hist.completedAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold text-emerald-400">{hist.score}%</div>
                          <div className="text-xs text-slate-400">{hist.passed ? 'PASSED' : 'FAILED'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center text-slate-400">
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
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm p-2 font-bold"
            >
              ✕
            </button>

            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
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
              className="mt-5 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancel & Return to Browsing
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-400">
        EvalHub Portal — Single Sign-On via OIDC Central IdP (`https://localhost:5000`)
      </footer>
    </div>
  );
}
