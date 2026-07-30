const QUIZ_TIMER_DIRECTIVE = /^\s*\[ATOMIC_QUIZ_TIMER:(\d{1,4})\]\s*\n?/i;

export function getQuizTimerSeconds(content: string) {
  const directive = content.match(QUIZ_TIMER_DIRECTIVE);
  if (directive) {
    const seconds = Number(directive[1]);
    return Number.isFinite(seconds) ? Math.min(Math.max(seconds, 10), 3_600) : null;
  }
  return /quiz\s+start|question\s*1\s*:/i.test(content) ? 60 : null;
}

export function stripQuizTimerDirective(content: string) {
  return content.replace(QUIZ_TIMER_DIRECTIVE, "");
}

export function containsDevanagari(content: string) {
  return /[\u0900-\u097F]/.test(content);
}

// ===== Structured Quiz Mode =====

export type QuizSubject = "Biology" | "Physics" | "Chemistry" | "Full NEET";
type SingleSubject = Exclude<QuizSubject, "Full NEET">;

export interface QuizConfigEntry {
  subject: SingleSubject;
  questionCount: number;
  timerSeconds: number;
}

export const QUIZ_SUBJECT_CONFIG: Record<SingleSubject, QuizConfigEntry> = {
  Biology: { subject: "Biology", questionCount: 20, timerSeconds: 60 },
  Physics: { subject: "Physics", questionCount: 10, timerSeconds: 90 },
  Chemistry: { subject: "Chemistry", questionCount: 10, timerSeconds: 90 },
};

export interface QuizQuestion {
  id: string;
  subject: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string;
  difficulty?: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedIndex: number | null;
  correct: boolean;
  timeTakenSeconds: number;
}

export function getEntriesForSubject(subject: QuizSubject, customQuestionCount?: number): QuizConfigEntry[] {
  if (subject === "Full NEET") {
    return [QUIZ_SUBJECT_CONFIG.Biology, QUIZ_SUBJECT_CONFIG.Physics, QUIZ_SUBJECT_CONFIG.Chemistry];
  }
  const base = QUIZ_SUBJECT_CONFIG[subject];
  if (customQuestionCount) {
    return [{ ...base, questionCount: customQuestionCount }];
  }
  return [base];
}

export function timerForQuestion(question: QuizQuestion, entries: QuizConfigEntry[]) {
  const entry = entries.find((item) => item.subject === question.subject);
  return entry?.timerSeconds ?? 60;
}

const QUIZ_JSON_BLOCK = /\[ATOMIC_QUIZ_JSON\]([\s\S]*?)\[\/ATOMIC_QUIZ_JSON\]/i;

