import { useEffect, useState } from 'react';

type Props = { title: string; description: string; load: () => Promise<Record<string, unknown>>; collection: string; emptyMessage: string };
type ApiRecord = Record<string, unknown>;

export function CapabilityCard({ title, description, load, collection, emptyMessage }: Props) {
  const [items, setItems] = useState<ApiRecord[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    load()
      .then((payload) => {
        const result = payload[collection];
        if (!Array.isArray(result)) throw new Error(`Invalid ${collection} response`);
        if (isCurrent) setItems(result as ApiRecord[]);
      })
      .catch(() => {
        if (isCurrent) setHasError(true);
      });

    return () => { isCurrent = false; };
  }, [collection, load]);

  return <section className="card h-100"><div className="card-body"><h2 className="h4">{title}</h2><p>{description}</p>
    {items === null && !hasError && <p role="status">Loading {title.toLowerCase()}...</p>}
    {hasError && <p role="alert">Unable to load {title.toLowerCase()}.</p>}
    {items?.length === 0 && <p>{emptyMessage}</p>}
    {items && items.length > 0 && <ul className="list-group">{items.map((item, index) => <li className="list-group-item" key={String(item._id ?? item.id ?? index)}>
      {Object.entries(item).map(([label, value]) => <span className="me-3" key={label}><strong>{label}:</strong> {Array.isArray(value) ? value.join(', ') : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</span>)}
    </li>)}</ul>}
  </div></section>;
}
