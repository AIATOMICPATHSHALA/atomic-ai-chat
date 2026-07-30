"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizConfigEntry, QuizAnswer, QuizQuestion, QuizSubject } from "@/lib/quiz";

type QuizStage = "intro" | "loading" | "active" | "summary" | "review";
type QuizLanguage = "english" | "hindi" | "hinglish";

interface SubjectTally {
  subject: string;
  correct: number;
  wrong: number;
  unattempted: number;
}

interface QuizModeProps {
  onClose: () => void;
}

const SUBJECT_OPTIONS: { value: QuizSubject; label: string }[] = [
  { value: "Biology", label: "Biology Quiz (20 Q)" },
  { value: "Physics", label: "Physics Quiz (10 Q)" },
  { value: "Chemistry", label: "Chemistry Quiz (10 Q)" },
  { value: "Full NEET", label: "Full NEET Quiz (40 Q)" },
];

const LANGUAGE_OPTIONS: { value: QuizLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "hinglish", label: "Hinglish" },
];

const TOPIC_SUBJECT_OPTIONS: { value: Exclude<QuizSubject, "Full NEET">; label: string }[] = [
  { value: "Biology", label: "Biology" },
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuizMode({ onClose }: QuizModeProps) {
  const [stage, setStage] = useState<QuizStage>("intro");
  const [subject, setSubject] = useState<QuizSubject>("Biology");
  const [quizLanguage, setQuizLanguage] = useState<QuizLanguage>("english");

  const [topicSubject, setTopicSubject] =
    useState<Exclude<QuizSubject, "Full NEET">>("Biology");
  const [topicText, setTopicText] = useState("");
  const [topicLanguage, setTopicLanguage] = useState<QuizLanguage>("english");
  const [topicQuestionCount, setTopicQuestionCount] = useState(10);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [entries, setEntries] = useState<QuizConfigEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [totalRemaining, setTotalRemaining] = useState(0);
  const questionStartRef = useRef<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [testName, setTestName] = useState("");
  const resultSubmittedRef = useRef(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === questions.length - 1;

  const runQuizRequest = useCallback(
    async (body: Record<string, unknown>) => {
      setStage("loading");
      setError(null);
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as {
          questions?: QuizQuestion[];
          entries?: QuizConfigEntry[];
          error?: string;
        };

        if (!response.ok || !data.questions || !data.entries) {
          setError(data.error ?? "Could not generate the quiz. Please try again.");
          setStage("intro");
          return;
        }

        setQuestions(data.questions);
        setEntries(data.entries);
        setAnswers([]);
        setCurrentIndex(0);
        setSelectedOption(null);
        const totalSeconds = data.entries.reduce(
          (sum, entry) => sum + entry.questionCount * entry.timerSeconds,
          0
        );
        setTotalRemaining(totalSeconds);
        questionStartRef.current = Date.now();
        setStage("active");
      } catch {
        setError("Network error. Please try again.");
        setStage("intro");
      }
    },
    []
  );

  const startSubjectQuiz = useCallback(() => {
    resultSubmittedRef.current = false;
    setTestName(subject);
    void runQuizRequest({ subject, language: quizLanguage });
  }, [quizLanguage, runQuizRequest, subject]);

  const startTopicQuiz = useCallback(() => {
    if (!topicText.trim()) {
      setError("Please type a topic or chapter name.");
      return;
    }
    resultSubmittedRef.current = false;
    setTestName(`${topicSubject} - ${topicText.trim()}`);
    void runQuizRequest({
      subject: topicSubject,
      language: topicLanguage,
      topic: topicText.trim(),
      questionCount: topicQuestionCount,
    });
  }, [runQuizRequest, topicLanguage, topicQuestionCount, topicSubject, topicText]);

  const saveAttempt = useCallback(
    async (finalAnswers: QuizAnswer[]) => {
      const correct = finalAnswers.filter((a) => a.correct).length;
      const wrong = finalAnswers.filter((a) => a.selectedIndex !== null && !a.correct).length;
      const unattempted = finalAnswers.filter((a) => a.selectedIndex === null).length;
      const score = correct * 4 - wrong * 1;
      const attempted = correct + wrong;
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
      const timeTakenSec = finalAnswers.reduce((sum, a) => sum + a.timeTakenSeconds, 0);

      const subjectSet = new Set(questions.map((q) => q.subject));
      const subjectLabel = subjectSet.size === 1 ? Array.from(subjectSet)[0] : "Full NEET";

      // Per-topic breakdown so the dashboard can find weak/strong topics.
      const topicMap = new Map<string, { topic: string; subject: string; correct: number; wrong: number; unattempted: number }>();

      finalAnswers.forEach((answer, index) => {
        const question = questions[index];
        if (!question) return;
        const topicKey = question.topic?.trim() || question.subject;

        const entry =
          topicMap.get(topicKey) ??
          { topic: topicKey, subject: question.subject, correct: 0, wrong: 0, unattempted: 0 };

        if (answer.selectedIndex === null) entry.unattempted += 1;
        else if (answer.correct) entry.correct += 1;
        else entry.wrong += 1;

        topicMap.set(topicKey, entry);
      });

      try {
        await fetch("/api/quiz/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subjectLabel,
            topic: topicText.trim() || undefined,
            totalQuestions: finalAnswers.length,
            correct,
            wrong,
            unattempted,
            score,
            accuracy,
            timeTakenSec,
            breakdown: { topics: Array.from(topicMap.values()) },
          }),
        });
      } catch {
        // Dashboard stats can catch up next time; don't block the summary screen.
      }
    },
    [questions, topicText]
  );

  const goToNext = useCallback(
    (answer: QuizAnswer) => {
      setAnswers((current) => [...current, answer]);

      if (isLastQuestion) {
        setStage("summary");
        return;
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
      questionStartRef.current = Date.now();
    },
    [currentIndex, isLastQuestion]
  );
  const submitAnswer = useCallback(
    (optionIndex: number | null) => {
      if (!currentQuestion || selectedOption !== null) return;

      setSelectedOption(optionIndex);
      const timeTaken = Math.round((Date.now() - questionStartRef.current) / 1000);

      window.setTimeout(() => {
        goToNext({
          questionId: currentQuestion.id,
          selectedIndex: optionIndex,
          correct: optionIndex === currentQuestion.correctIndex,
          timeTakenSeconds: Math.max(0, timeTaken),
        });
      }, 900);
    },
    [currentQuestion, goToNext, selectedOption]
  );

  const finishQuizDueToTimeout = useCallback(() => {
    setAnswers((current) => {
      const remainingAnswers: QuizAnswer[] = [];
      for (let i = current.length; i < questions.length; i++) {
        remainingAnswers.push({
          questionId: questions[i].id,
          selectedIndex: null,
          correct: false,
          timeTakenSeconds: 0,
        });
      }
      return [...current, ...remainingAnswers];
    });
    setStage("summary");
  }, [questions]);

  useEffect(() => {
    if (stage !== "active") return;

    if (totalRemaining <= 0) {
      finishQuizDueToTimeout();
      return;
    }

    const timer = window.setTimeout(() => setTotalRemaining((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [totalRemaining, stage, finishQuizDueToTimeout]);

  const score = useMemo(() => {
    const correct = answers.filter((a) => a.correct).length;
    const wrong = answers.filter((a) => a.selectedIndex !== null && !a.correct).length;
    const unattempted = answers.filter((a) => a.selectedIndex === null).length;
    const marks = correct * 4 - wrong * 1;
    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    return { correct, wrong, unattempted, marks, accuracy, total: answers.length };
  }, [answers]);

  const performanceLabel = useMemo(() => {
    if (score.accuracy >= 85) return "Excellent";
    if (score.accuracy >= 65) return "Good";
    if (score.accuracy >= 40) return "Average";
    return "Needs Improvement";
  }, [score.accuracy]);

const subjectResults = useMemo(() => {
    const map = new Map<string, SubjectTally>();

    answers.forEach((answer, index) => {
      const question = questions[index];
      if (!question) return;

      const entry = map.get(question.subject) ?? {
        subject: question.subject,
        correct: 0,
        wrong: 0,
        unattempted: 0,
      };

      if (answer.selectedIndex === null) entry.unattempted += 1;
      else if (answer.correct) entry.correct += 1;
      else entry.wrong += 1;

      map.set(question.subject, entry);
    });

    return Array.from(map.values()).map((entry) => ({
      ...entry,
      score: entry.correct * 4 - entry.wrong * 1,
      maxScore: (entry.correct + entry.wrong + entry.unattempted) * 4,
    }));
  }, [answers, questions]);

  useEffect(() => {
    if (stage !== "summary" || resultSubmittedRef.current || subjectResults.length === 0) return;
    resultSubmittedRef.current = true;

    void fetch("/api/quiz-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testName: testName || "Quiz", results: subjectResults }),
    }).catch(() => {
      // Result saving is best-effort; it must not block showing the summary screen.
    });
  }, [stage, subjectResults, testName]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-atomic-navy">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit quiz
        </button>
        <p className="text-sm font-semibold text-atomic-orange">NEET Quiz</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {stage === "intro" && (
          <div className="mx-auto w-full max-w-md">
            <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">NEET Quiz</h1>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              Choose a subject to begin your timed practice test.
            </p>

            <div className="mb-4 space-y-2">
              {SUBJECT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSubject(option.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    subject === option.value
                      ? "border-atomic-orange bg-orange-50 text-atomic-orange dark:bg-orange-950/20"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="mb-5 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Language</span>
              <select
                value={quizLanguage}
                onChange={(event) => setQuizLanguage(event.target.value as QuizLanguage)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
              >
                {LANGUAGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="mb-1 font-semibold">Rules</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Correct answer = +4, Wrong answer = -1, Unattempted = 0</li>
                <li>One option can be selected; answer locks immediately</li>
                <li>Timer auto-submits unanswered questions</li>
                <li>Biology: 60s/question, Physics &amp; Chemistry: 90s/question</li>
              </ul>
            </div>

            {error && (
              <p className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={startSubjectQuiz}
              className="w-full rounded-xl bg-atomic-orange px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-atomic-orange-dark"
            >
              Start Quiz
            </button>

            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Topic-wise Quiz
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Practice a specific chapter or topic only.
              </p>

              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Language</span>
                <select
                  value={topicLanguage}
                  onChange={(event) => setTopicLanguage(event.target.value as QuizLanguage)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
                >
                  {LANGUAGE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Subject</span>
                <select
                  value={topicSubject}
                  onChange={(event) =>
                    setTopicSubject(event.target.value as Exclude<QuizSubject, "Full NEET">)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
                >
                  {TOPIC_SUBJECT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Topic / Chapter name
                </span>
                <input
                  value={topicText}
                  onChange={(event) => setTopicText(event.target.value)}
                  placeholder="e.g. Human Reproduction, Thermodynamics, Chemical Bonding"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Number of questions
                </span>
                <select
                  value={topicQuestionCount}
                  onChange={(event) => setTopicQuestionCount(Number(event.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-atomic-orange dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </label>

              <button
                type="button"
                onClick={startTopicQuiz}
                className="w-full rounded-xl bg-atomic-blue px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-800"
              >
                Start Topic Quiz
              </button>
            </div>
          </div>
        )}

        {stage === "loading" && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-atomic-orange border-t-transparent" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Preparing your quiz...</p>
          </div>
        )}

        {stage === "active" && currentQuestion && (
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>
                {currentQuestion.subject} · Question {currentIndex + 1} / {questions.length}
              </span>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                  totalRemaining <= 60
                    ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
                    : "bg-blue-50 text-atomic-blue dark:bg-blue-900/20"
                }`}
              >
                <Clock3 className="h-3.5 w-3.5" />
                {formatTime(totalRemaining)}
              </span>
            </div>

            <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-atomic-orange transition-all"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            <p className="mb-5 mt-4 whitespace-pre-line text-base font-medium leading-relaxed text-slate-900 dark:text-white">
              {currentQuestion.text}
            </p>

            <div className="space-y-2.5">
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrectOption = index === currentQuestion.correctIndex;
                const showResult = selectedOption !== null;

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={selectedOption !== null}
                    onClick={() => submitAnswer(index)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                      showResult && isCorrectOption
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                        : showResult && isSelected && !isCorrectOption
                          ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>
                      <strong className="mr-2">{String.fromCharCode(65 + index)}.</strong>
                      {option}
                    </span>
                    {showResult && isCorrectOption && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                    {showResult && isSelected && !isCorrectOption && (
                      <XCircle className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {stage === "summary" && (
          <div className="mx-auto w-full max-w-md text-center">
            <h1 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">Quiz Complete</h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{performanceLabel}</p>

            <div className="mb-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Total marks</p>
                <p className="mt-1 text-lg font-bold text-atomic-orange">{score.marks}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Accuracy</p>
                <p className="mt-1 text-lg font-bold">{score.accuracy}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Correct</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">{score.correct}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Wrong</p>
                <p className="mt-1 text-lg font-bold text-red-500">{score.wrong}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Unattempted</p>
                <p className="mt-1 text-lg font-bold text-slate-500">{score.unattempted}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStage("review")}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Review answers
              </button>
              <button
                type="button"
                onClick={() => setStage("intro")}
                className="flex-1 rounded-xl bg-atomic-orange px-4 py-3 text-sm font-semibold text-white hover:bg-atomic-orange-dark"
              >
                New quiz
              </button>
            </div>
          </div>
        )}

        {stage === "review" && (
          <div className="mx-auto w-full max-w-xl space-y-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Review</h1>
            {questions.map((question, index) => {
              const answer = answers[index];
              return (
                <div
                  key={question.id}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Q{index + 1} · {question.subject} {question.topic ? `· ${question.topic}` : ""}
                  </p>
                  <p className="mb-3 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-900 dark:text-white">
                    {question.text}
                  </p>
                  <div className="mb-3 space-y-1.5">
                    {question.options.map((option, optIndex) => {
                      const isCorrect = optIndex === question.correctIndex;
                      const wasSelected = answer?.selectedIndex === optIndex;
                      return (
                        <p
                          key={optIndex}
                          className={`rounded-lg px-3 py-1.5 text-xs ${
                            isCorrect
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                              : wasSelected
                                ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-300"
                                : "text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </p>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{question.explanation}</p>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setStage("intro")}
              className="w-full rounded-xl bg-atomic-orange px-4 py-3 text-sm font-semibold text-white hover:bg-atomic-orange-dark"
            >
              New quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}