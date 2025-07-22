import { type Lifeguard } from '../types/Lifeguard';
import { type BeachPost } from '../types/BeachPost';

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

export type FinalSchedule = { [date: string]: { [postId: string]: Lifeguard[] } };
export type AssignedCompulsoryDaysOff = { [lifeguardId: string]: { [date: string]: boolean } };

const findClosestAvailablePost = (day: string, targetPostOrder: number, posts: BeachPost[], remainingCapacity: CapacityMatrix): string | null => {
  const availablePosts = posts
    .filter(post => (remainingCapacity[post.id]?.[day] || 0) > 0)
    .map(post => ({
      ...post,
      distance: Math.abs(post.order - targetPostOrder),
    }))
    .sort((a, b) => a.distance - b.distance);

  return availablePosts.length > 0 ? availablePosts[0].id : null;
};

export function generateSchedule(config: ScheduleConfig): { schedule: FinalSchedule, compulsoryDaysOff: AssignedCompulsoryDaysOff } {
  const sortedLifeguards = [...config.lifeguards].sort((a, b) => a.rank - b.rank);
  const g1Lifeguards = sortedLifeguards.filter(lg => lg.group === 'G1');
  const g2Lifeguards = sortedLifeguards.filter(lg => lg.group === 'G2');

  const remainingCapacity: CapacityMatrix = JSON.parse(JSON.stringify(config.capacityMatrix));
  const shiftCount: { [lifeguardId: string]: number } = {};
  config.lifeguards.forEach(lg => shiftCount[lg.id] = 0);
  const finalSchedule: FinalSchedule = {};
  const days: string[] = [];
  const currentDate = new Date(config.period.startDate + 'T00:00:00');
  const lastDate = new Date(config.period.endDate + 'T00:00:00');
  while (currentDate <= lastDate) {
    const dayString = currentDate.toISOString().split('T')[0];
    days.push(dayString);
    finalSchedule[dayString] = {};
    config.posts.forEach(post => finalSchedule[dayString][post.id] = []);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const allocate = (lifeguard: Lifeguard, day: string, postId: string) => {
    finalSchedule[day][postId].push(lifeguard);
    shiftCount[lifeguard.id]++;
    remainingCapacity[postId][day]--;
  };

  const processGroup = (groupLifeguards: Lifeguard[]) => {
    const groupName = groupLifeguards[0]?.group || '';

    for (const lifeguard of groupLifeguards) {
      const quota = groupName === 'G1' ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
      const prefA = lifeguard.preferenceA_id;
      if (!prefA) continue;

      for (const day of days) {
        if (shiftCount[lifeguard.id] >= quota) break;
        if (config.requestedDaysOff[lifeguard.id]?.[day]) continue;
        if ((remainingCapacity[prefA]?.[day] || 0) > 0) {
          allocate(lifeguard, day, prefA);
        }
      }
    }

    for (const lifeguard of groupLifeguards) {
      const quota = groupName === 'G1' ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
      const prefB = lifeguard.preferenceB_id;
      if (!prefB) continue;

      for (const day of days) {
        if (shiftCount[lifeguard.id] >= quota) break;
        if (config.requestedDaysOff[lifeguard.id]?.[day]) continue;
        const isAlreadyWorking = Object.values(finalSchedule[day]).some(staff => staff.some(lg => lg.id === lifeguard.id));
        if (isAlreadyWorking) continue;

        if ((remainingCapacity[prefB]?.[day] || 0) > 0) {
          allocate(lifeguard, day, prefB);
        }
      }
    }

    for (const lifeguard of groupLifeguards) {
      const quota = groupName === 'G1' ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
      const prefA = lifeguard.preferenceA_id;
      const targetPost = config.posts.find(p => p.id === prefA);
      if (!targetPost) continue;

      for (const day of days) {
        if (shiftCount[lifeguard.id] >= quota) break;
        if (config.requestedDaysOff[lifeguard.id]?.[day]) continue;
        const isAlreadyWorking = Object.values(finalSchedule[day]).some(staff => staff.some(lg => lg.id === lifeguard.id));
        if (isAlreadyWorking) continue;

        const closestPostId = findClosestAvailablePost(day, targetPost.order, config.posts, remainingCapacity);
        if (closestPostId) {
          allocate(lifeguard, day, closestPostId);
        }
      }
    }
  };

  processGroup(g1Lifeguards);
  processGroup(g2Lifeguards);

  const compulsoryDaysOff: AssignedCompulsoryDaysOff = {};
  for (const lifeguard of sortedLifeguards) {
    const quota = lifeguard.group === 'G1' ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
    const currentWorkdays = Object.values(finalSchedule).flatMap(d => Object.values(d).flat()).filter(lg => lg.id === lifeguard.id).length;
    let daysToRemove = currentWorkdays - quota;

    while (daysToRemove > 0) {
      let bestDayToRemove: { day: string, score: number } | null = null;
      const workingDays: string[] = days.filter(day => Object.values(finalSchedule[day]).some(postStaff => postStaff.some(lg => lg.id === lifeguard.id)));

      for (const day of workingDays) {
        let score = 0;
        const dayIndex = days.indexOf(day);
        if (dayIndex > 0) {
          const prevDay = days[dayIndex - 1];
          if (config.requestedDaysOff[lifeguard.id]?.[prevDay] || compulsoryDaysOff[lifeguard.id]?.[prevDay]) score += 10;
        }
        if (dayIndex < days.length - 1) {
          const nextDay = days[dayIndex + 1];
          if (config.requestedDaysOff[lifeguard.id]?.[nextDay] || compulsoryDaysOff[lifeguard.id]?.[nextDay]) score += 10;
        }
        const dayOfWeek = new Date(day + 'T00:00:00').getDay();
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
          finalSchedule[day][postId] = finalSchedule[day][postId].filter(lg => lg.id !== lifeguard.id);
          if (finalSchedule[day][postId].length < originalLength) break;
        }
        if (!compulsoryDaysOff[lifeguard.id]) compulsoryDaysOff[lifeguard.id] = {};
        compulsoryDaysOff[lifeguard.id][day] = true;
        daysToRemove--;
      } else {
        break;
      }
    }
  }

  return { schedule: finalSchedule, compulsoryDaysOff };
}