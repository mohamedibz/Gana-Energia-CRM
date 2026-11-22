import type { BreakdownItem } from '../api/types';
import { formatScore } from '../format';

// Muestra cómo se obtiene la puntuación: cada criterio aporta valoración × peso / 100
export function ScoreBreakdown({ items, total }: { items: BreakdownItem[]; total: number | null }) {
  return (
    <div className="breakdown-wrap">
      <table className="table breakdown">
        <thead>
          <tr>
            <th>Criterio</th>
            <th className="num">Valoración</th>
            <th className="num">Peso</th>
            <th className="num">Aporte</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.criterio}>
              <td>{item.criterio}</td>
              <td className="num">{item.valoracion} / 100</td>
              <td className="num">{item.peso} %</td>
              <td className="num">
                {formatScore(item.aporte)}
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${Math.min(item.aporte, 100)}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>Puntuación total</th>
            <th className="num">{formatScore(total)}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
