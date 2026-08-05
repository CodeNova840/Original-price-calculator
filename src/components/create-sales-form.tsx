import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { z } from 'zod';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { productService } from '@/services/product-service';
import { saleService, type Sale } from '@/services/sale-service';

const numberField = (minimum: number, message: string) =>
  z.number().finite('Enter a valid number').min(minimum, message);

const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: numberField(0.01, 'Quantity must be greater than 0'),
  quantityType: z.enum(['gram', 'kilogram']),
  itemPrice: numberField(0, 'Item price cannot be negative'),
  itemTotal: numberField(0, 'Item total cannot be negative'),
  itemProfit: numberField(0, 'Item profit cannot be negative'),
});

const saleSchema = z.object({
  saleDate: z.string().min(1, 'Sale date is required'),
  customerName: z.string().trim().min(1, 'Customer name is required'),
  customerContact: z.string().trim().min(1, 'Contact number is required'),
  trackingNumber: z.string().trim().min(1, 'Tracking number is required'),
  courierName: z.string().trim().min(1, 'Courier name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  city: z.string().trim().min(1, 'City is required'),
  deliveryCharges: numberField(0, 'Delivery charges cannot be negative'),
  items: z.array(saleItemSchema).min(1, 'At least one product is required'),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface CreateSaleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSale?: Sale;
}

const emptyItem: SaleFormData['items'][number] = {
  productId: '', quantity: 1, quantityType: 'kilogram', itemPrice: 0, itemTotal: 0, itemProfit: 0,
};

const defaultValues = (): SaleFormData => ({
  saleDate: format(new Date(), 'yyyy-MM-dd'), customerName: '', customerContact: '', trackingNumber: '',
  courierName: '', address: '', city: '', deliveryCharges: 0, items: [{ ...emptyItem }],
});

const asNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: number) => Math.round(value * 100) / 100;

export default function CreateSaleForm({ open, onOpenChange, editSale }: CreateSaleFormProps) {
  const queryClient = useQueryClient();
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productService.getProducts });
  const { register, control, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema), defaultValues: defaultValues(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });
  const deliveryCharges = useWatch({ control, name: 'deliveryCharges' }) ?? 0;

  const totalProductAmount = useMemo(
    () => money((items ?? []).reduce((sum, item) => sum + asNumber(item?.itemTotal), 0)), [items],
  );
  const totalProfit = useMemo(
    () => money((items ?? []).reduce((sum, item) => sum + asNumber(item?.itemProfit), 0)), [items],
  );
  const totalAmount = money(totalProductAmount + asNumber(deliveryCharges));

  const updateQuantityOrPrice = (index: number, field: 'quantity' | 'itemPrice', value: number) => {
    const item = getValues(`items.${index}`);
    const nextItem = { ...item, [field]: value };
    setValue(`items.${index}.${field}`, value, { shouldDirty: true, shouldValidate: true });
    setValue(`items.${index}.itemTotal`, money(asNumber(nextItem.quantity) * asNumber(nextItem.itemPrice)), { shouldDirty: true, shouldValidate: true });
  };

  const updateProduct = (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId, { shouldDirty: true, shouldValidate: true });
  };

  const updateQuantityType = (index: number, quantityType: 'gram' | 'kilogram') => {
    setValue(`items.${index}.quantityType`, quantityType, { shouldDirty: true });
  };

  const saveSale = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: FormData }) => id ? saleService.updateSale(id, data) : saleService.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success(editSale ? 'Sale updated successfully' : 'Sale created successfully');
      closeModal();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message ?? 'Failed to save sale'),
  });

  useEffect(() => {
    if (!open) return;
    if (!editSale) {
      reset(defaultValues());
      return;
    }
    const editItems = editSale.items ?? [];
    reset({
      saleDate: format(new Date(editSale.saleDate), 'yyyy-MM-dd'),
      customerName: editSale.customerName, customerContact: editSale.customerContact,
      trackingNumber: editSale.trackingNumber, courierName: editSale.courierName,
      address: editSale.address, city: editSale.city, deliveryCharges: asNumber(editSale.deliveryCharges),
      items: editItems.length ? editItems.map((item) => ({
        productId: String(item.productId), quantity: asNumber(item.quantity), quantityType: item.quantityType,
        itemPrice: asNumber(item.itemPrice), itemTotal: asNumber(item.itemTotal), itemProfit: asNumber(item.itemProfit),
      })) : [{ ...emptyItem }],
    });
  }, [editSale, open, reset]);

  const onSubmit = (data: SaleFormData) => {
    const formData = new FormData();
    formData.append('saleDate', data.saleDate);
    formData.append('customerName', data.customerName.trim());
    formData.append('customerContact', data.customerContact.trim());
    formData.append('trackingNumber', data.trackingNumber.trim());
    formData.append('courierName', data.courierName.trim());
    formData.append('address', data.address.trim().toUpperCase());
    formData.append('city', data.city.trim().toUpperCase());
    formData.append('deliveryCharges', money(data.deliveryCharges).toFixed(2));
    formData.append('totalAmount', totalAmount.toFixed(2));
    formData.append('totalProfit', totalProfit.toFixed(2));
    formData.append('items', JSON.stringify(data.items.map((item) => ({
      productId: Number(item.productId), quantity: money(item.quantity), quantityType: item.quantityType,
      itemPrice: money(item.itemPrice), itemTotal: money(item.itemTotal), itemProfit: money(item.itemProfit),
    }))));
    if (receiptFile) formData.append('receiptImage', receiptFile);
    saveSale.mutate({ id: editSale?.id, data: formData });
  };

  const handleReceiptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return void toast.error('Please select an image file');
    if (file.size > 5 * 1024 * 1024) return void toast.error('File size must be less than 5MB');
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  };

  const closeModal = () => {
    setReceiptPreview(null);
    setReceiptFile(null);
    reset(defaultValues());
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) closeModal(); else onOpenChange(true); }}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editSale ? 'Edit Sale' : 'Create New Sale'}</DialogTitle><DialogDescription>Fill in the sale details below.</DialogDescription></DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-4"><h3 className="text-lg font-semibold">Customer Information</h3><div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {([['saleDate', 'Sale Date', 'date'], ['customerName', 'Customer Name', 'text'], ['customerContact', 'Contact Number', 'text'], ['trackingNumber', 'Tracking Number', 'text'], ['courierName', 'Courier Name', 'text'], ['city', 'City', 'text']] as const).map(([name, label, type]) => <div key={name}><Label htmlFor={name}>{label}</Label><Input id={name} type={type} {...register(name)} />{errors[name] && <p className="mt-1 text-sm text-destructive">{errors[name]?.message}</p>}</div>)}
          <div className="md:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" {...register('address')} />{errors.address && <p className="mt-1 text-sm text-destructive">{errors.address.message}</p>}</div>
        </div></section>
        <section className="space-y-3"><h3 className="text-lg font-semibold">Receipt Image</h3><div className="rounded-lg border-2 border-dashed p-5 text-center">{(receiptPreview ?? editSale?.receiptImage) ? <div className="relative inline-block"><img src={receiptPreview ?? editSale?.receiptImage ?? ''} alt="Receipt preview" className="max-h-48 rounded-lg" /><Button type="button" variant="destructive" size="icon" className="absolute -right-2 -top-2" onClick={() => { setReceiptFile(null); setReceiptPreview(''); }}><X className="h-4 w-4" /></Button></div> : <Label htmlFor="receiptImage" className="cursor-pointer"><Upload className="mx-auto h-8 w-8" /><span className="text-primary">Choose an image</span><Input id="receiptImage" type="file" accept="image/*" className="hidden" onChange={handleReceiptChange} /></Label>}</div></section>
        <section className="space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Product Items</h3><Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyItem })}><Plus className="mr-2 h-4 w-4" />Add Product</Button></div>
          <AnimatePresence>{fields.map((field, index) => { const item = items?.[index] ?? emptyItem; return <motion.div key={field.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4 rounded-lg border p-4"><div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div><Label>Product</Label><Select value={item.productId} onValueChange={(value) => updateProduct(index, value)}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={product.id} value={String(product.id)}>{product.productName}</SelectItem>)}</SelectContent></Select>{errors.items?.[index]?.productId && <p className="mt-1 text-sm text-destructive">{errors.items[index]?.productId?.message}</p>}</div>
            <div><Label>Quantity</Label><Input type="number" min="0.01" step="0.01" value={item.quantity || ''} onChange={(event) => updateQuantityOrPrice(index, 'quantity', asNumber(event.target.value))} />{errors.items?.[index]?.quantity && <p className="mt-1 text-sm text-destructive">{errors.items[index]?.quantity?.message}</p>}</div>
            <div><Label>Quantity Type</Label><Select value={item.quantityType} onValueChange={(value: 'gram' | 'kilogram') => updateQuantityType(index, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gram">Gram</SelectItem><SelectItem value="kilogram">Kilogram</SelectItem></SelectContent></Select></div>
            <div><Label>Item Price (per {item.quantityType === 'gram' ? 'gram' : 'kilogram'})</Label><Input type="number" min="0" step="0.01" value={item.itemPrice || ''} onChange={(event) => updateQuantityOrPrice(index, 'itemPrice', asNumber(event.target.value))} />{errors.items?.[index]?.itemPrice && <p className="mt-1 text-sm text-destructive">{errors.items[index]?.itemPrice?.message}</p>}</div>
            <div><Label>Item Total</Label><Input type="number" min="0" step="0.01" value={item.itemTotal || ''} onChange={(event) => setValue(`items.${index}.itemTotal`, asNumber(event.target.value), { shouldDirty: true, shouldValidate: true })} />{errors.items?.[index]?.itemTotal && <p className="mt-1 text-sm text-destructive">{errors.items[index]?.itemTotal?.message}</p>}</div>
            <div><Label>Item Profit</Label><Input type="number" min="0" step="0.01" value={item.itemProfit || ''} onChange={(event) => setValue(`items.${index}.itemProfit`, asNumber(event.target.value), { shouldDirty: true, shouldValidate: true })} />{errors.items?.[index]?.itemProfit && <p className="mt-1 text-sm text-destructive">{errors.items[index]?.itemProfit?.message}</p>}</div>
          </div>{fields.length > 1 && <div className="flex justify-end"><Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>}</motion.div>; })}</AnimatePresence>
        </section>
        <section><Label htmlFor="deliveryCharges">Delivery Charges</Label><Input id="deliveryCharges" type="number" min="0" step="0.01" value={deliveryCharges || ''} onChange={(event) => setValue('deliveryCharges', asNumber(event.target.value), { shouldDirty: true, shouldValidate: true })} />{errors.deliveryCharges && <p className="mt-1 text-sm text-destructive">{errors.deliveryCharges.message}</p>}</section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{([['Products Total', totalProductAmount, 'Sum of item totals'], ['Total Amount', totalAmount, 'Products plus delivery charges'], ['Total Profit', totalProfit, 'Sum of item profit']] as const).map(([label, amount, description]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">${amount.toFixed(2)}</p><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card>)}</div>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={closeModal}>Cancel</Button><Button type="submit" disabled={saveSale.isPending}>{saveSale.isPending ? 'Saving...' : editSale ? 'Update Sale' : 'Create Sale'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
