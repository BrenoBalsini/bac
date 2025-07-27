import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { type SavedSchedule } from "../types/SavedSchedule";
import { type Lifeguard } from "../types/Lifeguard";
import { type BeachPost } from "../types/BeachPost";
import EditShiftModal, {
  type EditContext,
} from "../components/modals/EditShiftModal";

export default function ScheduleViewerPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();

  const [scheduleHistory, setScheduleHistory] = useLocalStorage<
    SavedSchedule[]
  >("bac-schedule-history", []);
  const [posts] = useLocalStorage<BeachPost[]>("bac-posts", []);
  const [lifeguards] = useLocalStorage<Lifeguard[]>("bac-roster", []);

  const [scheduleData, setScheduleData] = useState<SavedSchedule | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<EditContext | null>(
    null
  );

  useEffect(() => {
    const data = scheduleHistory.find((s) => s.id === scheduleId);
    if (data) {
      setScheduleData(JSON.parse(JSON.stringify(data)));
    } else {
      alert("Escala não encontrada!");
      navigate("/history");
    }
  }, [scheduleId, scheduleHistory, navigate]);

  const handleCellClick = (lifeguard: Lifeguard, day: string) => {
    const reasoning =
      scheduleData?.outputs.reasoningLog?.[lifeguard.id]?.[day] || null;

    setEditingContext({
      lifeguardId: lifeguard.id,
      lifeguardName: lifeguard.name,
      day,
      preferenceAPostId: lifeguard.preferenceA_id,
      reasoning,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateShift = (
    action: { type: "setDayOff" } | { type: "setWork"; postId: string }
  ) => {
    if (!scheduleData || !editingContext) return;

    const { lifeguardId, day } = editingContext;
    const newSchedule = { ...scheduleData.outputs.schedule };
    const newLog = { ...scheduleData.outputs.reasoningLog };

    for (const postId in newSchedule[day]) {
      newSchedule[day][postId] = newSchedule[day][postId].filter(
        (lg) => lg.id !== lifeguardId
      );
    }

    if (!newLog[lifeguardId]) newLog[lifeguardId] = {};

    if (action.type === "setWork") {
      const lifeguard = lifeguards.find((lg) => lg.id === lifeguardId);
      if (lifeguard) {
        if (!newSchedule[day][action.postId]) {
          newSchedule[day][action.postId] = [];
        }
        newSchedule[day][action.postId].push(lifeguard);

        const postName = posts.find((p) => p.id === action.postId)?.name || "";
        newLog[lifeguardId][day] = {
          status: "Edição Manual",
          details: `Alocado manualmente no ${postName}.`,
        };
      }
    } else {
      newLog[lifeguardId][day] = {
        status: "Edição Manual",
        details: "Definido como folga manualmente.",
      };
    }

    setScheduleData({
      ...scheduleData,
      outputs: {
        ...scheduleData.outputs,
        schedule: newSchedule,
        reasoningLog: newLog,
      },
    });

    setIsEditModalOpen(false);
  };

  const handleSaveAsCopy = () => {
    if (!scheduleData) return;
    const newName = `${
      scheduleData.name
    } - Cópia Editada ${new Date().toLocaleTimeString("pt-BR")}`;
    const newSavedSchedule: SavedSchedule = {
      ...scheduleData,
      id: crypto.randomUUID(),
      name: newName,
      savedAt: new Date().toISOString(),
    };
    setScheduleHistory([...scheduleHistory, newSavedSchedule]);
    alert(`Cópia "${newName}" salva com sucesso!`);
    navigate("/history");
  };

  const days = useMemo(() => {
    if (!scheduleData) return [];
    const allDays = [];
    const currentDate = new Date(scheduleData.inputs.startDate + "T00:00:00");
    const lastDate = new Date(scheduleData.inputs.endDate + "T00:00:00");
    while (currentDate <= lastDate) {
      allDays.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return allDays;
  }, [scheduleData]);

  const lifeguardsByPost = useMemo(() => {
    const grouped: { [postId: string]: Lifeguard[] } = {};
    const unassigned: Lifeguard[] = [];
    for (const lifeguard of lifeguards) {
      const prefA = lifeguard.preferenceA_id;
      if (prefA && posts.some((p) => p.id === prefA)) {
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
  }, [lifeguards, posts]);

  const postsById = useMemo(() => {
    const map = new Map<string, BeachPost>();
    posts.forEach((post) => map.set(post.id, post));
    return map;
  }, [posts]);

  if (!scheduleData) {
    return (
      <div className="container mx-auto p-6 text-center">
        Carregando escala...
      </div>
    );
  }

  const { schedule: finalSchedule } = scheduleData.outputs;
  const { capacityMatrix } = scheduleData.inputs;

  return (
    <>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {scheduleData.name}
            </h1>
            <p className="text-sm text-gray-500">
              Salva em: {new Date(scheduleData.savedAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/history")}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Voltar
            </button>
            <button
              onClick={handleSaveAsCopy}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
            >
              Salvar como Nova Versão
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto mt-8">
          <h2 className="text-2xl font-bold mb-4 text-blue-800">
            Previsão Guarda-Vidas (Editável)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Clique em qualquer célula (X ou --) para fazer um ajuste manual.
          </p>
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
                  const dayOfMonth = date.getDate().toString().padStart(2, "0");
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
                                cellContent = `X P${workingPost?.order || "?"}`;
                              }
                            }

                            return (
                              <td
                                key={day}
                                className="p-2 border text-center font-mono cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => handleCellClick(lifeguard, day)}
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
                    })}
                    <tr className="bg-gray-200 font-bold">
                      <td colSpan={3} className="p-2 border text-right">
                        Total GVC no {post.name}
                      </td>
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

      <EditShiftModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateShift}
        context={editingContext}
        posts={posts}
      />
    </>
  );
}
