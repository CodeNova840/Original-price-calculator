import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sale } from '@/services/sale-service';

interface SaleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
}

export default function SaleDetailsModal({ open, onOpenChange, sale }: SaleDetailsModalProps) {
  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sale Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sale Date</p>
                <p>{format(new Date(sale.saleDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer Name</p>
                <p>{sale.customerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact Number</p>
                <p>{sale.customerContact}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tracking Number</p>
                <p>{sale.trackingNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Courier Name</p>
                <p>{sale.courierName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">City</p>
                <p>{sale.city}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p>{sale.address}</p>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Image */}
          {sale.receiptImage && (
            <Card>
              <CardHeader>
                <CardTitle>Receipt</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={sale.receiptImage}
                  alt="Receipt"
                  className="max-w-full rounded-lg shadow-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Product Items */}
          <Card>
            <CardHeader>
              <CardTitle>Product Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sale.items?.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Product</p>
                        <p className="font-semibold">{item.product?.productName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p>
                          {item.quantity} {item.quantityType}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Item Price</p>
                        <p>${Number(item.itemPrice).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Item Total</p>
                        <p>${Number(item.itemTotal).toFixed(2)}</p>
                      </div>
                    </div>
                    <Separator className="my-2" />
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground">Item Profit</p>
                      <p className="text-green-600 font-semibold">
                        ${Number(item.itemProfit).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${Number(sale.totalAmount).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Delivery Charges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${Number(sale.deliveryCharges || 0).toFixed(2)}
                </div>
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
                  ${Number(sale.totalProfit).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}