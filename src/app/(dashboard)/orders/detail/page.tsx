import { Suspense } from "react";

function OrderDetailContent() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Detail Nota Transaksi</h1>
      <p className="text-sm text-slate-500 mt-1">Rincian pesanan, finishing, dan riwayat pembayaran</p>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div>Memuat nota...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
