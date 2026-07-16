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
