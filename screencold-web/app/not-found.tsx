import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-gray-400 mb-8">Page not found</p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
