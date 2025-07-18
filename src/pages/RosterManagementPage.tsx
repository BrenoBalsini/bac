import { useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { type Lifeguard } from "../types/Lifeguard";
import AddLifeguardModal from "../components/modals/AddLifeguardModal";

const G1_CUTOFF = 15;

const recalculateGroups = (currentLifeguards: Lifeguard[]): Lifeguard[] => {
  return currentLifeguards.map((lifeguard) => ({
    ...lifeguard,
    group: lifeguard.rank <= G1_CUTOFF ? "G1" : "G2",
  }));
};

export default function RosterManagementPage() {
  const [lifeguards, setLifeguards] = useLocalStorage<Lifeguard[]>(
    "bac-roster",
    []
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddLifeguard = (data: { name: string; rank: number }) => {
    const { name, rank } = data;

    const rankExists = lifeguards.some((lifeguard) => lifeguard.rank === rank);

    let updatedList = [...lifeguards];
    if (rankExists) {
      const confirmPush = window.confirm();

      if (!confirmPush) {
        return;
      }

      updatedList = lifeguards.map((lifeguard) => {
        if (lifeguard.rank >= rank) {
          return { ...lifeguard, rank: lifeguard.rank + 1 };
        }
        return lifeguard;
      });
    }

    const newLifeguard: Lifeguard = {
      id: crypto.randomUUID(),
      name,
      rank,
      group: "G2",
    };

    const listWithNewLifeguard = [...updatedList, newLifeguard];

    const finalRecalculatedList = recalculateGroups(listWithNewLifeguard);

    setLifeguards(finalRecalculatedList);
  };

  const handleDeleteLifeguard = (idToDelete: string) => {
    const lifeguardToDelete = lifeguards.find(
      (lifeguard) => lifeguard.id === idToDelete
    );
    if (!lifeguardToDelete) return;

    const deletedRank = lifeguardToDelete.rank;

    const filteredList = lifeguards.filter(
      (lifeguard) => lifeguard.id !== idToDelete
    );

    const updatedList = filteredList.map((lifeguard) => {
      if (lifeguard.rank > deletedRank) {
        return { ...lifeguard, rank: lifeguard.rank - 1 };
      }
      return lifeguard;
    });

    const finalRecalculatedList = recalculateGroups(updatedList);

    setLifeguards(finalRecalculatedList);
  };

  const maxRank = lifeguards.reduce((max, lifeguard) => {
    return lifeguard.rank > max ? lifeguard.rank : max;
  }, 0);

  const nextAvailableRank = maxRank + 1;

  return (
    <>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Gerenciamento de Efetivo
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            + Adicionar Salva-Vidas
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left">
                  Class.
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left">
                  Nome
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-center">
                  Grupo
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {lifeguards.length > 0 ? (
                lifeguards
                  .sort((a, b) => a.rank - b.rank)
                  .map((lifeguard) => (
                    <tr
                      key={lifeguard.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold">{lifeguard.rank}º</span>
                      </td>
                      <td className="px-5 py-4">{lifeguard.name}</td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`px-3 py-1 font-semibold leading-tight rounded-full text-xs ${
                            lifeguard.group === "G1"
                              ? "bg-green-200 text-green-900"
                              : "bg-yellow-200 text-yellow-900"
                          }`}
                        >
                          {lifeguard.group}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900 font-medium">
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteLifeguard(lifeguard.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-500">
                    Nenhum salva-vidas cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddLifeguardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddLifeguard}
        initialRank={nextAvailableRank}
      />
    </>
  );
}
