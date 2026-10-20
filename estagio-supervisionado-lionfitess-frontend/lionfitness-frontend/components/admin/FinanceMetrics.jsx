export default function FinanceMetrics({items}) {
 return <dl className="gp-finance-metrics" aria-label="Indicadores da base consultada">{items.map(item=><div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>;
}
