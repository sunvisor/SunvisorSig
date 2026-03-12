export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl rounded-3xl border border-slate-300/80 bg-white/80 p-10 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-700">
          SunvisorSig
        </p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-950">
          Hello World
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">
          Next.js, Tailwind CSS, Prisma, PostgreSQL, Docker の開発環境を初期化しました。
        </p>
      </section>
    </main>
  );
}
