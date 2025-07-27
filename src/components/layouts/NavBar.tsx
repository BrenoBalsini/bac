import { Link } from "react-router";

export default function Navbar() {
  return (
    <header className="bg-gray-800 text-white shadow-lg">
      <nav className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="space-x-4">
          <Link to="/" className="hover:text-gray-300">
            Gerar Escala
          </Link>
          <Link to="/roster" className="hover:text-gray-300">
            Efetivo
          </Link>
          <Link to="/posts" className="hover:text-gray-300">
            Postos
          </Link>
          <Link to="/history" className="hover:text-gray-300">
            Histórico
          </Link>
        </div>
      </nav>
    </header>
  );
}
