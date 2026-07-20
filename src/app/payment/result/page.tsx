import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro, SiteShell, StateCard } from "@/components/site-shell";

export const metadata: Metadata = {
  title: "Payment Result",
  description: "Hasil redirect pembayaran dari Midtrans.",
};

type PaymentResultPageProps = {
  searchParams: Promise<{
    result?: string;
    order_id?: string;
    status_code?: string;
    transaction_status?: string;
  }>;
};

function getResultCopy(result: string | undefined, transactionStatus: string | undefined) {
  if (result === "finish") {
    return {
      title: "Pembayaran selesai di Midtrans",
      description:
        transactionStatus === "settlement"
          ? "Midtrans mengembalikan status `settlement`. Jika status booking di aplikasi belum berubah, biasanya webhook Midtrans ke backend Anda belum masuk."
          : "Kamu sudah menyelesaikan flow pembayaran di Midtrans. Status final booking tetap ditentukan oleh webhook/notifikasi server-to-server.",
      tone: "default" as const,
    };
  }

  if (result === "unfinish") {
    return {
      title: "Pembayaran belum selesai",
      description:
        "Kamu kembali dari halaman Midtrans sebelum pembayaran dituntaskan. Jika transaksi masih pending, kamu bisa lanjutkan lagi dari halaman booking.",
      tone: "warning" as const,
    };
  }

  return {
    title: "Pembayaran gagal atau dibatalkan",
    description:
      "Midtrans mengembalikan flow pembayaran ke aplikasi dengan status error. Cek kembali booking kamu lalu ulangi pembayaran jika diperlukan.",
    tone: "warning" as const,
  };
}

export default async function PaymentResultPage({
  searchParams,
}: PaymentResultPageProps) {
  const params = await searchParams;
  const copy = getResultCopy(params.result, params.transaction_status);

  return (
    <SiteShell>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Payment Result"
          title={copy.title}
          description="Halaman ini dipakai sebagai tujuan redirect browser dari Midtrans Snap."
          actions={
            <Link
              href="/my-bookings"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Kembali ke booking saya
            </Link>
          }
        />

        <StateCard
          tone={copy.tone}
          title={copy.title}
          description={copy.description}
        />

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <p>Order ID: {params.order_id ?? "-"}</p>
          <p>Status code: {params.status_code ?? "-"}</p>
          <p>Transaction status: {params.transaction_status ?? "-"}</p>
        </div>

        <StateCard
          tone="warning"
          title="Catatan webhook"
          description="Redirect browser dari Midtrans tidak otomatis mengubah status booking di database. Status akan berubah setelah Midtrans memanggil webhook `/api/payments/midtrans/webhook` pada URL publik aplikasi Anda."
        />
      </div>
    </SiteShell>
  );
}
