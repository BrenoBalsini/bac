import { type BeachPost } from "../../types/BeachPost";

export type EditContext = {
  lifeguardId: string;
  lifeguardName: string;
  day: string;
  preferenceAPostId: string | undefined;
  reasoning: {
    status: string;
    details: string;
  } | null;
};

type EditShiftModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    action: { type: "setDayOff" } | { type: "setWork"; postId: string }
  ) => void;
  context: EditContext | null;
  posts: BeachPost[];
};

export default function EditShiftModal({
  isOpen,
  onClose,
  onSave,
  context,
  posts,
}: EditShiftModalProps) {
  if (!isOpen || !context) {
    return null;
  }

  const preferenceAPost = posts.find((p) => p.id === context.preferenceAPostId);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-xl z-50 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-2">{context.lifeguardName}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Editando dia:{" "}
          {new Date(context.day + "T00:00:00").toLocaleDateString("pt-BR")}
        </p>

        {context.reasoning && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-bold text-sm text-blue-800">
              Justificativa do Sistema:
            </h4>
            <p className="text-sm text-blue-700">
              <strong>{context.reasoning.status}:</strong>{" "}
              {context.reasoning.details}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => onSave({ type: "setDayOff" })}
            className="w-full text-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            Marcar como Folga
          </button>

          {preferenceAPost && (
            <button
              onClick={() =>
                onSave({ type: "setWork", postId: preferenceAPost.id })
              }
              className="w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
            >
              Alocar no PA ({preferenceAPost.name})
            </button>
          )}

          <div className="flex items-center space-x-2">
            <label htmlFor="reallocate-post" className="text-sm font-medium">
              Realocar para:
            </label>
            <select
              id="reallocate-post"
              onChange={(e) =>
                onSave({ type: "setWork", postId: e.target.value })
              }
              className="flex-1 p-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="">Selecione um posto...</option>
              {posts
                .sort((a, b) => a.order - b.order)
                .map((post) => (
                  <option key={post.id} value={post.id}>
                    {post.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
