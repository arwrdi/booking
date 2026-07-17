export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="w-full max-w-md rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Memuat halaman</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Mengambil data terbaru dari Supabase untuk katalog dan slot availability.
        </p>
      </div>
    </div>
  );
}
