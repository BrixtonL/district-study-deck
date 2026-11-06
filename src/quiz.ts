import type { Deck, Mode, Progress, Question, Session } from './model';
export function shuffle<T>(input: readonly T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeSession(deck: Deck, mode: Mode): Session {
  const questions: Question[] = mode === 'custom' ? deck.questions.map(q => ({
    id: `custom:${q.id}`, prompt: q.prompt, correct: q.correct, explanation: q.explanation,
    choices: shuffle(q.choices.map(c => ({ id: c, label: c }))),
  })) : deck.people.map(person => ({
    id: `${mode}:${person.id}`,
    prompt: mode === 'photo-name' ? 'Who is this person?' : mode === 'name-photo' ? `Which portrait is ${person.name}?` : `Which position does ${person.name} hold?`,
    correct: person.id, photoId: mode === 'photo-name' ? person.id : undefined, imageChoices: mode === 'name-photo',
    explanation: `${person.name} is ${person.position} at ${person.organization}.`,
    choices: shuffle(deck.people.map(p => ({ id: p.id, label: mode === 'position' ? p.position : p.name, personId: mode === 'name-photo' ? p.id : undefined }))),
  }));
  if (!questions.length) throw new Error('No active questions are available for this mode.');
  return { id: crypto.randomUUID(), mode, questions: shuffle(questions), index: 0, answers: {}, finished: false };
}
export function answerQuestion(progress: Progress, selected: string): Progress {
  const session = progress.session;
  if (!session || session.finished || session.answers[session.index] !== undefined) return progress;
  const question = session.questions[session.index];
  if (!question.choices.some(c => c.id === selected)) throw new Error('Invalid answer.');
  return {
    session: { ...session, answers: { ...session.answers, [session.index]: selected } },
    attempts: [...progress.attempts, { sessionId: session.id, questionId: question.id, mode: session.mode, correct: selected === question.correct, at: new Date().toISOString() }],
  };
}
export function advance(progress: Progress): Progress {
  const session = progress.session;
  if (!session || session.answers[session.index] === undefined) return progress;
  return { ...progress, session: { ...session, index: Math.min(session.index + 1, session.questions.length - 1), finished: session.index === session.questions.length - 1 } };
}