export function buildQuizRequestPrompt(
  entries: QuizConfigEntry[],
  language: "english" | "hindi" | "hinglish" = "english",
  topic?: string
): string {
  const sections = entries
    .map(
      (entry) =>
        `${entry.subject}: exactly ${entry.questionCount} NEET-standard MCQ questions, ${entry.timerSeconds} seconds each.`
    )
    .join("\n");

  const languageLine =
    language === "hindi"
      ? "Write every question, option, and explanation ONLY in Hindi using Devanagari script. Do not use Romanized Hindi."
      : language === "hinglish"
        ? "Write every question, option, and explanation in natural Hinglish (mix of Hindi and English, Roman script)."
        : "Write every question, option, and explanation in English.";

  const topicLine = topic
    ? `Focus ALL questions strictly on this topic/chapter only: "${topic}". Do not include questions from any other topic.`
    : "";

  return `ATOMIC_QUIZ_JSON_REQUEST
Generate a NEET quiz question set matching the difficulty and style of the actual NEET exam and top coaching institute test series (last 3-4 years), NOT basic textbook-recall questions.

${sections}
${topicLine}

Language instruction: ${languageLine}

Question difficulty requirements (critical - follow strictly):
- Do NOT write simple one-line factual recall questions like "What is the function of X?" or "Which organelle does Y?". Real NEET/test-series questions rarely look like this.
- Distractor (wrong) options must be genuinely plausible - common misconceptions, near-miss numbers, subtly altered facts - not obviously silly or unrelated options.
- Numerical questions (Physics/Chemistry) must require an actual multi-step calculation, not a single-formula plug-in.
- Difficulty pattern across the full set: question 1 = easy warm-up only, questions 2-3 = medium, everything from question 4 onward must be standard-to-hard level, with the final 20% of questions being high-difficulty/tricky.
- Mark each question's "difficulty" field accurately as one of: "Easy", "Medium", "Hard".

Question format requirements (use a genuine mix, matching real exam test-series difficulty):
- Prefer these formats for medium/hard questions (rotate between them, do not repeat the same format for every question):
  1. Match the Column: give Column-I (4 items) and Column-II (4 items) inside the question text, then 4 options that pair them differently, e.g. "(a-i),(b-ii),(c-iii),(d-iv)".
  2. Assertion-Reason: give Assertion (A) and Reason (R) as two separate lines inside the question text, then exactly these 4 fixed options: "Both A and R are correct and R is the correct explanation of A", "Both A and R are correct but R is not the correct explanation of A", "A is correct but R is incorrect", "Both A and R are incorrect".
  3. Statement-I / Statement-II: give two labelled statements in the question text, then 4 options evaluating their correctness in different combinations.
  4. Multiple True/False statements: give 4-5 labelled statements (A, B, C...) in the question text, then 4 options each listing a different combination of which are true/false.
  5. "Which of the following is/are correct (or NOT correct)": give 4 standalone statements as the options themselves.
  6. Reaction-sequence / multi-step scenario: describe a short sequence of steps or a scenario in the question text, then ask to identify a specific intermediate, product, or outcome.
  7. Ranking/ordering: ask to choose the correct order (of stability, reactivity, bond length, etc.) among 3-4 items, with 4 differently-ordered options.
- For chemistry questions involving structures, reactions, or mechanisms, describe them precisely in text notation within the question and option strings (e.g. "CH3-CH2-Br + NaOH -> ?", "resonance structure A: phenoxide ion; structure B: ortho-quinonoid form") since options are plain text, not images.
- Do not just ask simple one-fact-recall questions; combine 2+ related facts or require the student to evaluate multiple claims at once, matching the difficulty of the formats above.
- Every question must still have exactly 4 options (A-D) and one correctIndex, even for match-the-column/assertion-reason/statement formats.
- Prefer statement-based and assertion-reason formats for at least half of the medium/hard questions when the topic allows it.
- Formatting inside the "text" field is critical: use actual \\n newline characters to separate each part. Never run Column-I and Column-II into one paragraph, and never run multiple statements/assertion+reason into one paragraph.
  - Match the Column: put "Column-I:" on its own line, then each (a), (b), (c), (d) item on its own line, then a blank line, then "Column-II:" on its own line, then each (i), (ii), (iii), (iv) item on its own line.
  - Assertion-Reason: put "Assertion (A):" and its text on one line, a blank line, then "Reason (R):" and its text on its own line.
  - Statement-I/II or multiple statements (A,B,C...): put each statement on its own separate line.
  - Example structure (use \\n between every line shown here): "Column-I:\\n(a) item one\\n(b) item two\\n(c) item three\\n(d) item four\\n\\nColumn-II:\\n(i) match one\\n(ii) match two\\n(iii) match three\\n(iv) match four"

Return ONLY the following JSON, wrapped exactly like this, nothing else - no markdown, no extra commentary, no headings, no code fences:

[ATOMIC_QUIZ_JSON]
{
  "questions": [
    {
      "id": "b1",
      "subject": "Biology",
      "text": "question text (may include numbered statements, columns, or assertion/reason using \\n for line breaks within the string)",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "detailed concept explanation with NCERT reference, and why each wrong option is wrong",
      "topic": "chapter or topic name",
      "difficulty": "Medium"
    }
  ]
}
[/ATOMIC_QUIZ_JSON]

Rules:
- Follow the latest NCERT and NTA NEET syllabus only. Never use deleted or outdated NCERT content.
- Never invent fake facts.
- correctIndex is zero-based (0=A, 1=B, 2=C, 3=D).
- Output must be valid JSON parseable by JSON.parse. No trailing commas, no comments, no text outside the [ATOMIC_QUIZ_JSON] block.`;
}

export function parseQuizJson(content: string): QuizQuestion[] | null {
  const match = content.match(QUIZ_JSON_BLOCK);
  const raw = match ? match[1] : content;

  try {
    const parsed = JSON.parse(raw.trim()) as { questions?: QuizQuestion[] };
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return null;
    }
    return parsed.questions;
  } catch {
    return null;
  }
}