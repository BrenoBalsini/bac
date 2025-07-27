import { useLocalStorage } from "../hooks/useLocalStorage";
import { type SavedSchedule } from "../types/SavedSchedule";
import { Link } from "react-router";

export default function ScheduleHistoryPage() {
  const [scheduleHistory] = useLocalStorage<SavedSchedule[]>(
    "bac-schedule-history",
    []
  );

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
                <Link
                  to={`/history/${schedule.id}`}
                  className="block p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-blue-600 truncate">
                      {schedule.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Salva em:{" "}
                      {new Date(schedule.savedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </Link>
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
