export type Row = Record<string, string>;
export interface Person { id: string; name: string; position: string; organization: string; city: string; county: string; category: string; notes: string; photo: Blob }
export interface CustomQuestion { id: string; prompt: string; correct: string; choices: string[]; explanation: string; category: string }
export interface Deck { id: string; filename: string; importedAt: string; people: Person[]; questions: CustomQuestion[]; sheets: Record<string, Row[]>; workbook: Blob; archive: Blob }
export type Mode = 'photo-name' | 'name-photo' | 'position' | 'custom';
export interface Choice { id: string; label: string; personId?: string }
export interface Question { id: string; prompt: string; choices: Choice[]; correct: string; explanation: string; photoId?: string; imageChoices?: boolean }
export interface Session { id: string; mode: Mode; questions: Question[]; index: number; answers: Record<number, string>; finished: boolean }
export interface Attempt { sessionId: string; questionId: string; mode: Mode; correct: boolean; at: string }
export interface Progress { attempts: Attempt[]; session?: Session }
export const emptyProgress = (): Progress => ({ attempts: [] });
export const modes: { id: Mode; title: string; subtitle: string; icon: string }[] = [
  { id: 'photo-name', title: 'Photo to name', subtitle: 'Put a name to a familiar face.', icon: 'portrait' },
  { id: 'name-photo', title: 'Name to photo', subtitle: 'Find the face behind the name.', icon: 'people' },
  { id: 'position', title: 'Know their role', subtitle: 'Connect people with their positions.', icon: 'role' },
  { id: 'custom', title: 'District knowledge', subtitle: 'Practice your workbook questions.', icon: 'book' },
];
