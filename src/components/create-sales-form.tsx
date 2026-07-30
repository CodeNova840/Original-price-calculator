import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Trash2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { productService } from '@/services/product-service';
import { saleService } from '@/services/sale-service';

const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  quantityType: z.enum(['gram', 'kilogram']),
  itemPrice: z.number().min(0, 'Price must be greater than or equal to 0'),
  itemTotal: z.number(),
  itemProfit: z.number(),
});

const saleSchema = z.object({
  saleDate: z.string().min(1, 'Sale date is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerContact: z.string().min(1, 'Contact number is required'),
  trackingNumber: z.string().min(1, 'Tracking number is required'),
  courierName: z.string().min(1, 'Courier name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  deliveryCharges: z.number().min(0, 'Delivery charges must be greater than or equal to 0'),
  receiptImage: z.any().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one product is required'),
});

type SaleFormData = z.infer<typeof saleSchema>;

interface CreateSaleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSale?: any;
}

export default function CreateSaleForm({ open, onOpenChange, editSale }: CreateSaleFormProps) {
  const queryClient = useQueryClient();
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      saleDate: format(new Date(), 'yyyy-MM-dd'),
      customerName: '',
      customerContact: '',
      trackingNumber: '',
      courierName: '',
      address: '',
      city: '',
      deliveryCharges: 0,
      items: [
        {
          productId: '',
          quantity: 1,
          quantityType: 'kilogram',
          itemPrice: 0,
          itemTotal: 0,
          itemProfit: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const watchedDeliveryCharges = watch('deliveryCharges');

  const calculateItemTotal = (quantity: number, price: number) => {
    // Total price = quantity × selling price per unit
    return quantity * price;
  };

  const calculateItemProfit = (
    productId: string,
    quantity: number,
    quantityType: string
  ) => {
    // Find the product from the products array
    const product = products?.find((p) => p.id === parseInt(productId));
    
    // Check if product and profitRule exist
    if (!product || !product.profitRule) {
      console.warn(`No profit rule found for product ID: ${productId}`);
      return 0;
    }

    let profit = 0;
    
    // Parse profit values from strings to numbers
    const profitPerGram = parseFloat(product.profitRule.profitPerGram as any);
    const profitPerKilogram = parseFloat(product.profitRule.profitPerKilogram as any);
    
    // Calculate profit based on quantity type
    if (quantityType === 'gram') {
      // Profit = quantity (in grams) × profit per gram
      profit = quantity * profitPerGram;
    } else {
      // Profit = quantity (in kg) × profit per kilogram
      profit = quantity * profitPerKilogram;
    }

    // Ensure profit is not negative and round to 2 decimal places
    return Math.max(0, Math.round(profit * 100) / 100);
  };

  const updateItemCalculations = (index: number) => {
    const item = getValues(`items.${index}`);
    if (item.productId && item.quantity > 0 && item.itemPrice !== undefined) {
      const itemTotal = calculateItemTotal(item.quantity, item.itemPrice);
      const itemProfit = calculateItemProfit(
        item.productId,
        item.quantity,
        item.quantityType
      );
      setValue(`items.${index}.itemTotal`, itemTotal);
      setValue(`items.${index}.itemProfit`, itemProfit);
    }
  };

  // Update all items calculations
  const updateAllCalculations = () => {
    if (watchedItems) {
      watchedItems.forEach((_, index) => {
        updateItemCalculations(index);
      });
    }
  };

  // Update calculations whenever relevant values change
  useEffect(() => {
    updateAllCalculations();
  }, [watchedItems, products]);

  // Handle item removal with recalculation
  const handleRemoveItem = (index: number) => {
    remove(index);
    // Force recalculation after removal
    setTimeout(() => {
      updateAllCalculations();
    }, 0);
  };

  // Calculate totals
  const totalProductPrice = watchedItems?.reduce(
    (sum, item) => sum + (item?.itemTotal || 0),
    0
  ) || 0;

  const totalProfit = watchedItems?.reduce(
    (sum, item) => sum + (item?.itemProfit || 0),
    0
  ) || 0;

  // Calculate total amount with delivery charges
  const totalAmountWithDelivery = totalProductPrice + (watchedDeliveryCharges || 0);

  const createSaleMutation = useMutation({
    mutationFn: (data: FormData) => saleService.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Sale created successfully');
      reset();
      setReceiptPreview(null);
      setReceiptFile(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create sale');
    },
  });

  const updateSaleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) =>
      saleService.updateSale(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Sale updated successfully');
      reset();
      setReceiptPreview(null);
      setReceiptFile(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update sale');
    },
  });

  useEffect(() => {
    if (editSale && open) {
      // Populate form with edit data
      setValue('saleDate', format(new Date(editSale.saleDate), 'yyyy-MM-dd'));
      setValue('customerName', editSale.customerName);
      setValue('customerContact', editSale.customerContact);
      setValue('trackingNumber', editSale.trackingNumber);
      setValue('courierName', editSale.courierName);
      setValue('address', editSale.address);
      setValue('city', editSale.city);
      setValue('deliveryCharges', parseFloat(editSale.deliveryCharges));
      
      if (editSale.items && editSale.items.length > 0) {
        // Clear existing items
        while (fields.length) {
          remove(0);
        }
        // Add edit items
        editSale.items.forEach((item: any, index: number) => {
          const newItem = {
            productId: item.productId.toString(),
            quantity: parseFloat(item.quantity),
            quantityType: item.quantityType,
            itemPrice: parseFloat(item.itemPrice),
            itemTotal: parseFloat(item.itemTotal),
            itemProfit: parseFloat(item.itemProfit),
          };
          
          if (index === 0) {
            // Update the first existing field
            setValue(`items.0`, newItem);
          } else {
            // Append new items
            append(newItem);
          }
        });
      }
      
      if (editSale.receiptImage) {
        setReceiptPreview(editSale.receiptImage);
      }
      
      // Force recalculation after setting edit data
      setTimeout(() => {
        updateAllCalculations();
      }, 100);
    }
  }, [editSale, open, setValue, fields.length, append, remove]);

  const onSubmit = async (data: SaleFormData) => {
    const formData = new FormData();
    
    // Basic Information
    formData.append('saleDate', data.saleDate);
    formData.append('customerName', data.customerName);
    formData.append('customerContact', data.customerContact);
    formData.append('trackingNumber', data.trackingNumber);
    formData.append('courierName', data.courierName);
    formData.append('address', data.address);
    formData.append('city', data.city);
    formData.append('deliveryCharges', data.deliveryCharges.toString());
    
    // Totals - Send both total amount (with delivery) and total profit
    formData.append('totalAmount', totalAmountWithDelivery.toFixed(2));
    formData.append('totalProductAmount', totalProductPrice.toFixed(2));
    formData.append('totalProfit', totalProfit.toFixed(2));
    
    // Items as JSON string
    formData.append('items', JSON.stringify(data.items.map(item => ({
      ...item,
      productId: parseInt(item.productId),
    }))));

    // Receipt image if exists
    if (receiptFile) {
      formData.append('receiptImage', receiptFile);
    }

    if (editSale) {
      updateSaleMutation.mutate({ id: editSale.id, data: formData });
    } else {
      createSaleMutation.mutate(formData);
    }
  };

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        toast.error('Only PNG files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  // Helper function to get product details for display
  const getProductProfitInfo = (productId: string) => {
    const product = products?.find((p) => p.id === parseInt(productId));
    if (product?.profitRule) {
      return {
        perGram: parseFloat(product.profitRule.profitPerGram as any),
        perKilogram: parseFloat(product.profitRule.profitPerKilogram as any)
      };
    }
    return null;
  };

  // Helper to format quantity display
  const formatQuantityWithUnit = (quantity: number, type: string) => {
    if (type === 'gram') {
      if (quantity >= 1000) {
        return `${(quantity / 1000).toFixed(2)} kg`;
      }
      return `${quantity} g`;
    }
    return `${quantity} kg`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editSale ? 'Edit Sale' : 'Create New Sale'}</DialogTitle>
          <DialogDescription>
            Fill in the details to {editSale ? 'update' : 'create'} a sale record
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="saleDate">Sale Date</Label>
                <Input
                  type="date"
                  id="saleDate"
                  {...register('saleDate')}
                />
                {errors.saleDate && (
                  <p className="text-sm text-destructive mt-1">{errors.saleDate.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  placeholder="Enter customer name"
                  {...register('customerName')}
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="customerContact">Contact Number</Label>
                <Input
                  id="customerContact"
                  placeholder="Enter contact number"
                  {...register('customerContact')}
                />
                {errors.customerContact && (
                  <p className="text-sm text-destructive mt-1">{errors.customerContact.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  placeholder="Enter tracking number"
                  {...register('trackingNumber')}
                />
                {errors.trackingNumber && (
                  <p className="text-sm text-destructive mt-1">{errors.trackingNumber.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="courierName">Courier Name</Label>
                <Input
                  id="courierName"
                  placeholder="Enter courier name"
                  {...register('courierName')}
                />
                {errors.courierName && (
                  <p className="text-sm text-destructive mt-1">{errors.courierName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  {...register('city')}
                />
                {errors.city && (
                  <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter complete address"
                  {...register('address')}
                />
                {errors.address && (
                  <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Receipt Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Receipt Upload (PNG only)</h3>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {receiptPreview ? (
                <div className="relative inline-block">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-48 rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2"
                    onClick={removeReceipt}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <Label htmlFor="receipt" className="cursor-pointer">
                      <span className="text-primary">Click to upload</span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </Label>
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={handleReceiptChange}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">PNG only, max 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Product Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    productId: '',
                    quantity: 1,
                    quantityType: 'kilogram',
                    itemPrice: 0,
                    itemTotal: 0,
                    itemProfit: 0,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            <AnimatePresence>
              {fields.map((field, index) => {
                const productId = watch(`items.${index}.productId`);
                const quantity = watch(`items.${index}.quantity`);
                const quantityType = watch(`items.${index}.quantityType`);
                const itemPrice = watch(`items.${index}.itemPrice`);
                const profitInfo = getProductProfitInfo(productId);
                
                return (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label>Product</Label>
                        <Select
                          value={watch(`items.${index}.productId`)}
                          onValueChange={(value) => {
                            setValue(`items.${index}.productId`, value);
                            // Reset quantity type and recalculate when product changes
                            setValue(`items.${index}.quantityType`, 'kilogram');
                            updateItemCalculations(index);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.productName}
                                {product.profitRule && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Profit: ${parseFloat(product.profitRule.profitPerGram as any)}/g, 
                                    ${parseFloat(product.profitRule.profitPerKilogram as any)}/kg)
                                  </span>
                                )}
                                {!product.profitRule && (
                                  <span className="text-xs text-orange-500 ml-2">
                                    (No profit rule set)
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                          onChange={() => updateItemCalculations(index)}
                        />
                        {quantity > 0 && quantityType && (
                          <p className="text-xs text-muted-foreground mt-1">
                            = {formatQuantityWithUnit(quantity, quantityType)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Quantity Type</Label>
                        <Select
                          value={watch(`items.${index}.quantityType`)}
                          onValueChange={(value: 'gram' | 'kilogram') => {
                            setValue(`items.${index}.quantityType`, value);
                            updateItemCalculations(index);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gram">Gram (g)</SelectItem>
                            <SelectItem value="kilogram">Kilogram (kg)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Selling Price (per {quantityType === 'gram' ? 'gram' : 'kg'})</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={`Price per ${quantityType === 'gram' ? 'gram' : 'kg'}`}
                          {...register(`items.${index}.itemPrice`, { valueAsNumber: true })}
                          onChange={() => updateItemCalculations(index)}
                        />
                        {itemPrice > 0 && profitInfo && (
                          <p className="text-xs text-green-600 mt-1">
                            Profit per {quantityType === 'gram' ? 'gram' : 'kg'}: ${quantityType === 'gram' ? profitInfo.perGram : profitInfo.perKilogram}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Total Price (Customer Pays)</Label>
                        <Input
                          type="number"
                          value={watch(`items.${index}.itemTotal`)?.toFixed(2) || '0.00'}
                          readOnly
                          className="bg-muted font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-green-600">
                        Your Profit: ${watch(`items.${index}.itemProfit`)?.toFixed(2) || '0.00'}
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Delivery Charges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Delivery Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryCharges">Delivery Charges</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="deliveryCharges"
                  placeholder="Enter delivery charges"
                  {...register('deliveryCharges', { valueAsNumber: true })}
                />
                {errors.deliveryCharges && (
                  <p className="text-sm text-destructive mt-1">{errors.deliveryCharges.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary Cards - Updated with Total Amount including Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Products Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalProductPrice.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total amount for products only
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Amount (with Delivery)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ${totalAmountWithDelivery.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Products + Delivery charges
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${totalProfit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your earnings from this sale
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editSale ? 'Update Sale' : 'Create Sale'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}