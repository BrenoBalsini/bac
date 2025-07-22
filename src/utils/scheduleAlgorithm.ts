import { type Lifeguard } from "../types/Lifeguard";
import { type BeachPost } from "../types/BeachPost";

type CapacityMatrix = {
  [postId: string]: { [date: string]: number };
};

type ScheduleConfig = {
  period: { startDate: string; endDate: string };
  shiftQuotas: { G1: number; G2: number };
  capacityMatrix: CapacityMatrix;
  requestedDaysOff: { [lifeguardId: string]: { [date: string]: boolean } };
  lifeguards: Lifeguard[];
  posts: BeachPost[];
};

export type FinalSchedule = {
  [date: string]: { [postId: string]: Lifeguard[] };
};
export type AssignedCompulsoryDaysOff = {
  [lifeguardId: string]: { [date: string]: boolean };
};

type ShiftCount = { [lifeguardId: string]: number };
type PossibleShift = { day: string; postId: string; score: number };

const getDaysInPeriod = (startDate: string, endDate: string): string[] => {
  const days = [];
  const currentDate = new Date(startDate + "T00:00:00");
  const lastDate = new Date(endDate + "T00:00:00");
  while (currentDate <= lastDate) {
    days.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
};

const runAllocationPhase = (
  lifeguardsToProcess: Lifeguard[],
  config: ScheduleConfig,
  initialSchedule: FinalSchedule,
  initialShiftCount: ShiftCount,
  initialCapacity: CapacityMatrix
): {
  schedule: FinalSchedule;
  shiftCount: ShiftCount;
  capacity: CapacityMatrix;
} => {
  const schedule = JSON.parse(JSON.stringify(initialSchedule));
  const shiftCount = { ...initialShiftCount };
  const capacity = JSON.parse(JSON.stringify(initialCapacity));

  for (const lifeguard of lifeguardsToProcess) {
    const quota =
      lifeguard.group === "G1" ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
    const possibleShifts: PossibleShift[] = [];

    for (const day of getDaysInPeriod(
      config.period.startDate,
      config.period.endDate
    )) {
      if (config.requestedDaysOff[lifeguard.id]?.[day]) continue;

      for (const post of config.posts) {
        if ((capacity[post.id]?.[day] || 0) > 0) {
          let score = 0;
          if (post.id === lifeguard.preferenceA_id) score += 100;
          if (post.id === lifeguard.preferenceB_id) score += 50;

          const dayOfWeek = new Date(day + "T00:00:00").getDay();
          if (dayOfWeek > 0 && dayOfWeek < 6) score += 10;
          else score -= 20;

          if (lifeguard.group === "G1") {
            const g1AlreadyInPost = schedule[day][post.id].some(
              (lg: Lifeguard) => lg.group === "G1"
            );
            if (g1AlreadyInPost) score -= 1000;
          }

          possibleShifts.push({ day, postId: post.id, score });
        }
      }
    }

    const bestShifts = possibleShifts
      .sort((a, b) => b.score - a.score)
      .slice(0, quota - shiftCount[lifeguard.id]);

    for (const shift of bestShifts) {
      if ((capacity[shift.postId]?.[shift.day] || 0) > 0) {
        const isAlreadyWorking = Object.keys(schedule[shift.day]).some(
          (postId) =>
            schedule[shift.day][postId].some((lg:Lifeguard) => lg.id === lifeguard.id)
        );
        if (!isAlreadyWorking) {
          schedule[shift.day][shift.postId].push(lifeguard);
          shiftCount[lifeguard.id]++;
          capacity[shift.postId][shift.day]--;
        }
      }
    }
  }

  return { schedule, shiftCount, capacity };
};

const runCompulsoryDayOffPhase = (
  schedule: FinalSchedule,
  shiftCount: ShiftCount,
  config: ScheduleConfig
): {
  finalSchedule: FinalSchedule;
  compulsoryDaysOff: AssignedCompulsoryDaysOff;
} => {
  const finalSchedule = JSON.parse(JSON.stringify(schedule));
  const compulsoryDaysOff: AssignedCompulsoryDaysOff = {};
  const days = getDaysInPeriod(config.period.startDate, config.period.endDate);

  for (const lifeguard of config.lifeguards.sort((a, b) => a.rank - b.rank)) {
    const quota =
      lifeguard.group === "G1" ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
    // CORREÇÃO: Usamos o shiftCount que recebemos, em vez de recalcular.
    let daysToRemove = (shiftCount[lifeguard.id] || 0) - quota;

    while (daysToRemove > 0) {
      let bestDayToRemove: { day: string; score: number } | null = null;
      const workingDays: string[] = days.filter((day) =>
        Object.keys(finalSchedule[day]).some((postId) =>
          finalSchedule[day][postId].some((lg:Lifeguard) => lg.id === lifeguard.id)
        )
      );

      for (const day of workingDays) {
        let score = 0;
        const dayIndex = days.indexOf(day);
        if (
          dayIndex > 0 &&
          (config.requestedDaysOff[lifeguard.id]?.[days[dayIndex - 1]] ||
            compulsoryDaysOff[lifeguard.id]?.[days[dayIndex - 1]])
        )
          score += 10;
        if (
          dayIndex < days.length - 1 &&
          (config.requestedDaysOff[lifeguard.id]?.[days[dayIndex + 1]] ||
            compulsoryDaysOff[lifeguard.id]?.[days[dayIndex + 1]])
        )
          score += 10;

        const dayOfWeek = new Date(day + "T00:00:00").getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) score += 3;
        else score += 1;

        if (bestDayToRemove === null || score < bestDayToRemove.score) {
          bestDayToRemove = { day, score };
        }
      }

      if (bestDayToRemove) {
        const day = bestDayToRemove.day;
        for (const postId in finalSchedule[day]) {
          const originalLength = finalSchedule[day][postId].length;
          finalSchedule[day][postId] = finalSchedule[day][postId].filter(
            (lg:Lifeguard) => lg.id !== lifeguard.id
          );
          if (finalSchedule[day][postId].length < originalLength) break;
        }
        if (!compulsoryDaysOff[lifeguard.id])
          compulsoryDaysOff[lifeguard.id] = {};
        compulsoryDaysOff[lifeguard.id][day] = true;
        daysToRemove--;
      } else {
        break;
      }
    }
  }
  return { finalSchedule, compulsoryDaysOff };
};

