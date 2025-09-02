export default function OfflinePage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold mb-2">أنت غير متصل</h1>
        <p className="text-sm opacity-80">
          تقدر تشوف البيانات المخزنة، وبمجرد رجوع الإنترنت هتتحدث تلقائياً.
        </p>
      </div>
    </main>
  );
}
