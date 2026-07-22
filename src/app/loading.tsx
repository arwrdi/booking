export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f0fa] px-6 text-[#3d3550]">
      <div className="w-full max-w-sm rounded-[1.75rem] border border-[#e4dceb] bg-[#fffbfe] p-8 text-center shadow-[0_10px_40px_rgba(107,155,209,0.12)]">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#a8c5e8]" />
        <p className="mt-4 font-medium text-[#3d3550]">Memuat…</p>
        <p className="mt-1 text-sm text-[#7a718c]">Sebentar ya</p>
      </div>
    </div>
  );
}
