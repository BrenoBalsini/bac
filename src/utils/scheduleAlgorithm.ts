import { type Lifeguard } from "../types/Lifeguard";
import { type BeachPost } from "../types/BeachPost";

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

export type ReasoningLog = {
  [lifeguardId: string]: {
    [day: string]: {
      status: string;
      details: string;
    };
  };
};

type CapacityMatrix = { [postId: string]: { [date: string]: number } };
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
  initialCapacity: CapacityMatrix,
  initialLog: ReasoningLog
): {
  schedule: FinalSchedule;
  shiftCount: ShiftCount;
  capacity: CapacityMatrix;
  log: ReasoningLog;
} => {
  const schedule = JSON.parse(JSON.stringify(initialSchedule));
  const shiftCount = { ...initialShiftCount };
  const capacity = JSON.parse(JSON.stringify(initialCapacity));
  const log = JSON.parse(JSON.stringify(initialLog));

  for (const lifeguard of lifeguardsToProcess) {
    const quota =
      lifeguard.group === "G1" ? config.shiftQuotas.G1 : config.shiftQuotas.G2;
    const possibleShifts: PossibleShift[] = [];

    const daysInPeriod = getDaysInPeriod(
      config.period.startDate,
      config.period.endDate
    );

    for (const day of daysInPeriod) {
      if (config.requestedDaysOff[lifeguard.id]?.[day]) {
        if (!log[lifeguard.id]) log[lifeguard.id] = {};
        log[lifeguard.id][day] = {
          status: "Folga Solicitada",
          details: "Marcado pelo utilizador como dia de folga.",
        };
        continue;
      }

      for (const post of config.posts) {
        if ((capacity[post.id]?.[day] || 0) > 0) {
          let score = 0;
          if (post.id === lifeguard.preferenceA_id) score += 100;
          if (post.id === lifeguard.preferenceB_id) score += 50;

          const dayOfWeek = new Date(day + "T00:00:00").getDay();
          if (dayOfWeek > 0 && dayOfWeek < 6) score += 10;
          else score -= 20;

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
            schedule[shift.day][postId].some(
              (lg: Lifeguard) => lg.id === lifeguard.id
            )
        );
        if (!isAlreadyWorking) {
          schedule[shift.day][shift.postId].push(lifeguard);
          shiftCount[lifeguard.id]++;
          capacity[shift.postId][shift.day]--;

          const postName =
            config.posts.find((p) => p.id === shift.postId)?.name ||
            "Desconhecido";
          let status = "Alocado";
          if (shift.postId === lifeguard.preferenceA_id)
            status = "Alocado no PA";
          else if (shift.postId === lifeguard.preferenceB_id)
            status = "Alocado no PB";
          else status = "Alocado no PX";

          if (!log[lifeguard.id]) log[lifeguard.id] = {};
          log[lifeguard.id][shift.day] = {
            status,
            details: `Alocado com sucesso no ${postName}.`,
          };
        }
      }
    }
  }

  return { schedule, shiftCount, capacity, log };
};

const runG1BalancingPhase = (
  schedule: FinalSchedule,
  capacity: CapacityMatrix,
  config: ScheduleConfig,
  log: ReasoningLog
): {
  balancedSchedule: FinalSchedule;
  balancedCapacity: CapacityMatrix;
  updatedLog: ReasoningLog;
} => {
  const balancedSchedule = JSON.parse(JSON.stringify(schedule));
  const balancedCapacity = JSON.parse(JSON.stringify(capacity));
  const updatedLog = JSON.parse(JSON.stringify(log));
  const days = getDaysInPeriod(config.period.startDate, config.period.endDate);

  for (const day of days) {
    const postsWithG1 = new Set<string>();
    Object.keys(balancedSchedule[day]).forEach((postId) => {
      if (balancedSchedule[day][postId].some((lg: Lifeguard) => lg.group === "G1")) {
        postsWithG1.add(postId);
      }
    });

    const postsWithoutG1 = config.posts.filter((p) => !postsWithG1.has(p.id));

    for (const postToFill of postsWithoutG1) {
      if ((balancedCapacity[postToFill.id]?.[day] || 0) <= 0) continue; // Não move se o posto de destino estiver lotado

      let bestCandidateToMove: {
        lifeguard: Lifeguard;
        fromPostId: string;
        distance: number;
      } | null = null;

      const postsWithG1ToStealFrom = config.posts.filter(
        (p) =>
          postsWithG1.has(p.id) &&
          balancedSchedule[day][p.id].filter((lg: Lifeguard) => lg.group === "G1").length >
            1
      );

      for (const sourcePost of postsWithG1ToStealFrom) {
        const g1sInSourcePost = balancedSchedule[day][sourcePost.id].filter(
          (lg: Lifeguard) => lg.group === "G1"
        );
        if (g1sInSourcePost.length === 0) continue;

        // Pega o G1 mais moderno (maior rank)
        const mostModernG1 = g1sInSourcePost.reduce((lgA: Lifeguard, lgB: Lifeguard) =>
          lgA.rank > lgB.rank ? lgA : lgB
        );
        const distance = Math.abs(postToFill.order - sourcePost.order);

        if (!bestCandidateToMove || distance < bestCandidateToMove.distance) {
          bestCandidateToMove = {
            lifeguard: mostModernG1,
            fromPostId: sourcePost.id,
            distance,
          };
        }
      }

      if (bestCandidateToMove) {
        const { lifeguard, fromPostId } = bestCandidateToMove;

        // Remove do posto de origem
        balancedSchedule[day][fromPostId] = balancedSchedule[day][
          fromPostId
        ].filter((lg: Lifeguard) => lg.id !== lifeguard.id);
        balancedCapacity[fromPostId][day]++;

        // Adiciona ao posto de destino
        balancedSchedule[day][postToFill.id].push(lifeguard);
        balancedCapacity[postToFill.id][day]--;

        // Atualiza o log
        const sourcePostName =
          config.posts.find((p) => p.id === fromPostId)?.name || "";
        updatedLog[lifeguard.id][day] = {
          status: "Realocado (Balanceamento G1)",
          details: `Movido do ${sourcePostName} para garantir cobertura de G1 no ${postToFill.name}.`,
        };
      }
    }
  }

  return { balancedSchedule, balancedCapacity, updatedLog };
};

