export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbeaf0] px-6 text-[#3d2430]">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-[#e8c9d4] bg-[#fff8fb] p-8 text-center shadow-[0_10px_40px_rgba(122,66,88,0.12)]">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#a85c79]" />
        <div className="mx-auto mt-4 h-px w-16 bg-[#c79a6b]" />
        <p className="mt-4 font-medium text-[#3d2430]">Memuat…</p>
        <p className="mt-1 text-sm text-[#a85c79]">Sebentar ya</p>
      </div>
    </div>
  );
}
