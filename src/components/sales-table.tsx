import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, type SortingState, useReactTable } from '@tanstack/react-table';
import { format, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Edit, Eye, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreateSaleForm from './create-sales-form';
import SaleDetailsModal from './models/view-detail-model';
import { saleService, type Sale, type SaleFilters } from '@/services/sale-service';

const columnHelper = createColumnHelper<Sale>();
const toNumber = (value: number) => Number.isFinite(Number(value)) ? Number(value) : 0;

export default function SalesTable() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<SaleFilters>({});
  const [draftFilters, setDraftFilters] = useState<SaleFilters>({});
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', page, pageSize, filters],
    queryFn: () => saleService.getSales({ ...filters, page, limit: pageSize }),
  });
  const { data: allSalesData } = useQuery({
    queryKey: ['sales', 'monthly-summary'],
    queryFn: () => saleService.getSales({ page: 1, limit: 1000 }),
  });
  const monthlySummary = useMemo(() => {
    const currentMonthSales = (allSalesData?.sales ?? []).filter((sale) => isSameMonth(new Date(sale.saleDate), new Date()));
    return currentMonthSales.reduce((summary, sale) => ({
      totalSales: summary.totalSales + 1,
      totalRevenue: summary.totalRevenue + toNumber(sale.totalAmount),
      totalProfit: summary.totalProfit + toNumber(sale.totalProfit),
    }), { totalSales: 0, totalRevenue: 0, totalProfit: 0 });
  }, [allSalesData]);
  const deleteMutation = useMutation({
    mutationFn: saleService.deleteSale,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sales'] }); toast.success('Sale deleted successfully'); setDeleteId(null); },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? 'Failed to delete sale'),
  });

  const columns = useMemo(() => [
    columnHelper.accessor('saleDate', { header: 'Date', cell: (info) => format(new Date(info.getValue()), 'dd/MM/yyyy') }),
    columnHelper.accessor('customerName', { header: 'Customer Name' }),
    columnHelper.accessor('customerContact', { header: 'Contact Number' }),
    columnHelper.accessor('city', { header: 'City' }),
    columnHelper.accessor('totalAmount', { header: 'Total Amount', cell: (info) => `$${toNumber(info.getValue()).toFixed(2)}` }),
    columnHelper.accessor('totalProfit', { header: 'Total Profit', cell: (info) => <span className="text-green-600">${toNumber(info.getValue()).toFixed(2)}</span> }),
    columnHelper.accessor('trackingNumber', { header: 'Tracking Number' }),
    columnHelper.accessor('courierName', { header: 'Courier Name' }),
    columnHelper.display({ id: 'actions', header: 'Actions', cell: (info) => <div className="flex gap-1"><Button aria-label="View sale" variant="ghost" size="icon" onClick={() => { setSelectedSale(info.row.original); setIsDetailsOpen(true); }}><Eye className="h-4 w-4" /></Button><Button aria-label="Edit sale" variant="ghost" size="icon" onClick={() => { setSelectedSale(info.row.original); setIsEditOpen(true); }}><Edit className="h-4 w-4" /></Button><Button aria-label="Delete sale" variant="ghost" size="icon" onClick={() => setDeleteId(info.row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div> }),
  ], []);
  const table = useReactTable({ data: salesData?.sales ?? [], columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), manualPagination: true, pageCount: salesData?.totalPages ?? 0 });
  const applyFilters = () => {
    const nextFilters = Object.fromEntries(Object.entries(draftFilters).filter(([, value]) => value)) as SaleFilters;
    if (nextFilters.city) nextFilters.city = nextFilters.city.trim().toUpperCase();
    if (nextFilters.customerName) nextFilters.customerName = nextFilters.customerName.trim();
    if (nextFilters.customerContact) nextFilters.customerContact = nextFilters.customerContact.trim();
    setFilters(nextFilters);
    setPage(1);
  };
  const resetFilters = () => { setDraftFilters({}); setFilters({}); setPage(1); };

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>;
  return <><div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{([['Total Sales', monthlySummary.totalSales.toString()], ['Total Revenue', `$${monthlySummary.totalRevenue.toFixed(2)}`], ['Total Profit', `$${monthlySummary.totalProfit.toFixed(2)}`]] as const).map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label} — Current Month</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{value}</p></CardContent></Card>)}</div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6"><Input type="date" aria-label="Filter by sale date" value={draftFilters.saleDate ?? ''} onChange={(event) => setDraftFilters((current) => ({ ...current, saleDate: event.target.value }))} /><Input placeholder="Customer name" value={draftFilters.customerName ?? ''} onChange={(event) => setDraftFilters((current) => ({ ...current, customerName: event.target.value }))} /><Input placeholder="Contact number" value={draftFilters.customerContact ?? ''} onChange={(event) => setDraftFilters((current) => ({ ...current, customerContact: event.target.value }))} /><Input placeholder="City" value={draftFilters.city ?? ''} onChange={(event) => setDraftFilters((current) => ({ ...current, city: event.target.value }))} /><Button onClick={applyFilters}>Apply Filters</Button><Button variant="outline" onClick={resetFilters}>Reset</Button></div>
    <div className="overflow-x-auto rounded-md border"><Table><TableHeader>{table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="text-center">No sales found</TableCell></TableRow>}</TableBody></Table></div>
    {salesData && salesData.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, salesData.total)} of {salesData.total}</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-sm">Page {page} of {salesData.totalPages}</span><Button variant="outline" size="sm" disabled={page >= salesData.totalPages} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="h-4 w-4" /></Button><Input className="w-20" type="number" min="1" value={pageSize} onChange={(event) => { setPageSize(Math.max(1, Number(event.target.value) || 10)); setPage(1); }} /></div></div>}
  </div>
  {selectedSale && <><SaleDetailsModal open={isDetailsOpen} onOpenChange={setIsDetailsOpen} sale={selectedSale} /><CreateSaleForm open={isEditOpen} onOpenChange={setIsEditOpen} editSale={selectedSale} /></>}
  <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this sale?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
