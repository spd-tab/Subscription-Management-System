import { useState } from 'react'
import { X, Search, ChevronLeft, ChevronRight, AlertCircle, LoaderCircle, Inbox } from 'lucide-react'

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

export function PrimaryButton(props) {
  return <Button {...props} variant="primary" />
}

export function SecondaryButton(props) {
  return <Button {...props} variant="secondary" />
}

export function StatusBadge({ children }) {
  const tone = /overdue|issue|failed/i.test(children) ? 'danger' : /pending|draft|quotation|invited/i.test(children) ? 'warning' : 'success'
  return <span className={`status-badge ${tone}`}>{children}</span>
}

export function MetricCard({ label, value, delta, tone }) {
  return <section className={`metric-card ${tone === 'danger' ? 'metric-danger' : ''}`}><span className="metric-label">{label}</span><strong>{value}</strong><small>{delta}</small></section>
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return <label className="search-bar"><Search size={19} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>
}

export function FilterDropdown({ value, onChange, options, label = 'Filter records' }) {
  return <label className="filter-dropdown"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

export function DataTable({ columns, rows, renderCell, renderActions, emptyText = 'No records to display.' }) {
  return <div className="data-table-scroll"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}{renderActions && <th />}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={row.id ?? `${row[0]}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{renderCell ? renderCell(cell, row, cellIndex, rowIndex) : cell}</td>)}{renderActions && <td>{renderActions(row, rowIndex)}</td>}</tr>) : <tr><td colSpan={columns.length + (renderActions ? 1 : 0)} className="empty-state">{emptyText}</td></tr>}</tbody></table></div>
}

export function FormInput({ label, id, ...props }) {
  return <label className="form-field" htmlFor={id}>{label}<input id={id} {...props} /></label>
}

export function SelectInput({ label, id, options, ...props }) {
  return <label className="form-field" htmlFor={id}>{label}<select id={id} {...props}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}

export function DatePicker({ label = 'Date', id, ...props }) {
  return <FormInput id={id} label={label} type="date" {...props} />
}

export function EmptyState({ title = 'Nothing here yet', description }) {
  return <div className="empty-state"><Inbox size={22} /><strong>{title}</strong>{description && <span>{description}</span>}</div>
}

export function LoadingState({ label = 'Loading...' }) {
  return <div className="state-message"><LoaderCircle size={19} className="loading-icon" />{label}</div>
}

export function ErrorState({ message = 'Something went wrong. Please try again.' }) {
  return <div className="state-message error-state"><AlertCircle size={19} />{message}</div>
}

export function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><h2 id="modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>{children}</section></div>
}

export function ConfirmationDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onClose }) {
  return <Modal title={title} onClose={onClose}><div className="confirmation-content"><p>{message}</p><div><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton onClick={onConfirm}>{confirmLabel}</PrimaryButton></div></div></Modal>
}

export function Pagination({ page, pages, onChange }) {
  return <div className="pagination"><span>Page {page} of {pages}</span><div><button className="icon-button" disabled={page <= 1} aria-label="Previous page" onClick={() => onChange(page - 1)}><ChevronLeft size={18} /></button><button className="icon-button" disabled={page >= pages} aria-label="Next page" onClick={() => onChange(page + 1)}><ChevronRight size={18} /></button></div></div>
}

export function useModal() {
  const [open, setOpen] = useState(false)
  return { open, show: () => setOpen(true), close: () => setOpen(false) }
}
