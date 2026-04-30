export default function ImageResult({ result }) {
  if (!result) return null;

  return (
    <div className="space-y-4">
      {/* Annotated image placeholder */}
      <div className="bg-dark-800 border border-dark-500 aspect-video flex items-center justify-center relative overflow-hidden">
        {result.annotated_image_url ? (
          <img
            src={result.annotated_image_url}
            alt="Annotated inventory"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="text-4xl text-dark-400 mb-2">◫</div>
            <p className="text-slate-500 text-xs font-mono">
              {result.filename || "image.jpg"}
            </p>
            <p className="text-slate-600 text-xs font-mono mt-1">
              [annotation overlay pending]
            </p>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-dark-900/80 border border-dark-500 px-2 py-1">
          <span className="text-terminal-green text-xs font-mono">PROCESSED</span>
        </div>
      </div>

      {/* Items detected table */}
      <div className="border border-dark-500">
        <div className="bg-dark-600 px-4 py-2 border-b border-dark-500">
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">
            Detected Items — {result.items?.length ?? 0} item types
          </p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-500">
              <th className="text-left text-xs font-mono text-slate-500 uppercase tracking-widest px-4 py-2">ITEM</th>
              <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-widest px-4 py-2">COUNT</th>
              <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-widest px-4 py-2">CONFIDENCE</th>
              <th className="text-right text-xs font-mono text-slate-500 uppercase tracking-widest px-4 py-2">SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {(result.items || []).map((item, i) => {
              const confPct = Math.round(item.confidence * 100);
              const signalColor = confPct >= 85 ? "text-terminal-green" : confPct >= 70 ? "text-terminal-amber" : "text-terminal-red";
              return (
                <tr key={i} className="border-b border-dark-600 hover:bg-dark-600 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-200">{item.item}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-slate-300 font-bold">{item.count}</td>
                  <td className="px-4 py-3 text-right text-sm font-mono">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-dark-500 h-1">
                        <div
                          className={`h-1 ${confPct >= 85 ? "bg-terminal-green" : confPct >= 70 ? "bg-terminal-amber" : "bg-terminal-red"}`}
                          style={{ width: `${confPct}%` }}
                        />
                      </div>
                      <span className={signalColor}>{confPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-mono ${signalColor}`}>
                      {confPct >= 85 ? "HIGH" : confPct >= 70 ? "MED" : "LOW"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
