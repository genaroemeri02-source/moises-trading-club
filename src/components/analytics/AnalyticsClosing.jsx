export function AnalyticsFinalLine({ reading }) {
  if (!reading?.line) return null;
  return (
    <footer className="analyticsFinalLine">
      <p>{reading.line}</p>
    </footer>
  );
}
