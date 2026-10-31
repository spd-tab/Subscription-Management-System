import { Button } from '../../../components/common/UI'
import { calculateInvoiceLinesSubtotal } from '../services/calculationUtils'

export default function InvoiceItemsTable({ items, onChange, readOnly = false, currency = 'USD' }) {
  function updateItem(index, field, value) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === 'description' ? value : Number(value) } : item))
  }

  function removeItem(index) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  function addItem() {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function getAmount(item) {
    try {
      return `${currency} ${calculateInvoiceLinesSubtotal([item]).toFixed(2)}`
    } catch {
      return '—'
    }
  }

  return <div className="invoice-items-wrap">
    <table className="invoice-items-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th>{!readOnly && <th />}</tr></thead><tbody>
      {items.map((item, index) => <tr key={`${index}-${item.description}`}>
        <td>{readOnly ? item.description : <input aria-label={`Line ${index + 1} description`} required value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />}</td>
        <td>{readOnly ? item.quantity : <input aria-label={`Line ${index + 1} quantity`} type="number" required min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />}</td>
        <td>{readOnly ? `${currency} ${Number(item.unitPrice).toFixed(2)}` : <input aria-label={`Line ${index + 1} unit price`} type="number" required min="0" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', event.target.value)} />}</td>
        <td>{getAmount(item)}</td>
        {!readOnly && <td><button className="invoice-remove-item" type="button" onClick={() => removeItem(index)} aria-label={`Remove line ${index + 1}`}>×</button></td>}
      </tr>)}
      {!items.length && <tr><td colSpan={readOnly ? 4 : 5} className="feature-empty-cell">No invoice items.</td></tr>}
    </tbody></table>
    {!readOnly && <Button type="button" variant="secondary" onClick={addItem}>Add line item</Button>}
  </div>
}
