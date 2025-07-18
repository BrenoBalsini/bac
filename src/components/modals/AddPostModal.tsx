import React, { useState, useEffect, useRef } from "react";

type FormData = {
  name: string;
  order: number;
};

type AddPostModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: FormData) => void;
};

export default function AddPostModal({
  isOpen,
  onClose,
  onAdd,
}: AddPostModalProps) {
  const [formData, setFormData] = useState<FormData>({ name: "", order: 1 });
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: "", order: 1 });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

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
      [name]: name === "order" ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.order <= 0) {
      alert("Por favor, preencha um nome válido e uma ordem maior que zero.");
      return;
    }
    onAdd(formData);

    alert(`Posto "${formData.name}" cadastrado com sucesso!`);
    setFormData({ name: "", order: formData.order + 1 });
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
        <h2 className="text-2xl font-bold mb-4">Adicionar Novo Posto</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="post-name"
              className="block text-gray-700 font-bold mb-2"
            >
              Nome do Posto
            </label>
            <input
              ref={nameInputRef}
              type="text"
              id="post-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="post-order"
              className="block text-gray-700 font-bold mb-2"
            >
              Ordem na Praia (ex: 1, 2, 3...)
            </label>
            <input
              type="number"
              id="post-order"
              name="order"
              value={formData.order}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>

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
