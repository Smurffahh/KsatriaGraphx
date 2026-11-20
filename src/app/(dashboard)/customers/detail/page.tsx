import { Suspense } from "react";

function CustomerDetailContent() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Riwayat Pelanggan</h1>
      <p className="text-sm text-slate-500 mt-1">Daftar transaksi dan total piutang pelanggan</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={<div>Memuat pelanggan...</div>}>
      <CustomerDetailContent />
    </Suspense>
  );
}
