import {
  AudioLines,
  BookOpenText,
  Ear,
  GraduationCap,
  Languages,
  LibraryBig,
  LineChart,
  type LucideIcon,
  PenLine,
  Repeat2,
  Sigma,
  Signature,
  Sprout,
  Target,
  Trophy,
} from "lucide-react";

/** An icon for each department, by its key. */
const ICONS: Record<string, LucideIcon> = {
  phonics: AudioLines,
  listeningSpeaking: Ear,
  shadowing: Repeat2,
  readingWriting: BookOpenText,
  languageUsage: Languages,
  handwriting: PenLine,
  cursiveHandwriting: Signature,
  ghars: Sprout,
  mcgrawHill: LibraryBig,
  mapTest: LineChart,
  step: Target,
  ielts: GraduationCap,
  sat: Trophy,
  gat: Sigma,
};

export const departmentIcon = (key: string): LucideIcon => ICONS[key] ?? BookOpenText;