const runCompulsoryDayOffPhase = (
  schedule: FinalSchedule,
  shiftCount: ShiftCount,
  config: ScheduleConfig,
  initialLog: ReasoningLog
): {
  finalSchedule: FinalSchedule;
  compulsoryDaysOff: AssignedCompulsoryDaysOff;
  log: ReasoningLog;
} => {
  const finalSchedule = JSON.parse(JSON.stringify(schedule));
  const log = JSON.parse(JSON.stringify(initialLog));
  const compulsoryDaysOff: AssignedCompulsoryDaysOff = {};
  const days = getDaysInPeriod(config.period.startDate, config.period.endDate);

  for (const lifeguard of config.lifeguards.sort((a, b) => a.rank - b.rank)) {
    const quota =
      lifeguard.group === "G1" ? config.shiftQuotas.G1 : config.shiftQuotas.G2;

    let daysToRemove = (shiftCount[lifeguard.id] || 0) - quota;

    while (daysToRemove > 0) {
      let bestDayToRemove: { day: string; score: number } | null = null;
      const workingDays: string[] = days.filter((day) =>
        Object.keys(finalSchedule[day]).some((postId) =>
          finalSchedule[day][postId].some(
            (lg: Lifeguard) => lg.id === lifeguard.id
          )
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
            (lg: Lifeguard) => lg.id !== lifeguard.id
          );
          if (finalSchedule[day][postId].length < originalLength) break;
        }
        if (!compulsoryDaysOff[lifeguard.id])
          compulsoryDaysOff[lifeguard.id] = {};
        compulsoryDaysOff[lifeguard.id][day] = true;

        if (!log[lifeguard.id]) log[lifeguard.id] = {};
        log[lifeguard.id][day] = {
          status: "Folga Compulsória",
          details: `Atribuída para respeitar a cota de ${quota} diárias.`,
        };

        daysToRemove--;
      } else {
        break;
      }
    }
  }
  return { finalSchedule, compulsoryDaysOff, log };
};

export function generateSchedule(config: ScheduleConfig): {
  schedule: FinalSchedule;
  compulsoryDaysOff: AssignedCompulsoryDaysOff;
  reasoningLog: ReasoningLog;
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
  const initialLog: ReasoningLog = {};

 // 1. Roda a alocação inicial para o G1
 const g1InitialAllocation = runAllocationPhase(g1Lifeguards, config, initialSchedule, initialShiftCount, initialCapacity, initialLog);

 // 2. Roda a NOVA fase de balanceamento do G1
 const { balancedSchedule, balancedCapacity, updatedLog } = runG1BalancingPhase(g1InitialAllocation.schedule, g1InitialAllocation.capacity, config, g1InitialAllocation.log);

 // 3. Roda a alocação para o G2, usando o resultado do balanceamento do G1
 const g2Result = runAllocationPhase(g2Lifeguards, config, balancedSchedule, g1InitialAllocation.shiftCount, balancedCapacity, updatedLog);

 // 4. Roda a fase final de ajuste de Folgas Compulsórias
 const { finalSchedule, compulsoryDaysOff, log } = runCompulsoryDayOffPhase(g2Result.schedule, g2Result.shiftCount, config, g2Result.log);

  for (const lifeguard of config.lifeguards) {
    for (const day of days) {
      if (!log[lifeguard.id]?.[day]) {
        if (!log[lifeguard.id]) log[lifeguard.id] = {};
        log[lifeguard.id][day] = {
          status: "Folga",
          details: "Dia de folga normal (não solicitado).",
        };
      }
    }
  }

  return { schedule: finalSchedule, compulsoryDaysOff, reasoningLog: log };
}
