import React, { useState, useEffect, useRef } from "react";

type AddLifeguardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; rank: number }) => void;
  initialRank: number;
};

type FormData = {
  name: string;
  rank: number;
};

export default function AddLifeguardModal({
  isOpen,
  onClose,
  onAdd,
  initialRank,
}: AddLifeguardModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    rank: initialRank,
  });
  const [error, setError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        rank: initialRank,
      });
      setError("");
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen, initialRank]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: name === "rank" ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.rank <= 0) {
      setError("Por favor, preencha o nome e uma classificação válida.");
      return;
    }

    onAdd(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl z-50 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4">Adicionar Novo Salva-Vidas</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-gray-700 font-bold mb-2"
            >
              Nome
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="rank"
              className="block text-gray-700 font-bold mb-2"
            >
              Classificação (Rank)
            </label>
            <input
              type="number"
              id="rank"
              name="rank"
              value={formData.rank}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 font-bold py-2 px-4 rounded"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Salvar e Adicionar Próximo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
