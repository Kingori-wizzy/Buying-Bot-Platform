export default function Loading() {
  return (
    <main className="page" id="main">
      <div className="stack">
        <div className="skeleton" style={{ height: 28, width: '40%' }} />
        <div className="skeleton" style={{ height: 160 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    </main>
  );
}
