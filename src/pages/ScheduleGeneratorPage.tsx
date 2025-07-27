import { useState, useEffect, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { type Lifeguard } from "../types/Lifeguard";
import { type BeachPost } from "../types/BeachPost";
import {
  generateSchedule,
  type FinalSchedule,
  type AssignedCompulsoryDaysOff,
  type ReasoningLog
} from "../utils/scheduleAlgorithm";
import Stepper from "../components/ui/Stepper";
import React from "react";
import type { SavedSchedule } from "../types/SavedSchedule";

type CapacityMatrix = { [postId: string]: { [date: string]: number } };
type RequestedDaysOff = { [lifeguardId: string]: { [date: string]: boolean } };

export default function ScheduleGeneratorPage() {
  const [lifeguards] = useLocalStorage<Lifeguard[]>("bac-roster", []);
  const [posts] = useLocalStorage<BeachPost[]>("bac-posts", []);
  const [scheduleHistory, setScheduleHistory] = useLocalStorage<SavedSchedule[]>("bac-schedule-history", []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [g1Shifts, setG1Shifts] = useState(11);
  const [g2Shifts, setG2Shifts] = useState(10);
  const [days, setDays] = useState<string[]>([]);
  const [capacityMatrix, setCapacityMatrix] = useState<CapacityMatrix>({});
  const [requestedDaysOff, setRequestedDaysOff] = useState<RequestedDaysOff>(
    {}
  );
  const [finalSchedule, setFinalSchedule] = useState<FinalSchedule | null>(
    null
  );
  const [assignedFCs, setAssignedFCs] =
    useState<AssignedCompulsoryDaysOff | null>(null);

   const [reasoningLog, setReasoningLog] = useState<ReasoningLog | null>(null);  

  const [currentStep, setCurrentStep] = useState(1);
  const steps = ["Configuração", "Vagas", "Folgas", "Gerar"];

  useEffect(() => {
    if (startDate && endDate) {
      const allDays = [];
      const currentDate = new Date(startDate + "T00:00:00");
      const lastDate = new Date(endDate + "T00:00:00");
      while (currentDate <= lastDate) {
        allDays.push(currentDate.toISOString().split("T")[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      setDays(allDays);
    } else {
      setDays([]);
    }
  }, [startDate, endDate]);

  const handleCapacityChange = (
    postId: string,
    date: string,
    value: number
  ) => {
    setCapacityMatrix((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [date]: value },
    }));
  };

  const handleDayOffChange = (
    lifeguardId: string,
    date: string,
    isChecked: boolean
  ) => {
    setRequestedDaysOff((prev) => {
      const updatedDaysOff = { ...(prev[lifeguardId] || {}) };
      if (isChecked) updatedDaysOff[date] = true;
      else delete updatedDaysOff[date];
      return { ...prev, [lifeguardId]: updatedDaysOff };
    });
  };

  const handleGenerateSchedule = () => {
    if (
      !startDate ||
      !endDate ||
      posts.length === 0 ||
      lifeguards.length === 0
    ) {
      alert(
        "Por favor, preencha as datas, e certifique-se de que há salva-vidas e postos cadastrados."
      );
      return;
    }
    const config = {
      period: { startDate, endDate },
      shiftQuotas: { G1: g1Shifts, G2: g2Shifts },
      capacityMatrix,
      requestedDaysOff,
      lifeguards,
      posts,
    };
    const { schedule, compulsoryDaysOff, reasoningLog } = generateSchedule(config);
    setFinalSchedule(schedule);
    setReasoningLog(reasoningLog);
    setAssignedFCs(compulsoryDaysOff);
  };

   const handleSaveToHistory = () => {
    if (!finalSchedule || !assignedFCs || !reasoningLog ) {
      alert("Nenhuma escala foi gerada para salvar.");
      return;
    }

    const defaultName = `Escala de ${startDate} a ${endDate}`;
    const scheduleName = prompt("Digite um nome para esta escala:", defaultName);

    if (!scheduleName) {
      return;
    }

    const newSavedSchedule: SavedSchedule = {
      id: crypto.randomUUID(),
      name: scheduleName,
      savedAt: new Date().toISOString(),
      inputs: {
        startDate,
        endDate,
        g1Shifts,
        g2Shifts,
        capacityMatrix,
        requestedDaysOff,
      },
      outputs: {
        schedule: finalSchedule,
        compulsoryDaysOff: assignedFCs,
        reasoningLog: reasoningLog,
      },
    };

    setScheduleHistory([...scheduleHistory, newSavedSchedule]);
    alert(`Escala "${scheduleName}" salva com sucesso no histórico!`);
  };

  const goToNextStep = () => {
    if (currentStep === 1 && (!startDate || !endDate)) {
      alert(
        "Por favor, selecione as datas de início e término antes de avançar."
      );
      return;
    }
    setCurrentStep((prev) => (prev < steps.length ? prev + 1 : prev));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const lifeguardsByPost = useMemo(() => {
    const grouped: { [postId: string]: Lifeguard[] } = {};
    const unassigned: Lifeguard[] = [];

    for (const lifeguard of lifeguards) {
      const prefA = lifeguard.preferenceA_id;
      if (prefA) {
        if (!grouped[prefA]) grouped[prefA] = [];
        grouped[prefA].push(lifeguard);
      } else {
        unassigned.push(lifeguard);
      }
    }

    for (const postId in grouped) {
      grouped[postId].sort((a, b) => a.rank - b.rank);
    }
    if (unassigned.length > 0)
      grouped["unassigned"] = unassigned.sort((a, b) => a.rank - b.rank);

    return grouped;
  }, [lifeguards]);

  const postsById = useMemo(() => {
    const map = new Map<string, BeachPost>();
    posts.forEach((post) => map.set(post.id, post));
    return map;
  }, [posts]);

  const renderStepContent = () => {
    const g1Count = lifeguards.filter((lg) => lg.group === "G1").length;
    const g2Count = lifeguards.filter((lg) => lg.group === "G2").length;

    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-700">
              1. Configurações da Quinzena
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-sm font-medium text-gray-600"
                >
                  Data de Início
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="end-date"
                  className="block text-sm font-medium text-gray-600"
                >
                  Data de Término
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <h3 className="font-bold text-red-800">Grupo G1</h3>
                <p className="text-sm text-red-700">
                  Qtde GVC: <span className="font-semibold">{g1Count}</span>
                </p>
                <div>
                  <label
                    htmlFor="g1-shifts"
                    className="block text-sm font-medium text-red-700"
                  >
                    Diárias / GVC
                  </label>
                  <input
                    type="number"
                    id="g1-shifts"
                    value={g1Shifts}
                    onChange={(e) =>
                      setG1Shifts(parseInt(e.target.value, 10) || 0)
                    }
                    className="mt-1 block w-full p-2 border border-red-300 rounded-md"
                  />
                </div>
              </div>
              <div className="bg-orange-100 p-4 rounded-lg">
                <h3 className="font-bold text-orange-800">Grupo G2</h3>
                <p className="text-sm text-orange-700">
                  Qtde GVC: <span className="font-semibold">{g2Count}</span>
                </p>
                <div>
                  <label
                    htmlFor="g2-shifts"
                    className="block text-sm font-medium text-orange-700"
                  >
                    Diárias / GVC
                  </label>
                  <input
                    type="number"
                    id="g2-shifts"
                    value={g2Shifts}
                    onChange={(e) =>
                      setG2Shifts(parseInt(e.target.value, 10) || 0)
                    }
                    className="mt-1 block w-full p-2 border border-orange-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-700">
              2. Vagas por Posto/Dia
            </h2>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border text-left font-semibold text-gray-600 sticky left-0 bg-gray-100 z-10">
                    Posto
                  </th>
                  {days.map((day) => {
                    const date = new Date(day + "T00:00:00");
                    const dayOfMonth = date
                      .getDate()
                      .toString()
                      .padStart(2, "0");
                    const dayOfWeek = date.toLocaleDateString("pt-BR", {
                      weekday: "short",
                    });
                    return (
                      <th
                        key={day}
                        className="p-2 border text-center font-semibold text-gray-600"
                      >
                        <div>{dayOfWeek.replace(".", "")}</div>
                        <div>{dayOfMonth}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {posts
                  .sort((a, b) => a.order - b.order)
                  .map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10">
                        {post.name}
                      </td>
                      {days.map((day) => (
                        <td key={day} className="p-1 border">
                          <input
                            type="number"
                            min="0"
                            value={capacityMatrix[post.id]?.[day] || ""}
                            onChange={(e) =>
                              handleCapacityChange(
                                post.id,
                                day,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-16 text-center p-1 border-gray-300 rounded-md"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
      case 3:
        return (
          <div className="overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-700">
              3. Folgas Solicitadas
            </h2>
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border text-left font-semibold text-gray-600 sticky left-0 bg-gray-100 z-10">
                    Salva-Vidas
                  </th>
                  {days.map((day) => {
                    const date = new Date(day + "T00:00:00");
                    const dayOfMonth = date
                      .getDate()
                      .toString()
                      .padStart(2, "0");
                    return (
                      <th
                        key={day}
                        className="p-2 border text-center font-semibold text-gray-600"
                      >
                        {dayOfMonth}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {lifeguards
                  .sort((a, b) => a.rank - b.rank)
                  .map((lifeguard) => (
                    <tr key={lifeguard.id} className="hover:bg-gray-50">
                      <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10">
                        <span className="font-bold text-gray-500">
                          {lifeguard.rank}º
                        </span>{" "}
                        {lifeguard.name}
                      </td>
                      {days.map((day) => (
                        <td key={day} className="p-1 border text-center">
                          <input
                            type="checkbox"
                            checked={!!requestedDaysOff[lifeguard.id]?.[day]}
                            onChange={(e) =>
                              handleDayOffChange(
                                lifeguard.id,
                                day,
                                e.target.checked
                              )
                            }
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        );
      case 4:
        return (
          <div className="text-center p-8 flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Tudo Pronto!
            </h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Todas as configurações foram preenchidas. Clique no botão "Gerar
              Escala" abaixo para ver a mágica acontecer.
            </p>
          </div>
        );
      default:
        return <div>Passo inválido</div>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold text-gray-800 text-center mb-4">Gerador de Escala</h1>
      <Stepper steps={steps} currentStep={currentStep} />
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md min-h-[400px] flex flex-col justify-center">
        {renderStepContent()}
      </div>
      <div className="mt-8 flex justify-between items-center">
        <button onClick={goToPreviousStep} disabled={currentStep === 1} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">Voltar</button>
        
        <div className="flex items-center space-x-4">
          {finalSchedule && (
            <button
              onClick={handleSaveToHistory}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Salvar no Histórico
            </button>
          )}

          {currentStep < steps.length ? (
            <button onClick={goToNextStep} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Próximo</button>
          ) : (
            <button onClick={handleGenerateSchedule} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg text-lg">Gerar Escala</button>
          )}
        </div>
      </div>

      {finalSchedule && (
        <div className="mt-12 space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
            <h2 className="text-2xl font-bold mb-4 text-green-800">
              Visão Geral da Quinzena
            </h2>
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border text-left font-semibold text-gray-600 sticky left-0 bg-gray-100 z-10">
                    Salva-Vidas
                  </th>
                  {days.map((day) => {
                    const date = new Date(day + "T00:00:00");
                    const dayOfMonth = date
                      .getDate()
                      .toString()
                      .padStart(2, "0");
                    return (
                      <th
                        key={day}
                        className="p-2 border text-center font-semibold text-gray-600"
                      >
                        {dayOfMonth}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {lifeguards
                  .sort((a, b) => a.rank - b.rank)
                  .map((lifeguard) => {
                    const dailyStatuses = days.map((day) => {
                      if (requestedDaysOff[lifeguard.id]?.[day])
                        return {
                          status: "FS",
                          style: "bg-yellow-200 text-yellow-800",
                        };
                      if (assignedFCs?.[lifeguard.id]?.[day])
                        return {
                          status: "FC",
                          style: "bg-orange-200 text-orange-800",
                        };
                      const isWorking = Object.values(
                        finalSchedule[day] || {}
                      ).some((postStaff) =>
                        postStaff.some((lg) => lg.id === lifeguard.id)
                      );
                      if (isWorking)
                        return {
                          status: "T",
                          style: "bg-green-200 text-green-800",
                        };
                      return { status: "-", style: "bg-gray-50" };
                    });
                    return (
                      <tr key={lifeguard.id} className="hover:bg-gray-50">
                        <td className="p-2 border font-medium text-gray-800 sticky left-0 bg-white hover:bg-gray-50 z-10">
                          <span className="font-bold text-gray-500">
                            {lifeguard.rank}º
                          </span>{" "}
                          {lifeguard.name}
                        </td>
                        {dailyStatuses.map((dayStatus, index) => (
                          <td
                            key={days[index]}
                            className={`p-2 border text-center font-bold ${dayStatus.style}`}
                          >
                            {dayStatus.status}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto mt-8">
            <h2 className="text-2xl font-bold mb-4 text-blue-800">
              Previsão Guarda-Vidas
            </h2>
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-blue-100">
                <tr>
                  <th className="p-2 border text-left font-semibold text-blue-900">
                    Posto
                  </th>
                  <th className="p-2 border text-left font-semibold text-blue-900">
                    Rank
                  </th>
                  <th className="p-2 border text-left font-semibold text-blue-900 w-48">
                    GVC
                  </th>
                  {days.map((day) => {
                    const date = new Date(day + "T00:00:00");
                    const dayOfMonth = date
                      .getDate()
                      .toString()
                      .padStart(2, "0");
                    const dayOfWeek = date.toLocaleDateString("pt-BR", {
                      weekday: "short",
                    });
                    return (
                      <th
                        key={day}
                        className="p-2 border text-center font-semibold text-blue-900"
                      >
                        <div>{dayOfWeek.replace(".", "")}</div>
                        <div>{dayOfMonth}</div>
                      </th>
                    );
                  })}
                  <th className="p-2 border text-center font-semibold text-blue-900">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts
                  .sort((a, b) => a.order - b.order)
                  .map((post) => (
                    <React.Fragment key={post.id}>
                      {(lifeguardsByPost[post.id] || []).map((lifeguard) => {
                        const workScheduleMap = new Map<string, string>();
                        for (const day of days) {
                          for (const postId in finalSchedule[day]) {
                            if (
                              finalSchedule[day][postId].some(
                                (lg) => lg.id === lifeguard.id
                              )
                            ) {
                              workScheduleMap.set(day, postId);
                              break;
                            }
                          }
                        }

                        return (
                          <tr key={lifeguard.id} className="hover:bg-gray-50">
                            <td className="p-2 border font-bold text-gray-800">
                              {post.name}
                            </td>
                            <td className="p-2 border text-center">
                              {lifeguard.rank}º
                            </td>
                            <td className="p-2 border">{lifeguard.name}</td>
                            {days.map((day) => {
                              const workingPostId = workScheduleMap.get(day);
                              let cellContent = "--";

                              if (workingPostId) {
                                if (workingPostId === post.id) {
                                  cellContent = "X";
                                } else {
                                  const workingPost =
                                    postsById.get(workingPostId);
                                  cellContent = `X P${
                                    workingPost?.order || "?"
                                  }`;
                                }
                              }

                              return (
                                <td
                                  key={day}
                                  className="p-2 border text-center font-mono"
                                >
                                  {cellContent}
                                </td>
                              );
                            })}
                            <td className="p-2 border text-center font-bold bg-gray-100">
                              {workScheduleMap.size}
                            </td>
                          </tr>
                        );
                        <h2>Total GVC no {post.name}</h2>;
                      })}
                      <tr className="bg-gray-200 font-bold">
                        <td colSpan={3} className="p-2 border text-right"></td>
                        {days.map((day) => {
                          const dailyTotal =
                            finalSchedule[day]?.[post.id]?.length || 0;
                          const requiredTotal =
                            capacityMatrix[post.id]?.[day] || 0;
                          const isDeficit = dailyTotal < requiredTotal;
                          return (
                            <td
                              key={day}
                              className={`p-2 border text-center ${
                                isDeficit ? "bg-red-200 text-red-800" : ""
                              }`}
                            >
                              {dailyTotal}
                            </td>
                          );
                        })}
                        <td className="p-2 border bg-gray-200"></td>
                      </tr>
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
