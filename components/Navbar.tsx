import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow mb-6">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-800">
          Commenter
        </Link>
        <Link 
          href="/admin" 
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300"
        >
          Admin Tools
        </Link>
      </div>
    </nav>
  );
} 