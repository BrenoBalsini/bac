import { type FinalSchedule, type AssignedCompulsoryDaysOff, type ReasoningLog } from "../utils/scheduleAlgorithm";
import { type BeachPost } from "./BeachPost";
import { type Lifeguard } from "./Lifeguard";


export type SavedSchedule = {
  id: string;
  name: string;
  savedAt: string; 

  inputs: {
    startDate: string;
    endDate: string;
    g1Shifts: number;
    g2Shifts: number;
    capacityMatrix: { [postId: string]: { [date: string]: number } };
    requestedDaysOff: { [lifeguardId: string]: { [date: string]: boolean } };
    snapshotLifeguards: Lifeguard[];
    snapshotPosts: BeachPost[];
  };

  outputs: {
    schedule: FinalSchedule;
    compulsoryDaysOff: AssignedCompulsoryDaysOff;
    reasoningLog: ReasoningLog;
  };
};