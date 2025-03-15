import { create } from 'zustand';

interface SelectedStudentState {
  selectedStudent: string | null;
  setSelectedStudent: (student: string | null) => void;
}

export const useSelectedStudentStore = create<SelectedStudentState>((set) => ({
  selectedStudent: null,
  setSelectedStudent: (student) => set({ selectedStudent: student }),
}));