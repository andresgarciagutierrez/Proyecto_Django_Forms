import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col overflow-x-hidden">

      <Navbar />

      <main className="flex-1 w-full">
        {children}
      </main>

    </div>
  );
}