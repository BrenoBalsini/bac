import { type Lifeguard } from "../types/Lifeguard";
import { type BeachPost } from "../types/BeachPost";

type ScheduleConfig = {
  period: { startDate: string; endDate: string };
  shiftQuotas: { G1: number; G2: number };
  capacityMatrix: { [postId: string]: { [date: string]: number } };
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

export function generateSchedule(config: ScheduleConfig): {
  schedule: FinalSchedule;
  compulsoryDaysOff: AssignedCompulsoryDaysOff;
} {
  const sortedLifeguards = [...config.lifeguards].sort(
    (a, b) => a.rank - b.rank
  );
  const shiftCount: { [lifeguardId: string]: number } = {};
  config.lifeguards.forEach((lg) => (shiftCount[lg.id] = 0));
  const finalSchedule: FinalSchedule = {};
  const days: string[] = [];
  const currentDate = new Date(config.period.startDate + "T00:00:00");
  const lastDate = new Date(config.period.endDate + "T00:00:00");
  while (currentDate <= lastDate) {
    const dayString = currentDate.toISOString().split("T")[0];
    days.push(dayString);
    finalSchedule[dayString] = {};
    config.posts.forEach((post) => (finalSchedule[dayString][post.id] = []));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (const day of days) {
    for (const post of config.posts.sort((a, b) => a.order - b.order)) {
      let vacanciesToFill = config.capacityMatrix[post.id]?.[day] || 0;
      while (vacanciesToFill > 0) {
        let lifeguardFound = false;
        for (const lifeguard of sortedLifeguards) {
          const quota =
            lifeguard.group === "G1"
              ? config.shiftQuotas.G1
              : config.shiftQuotas.G2;
          if (shiftCount[lifeguard.id] >= quota) continue;
          if (config.requestedDaysOff[lifeguard.id]?.[day]) continue;
          const isAlreadyWorkingToday = Object.values(finalSchedule[day]).some(
            (postStaff) => postStaff.some((lg) => lg.id === lifeguard.id)
          );
          if (isAlreadyWorkingToday) continue;
          if (
            lifeguard.preferenceA_id === post.id ||
            lifeguard.preferenceB_id === post.id
          ) {
            finalSchedule[day][post.id].push(lifeguard);
            shiftCount[lifeguard.id]++;
            vacanciesToFill--;
            lifeguardFound = true;
            break;
          }
        }
        if (!lifeguardFound) {
          for (const lifeguard of sortedLifeguards) {
            const quota =
              lifeguard.group === "G1"
                ? config.shiftQuotas.G1
                : config.shiftQuotas.G2;
            if (shiftCount[lifeguard.id] >= quota) continue;
            if (config.requestedDaysOff[lifeguard.id]?.[day]) continue;
            const isAlreadyWorkingToday = Object.values(
              finalSchedule[day]
            ).some((postStaff) =>
              postStaff.some((lg) => lg.id === lifeguard.id)
            );
            if (isAlreadyWorkingToday) continue;
            finalSchedule[day][post.id].push(lifeguard);
            shiftCount[lifeguard.id]++;
            vacanciesToFill--;
            lifeguardFound = true;
            break;
          }
        }
        if (!lifeguardFound) break;
      }
    }
  }

  const compulsoryDaysOff: AssignedCompulsoryDaysOff = {};

  for (const lifeguard of config.lifeguards) {
    const quota =
      lifeguard.group === "G1" ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
    const currentWorkdays = Object.values(finalSchedule)
      .flatMap((day) => Object.values(day).flat())
      .filter((lg) => lg.id === lifeguard.id).length;
    let daysToRemove = currentWorkdays - quota;

    while (daysToRemove > 0) {
      let bestDayToRemove: { day: string; score: number } | null = null;

      const workingDays: string[] = [];
      for (const day of days) {
        if (
          Object.values(finalSchedule[day]).some((postStaff) =>
            postStaff.some((lg) => lg.id === lifeguard.id)
          )
        ) {
          workingDays.push(day);
        }
      }

      for (const day of workingDays) {
        let score = 0;
        const dayIndex = days.indexOf(day);

        if (dayIndex > 0) {
          const prevDay = days[dayIndex - 1];
          if (
            config.requestedDaysOff[lifeguard.id]?.[prevDay] ||
            compulsoryDaysOff[lifeguard.id]?.[prevDay]
          ) {
            score += 10;
          }
        }
        if (dayIndex < days.length - 1) {
          const nextDay = days[dayIndex + 1];
          if (
            config.requestedDaysOff[lifeguard.id]?.[nextDay] ||
            compulsoryDaysOff[lifeguard.id]?.[nextDay]
          ) {
            score += 10;
          }
        }

        const dayOfWeek = new Date(day + "T00:00:00").getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          score += 3;
        } else {
          score += 1;
        }

        if (bestDayToRemove === null || score < bestDayToRemove.score) {
          bestDayToRemove = { day, score };
        }
      }

      if (bestDayToRemove) {
        const day = bestDayToRemove.day;

        for (const postId in finalSchedule[day]) {
          const originalLength = finalSchedule[day][postId].length;
          finalSchedule[day][postId] = finalSchedule[day][postId].filter(
            (lg) => lg.id !== lifeguard.id
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

  return { schedule: finalSchedule, compulsoryDaysOff };
}
