import { useLocalStorage } from "../hooks/useLocalStorage";
import { type SavedSchedule } from "../types/SavedSchedule";
import { Link } from "react-router";
import React from "react";

export default function ScheduleHistoryPage() {
  const [scheduleHistory, setScheduleHistory] = useLocalStorage<
    SavedSchedule[]
  >("bac-schedule-history", []);

  const hadleDeleteScheduleFromHistory = (scheduleIdToDelete: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (window.confirm("Tem certeza que deseja excluir esta escala?")) {
      const updatedScheduleHistory = scheduleHistory.filter(
        (schedule) => schedule.id !== scheduleIdToDelete
      );
      setScheduleHistory(updatedScheduleHistory);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Histórico de Escalas
        </h1>
      </div>

      <div className="bg-white shadow-md rounded-lg">
        <ul className="divide-y divide-gray-200">
          {scheduleHistory.length > 0 ? (
            [...scheduleHistory].reverse().map((schedule) => (
              <li key={schedule.id}>
                {" "}
                <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition group">
                  <Link to={`/history/${schedule.id}`} className="flex-1">
                    <div>
                      <p className="text-lg font-semibold text-blue-600 truncate group-hover:underline">
                        {schedule.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Salva em:{" "}
                        {new Date(schedule.savedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={(event) => hadleDeleteScheduleFromHistory(schedule.id, event)}
                    className="ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="p-6 text-center text-gray-500">
              Nenhuma escala salva no histórico ainda.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
