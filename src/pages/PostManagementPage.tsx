import { useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { type BeachPost } from "../types/BeachPost";
import AddPostModal from "../components/modals/AddPostModal";

export default function PostManagementPage() {
  const [posts, setPosts] = useLocalStorage<BeachPost[]>("bac-posts", []);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddPost = (data: { name: string; order: number }) => {
    const { name, order } = data;

    const nameExists = posts.some(
      (post) => post.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (nameExists) {
      alert(`Erro: O posto "${name}" já está cadastrado.`);
      return;
    }

    const orderExists = posts.some((post) => post.order === order);
    if (orderExists) {
      alert(`Erro: A ordem "${order}" já está em uso por outro posto.`);
      return;
    }

    const newPost: BeachPost = {
      id: crypto.randomUUID(),
      name: name.trim(),
      order,
    };

    setPosts([...posts, newPost]);
  };

  const handleDeletePost = (idToDelete: string) => {
    if (window.confirm("Tem certeza que deseja excluir este posto?")) {
      const updatedPosts = posts.filter((post) => post.id !== idToDelete);
      setPosts(updatedPosts);
    }
  };

  return (
    <>
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Gerenciamento de Postos
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
          >
            + Adicionar Posto
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
              <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left">
                  Ordem
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-left">
                  Nome do Posto
                </th>
                <th className="px-5 py-3 border-b-2 border-gray-200 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.length > 0 ? (
                posts
                  .sort((a, b) => a.order - b.order)
                  .map((post) => (
                    <tr
                      key={post.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium">{post.order}</td>
                      <td className="px-5 py-4">{post.name}</td>
                      <td className="px-5 py-4 text-center space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900 font-medium">
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-500">
                    Nenhum posto cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddPost}
      />
    </>
  );
}