export function generateSchedule(config: ScheduleConfig): {
  schedule: FinalSchedule;
  compulsoryDaysOff: AssignedCompulsoryDaysOff;
} {
  const sortedLifeguards = [...config.lifeguards].sort(
    (a, b) => a.rank - b.rank
  );
  const g1Lifeguards = sortedLifeguards.filter((lg) => lg.group === "G1");
  const g2Lifeguards = sortedLifeguards.filter((lg) => lg.group === "G2");

  const initialShiftCount: ShiftCount = {};
  config.lifeguards.forEach((lg) => (initialShiftCount[lg.id] = 0));

  const initialSchedule: FinalSchedule = {};
  const days = getDaysInPeriod(config.period.startDate, config.period.endDate);
  days.forEach((day) => {
    initialSchedule[day] = {};
    config.posts.forEach((post) => (initialSchedule[day][post.id] = []));
  });

  const initialCapacity = JSON.parse(JSON.stringify(config.capacityMatrix));

  const g1Result = runAllocationPhase(
    g1Lifeguards,
    config,
    initialSchedule,
    initialShiftCount,
    initialCapacity
  );
  const g2Result = runAllocationPhase(
    g2Lifeguards,
    config,
    g1Result.schedule,
    g1Result.shiftCount,
    g1Result.capacity
  );

  const { finalSchedule, compulsoryDaysOff } = runCompulsoryDayOffPhase(
    g2Result.schedule,
    g2Result.shiftCount,
    config
  );

  return { schedule: finalSchedule, compulsoryDaysOff };
}
