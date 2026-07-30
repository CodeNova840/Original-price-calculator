import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Trash2, Plus, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SearchableSelect} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { productService, Product } from "@/services/product-service";
import { profitService, ProfitRule } from "@/services/profit-service";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({
  open,
  onOpenChange,
}: SettingsModalProps) {
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [profitRules, setProfitRules] = useState<ProfitRule[]>([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProfitRule, setNewProfitRule] = useState({
    productId: "",
    profitPerGram: "",
    profitPerKilogram: "",
  });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: "product" | "profit";
    id: number;
    name?: string;
  }>({ open: false, type: "product", id: 0 });
  const [validationErrors, setValidationErrors] = useState<{
    productId?: string;
    profitPerGram?: string;
    profitPerKilogram?: string;
  }>({});

  const productsInitialized = useRef(false);
  const profitRulesInitialized = useRef(false);

  // Queries
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productService.getProducts,
    enabled: open,
    staleTime: 30000,
    gcTime: 300000,
  });

  const { data: profitRulesData, isLoading: profitRulesLoading } = useQuery({
    queryKey: ["profitRules"],
    queryFn: profitService.getProfitRules,
    enabled: open,
    staleTime: 30000,
    gcTime: 300000,
  });

  // Sync data when loaded
  useEffect(() => {
    if (productsData && !productsInitialized.current) {
      setProducts(productsData);
      productsInitialized.current = true;
    }
  }, [productsData]);

  useEffect(() => {
    if (profitRulesData && !profitRulesInitialized.current) {
      setProfitRules(profitRulesData);
      profitRulesInitialized.current = true;
    }
  }, [profitRulesData]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      productsInitialized.current = false;
      profitRulesInitialized.current = false;
      setNewProductName("");
      setNewProfitRule({
        productId: "",
        profitPerGram: "",
        profitPerKilogram: "",
      });
      setValidationErrors({});
    }
  }, [open]);

  // Handlers
  const handleProductNameChange = useCallback((id: number, newName: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, productName: newName } : p)),
    );
  }, []);

  const handleProfitRuleChange = useCallback(
    (
      id: number,
      field: "profitPerGram" | "profitPerKilogram",
      value: number,
    ) => {
      setProfitRules((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, [field]: isNaN(value) ? 0 : value } : r,
        ),
      );
    },
    [],
  );

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (name: string) => productService.createProduct(name),
    onSuccess: async (newProduct) => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });

      // Update the local state directly with the new product
      if (newProduct) {
        setProducts((prev) => [...prev, newProduct]);
      }

      toast.success("Product created successfully");
      setNewProductName("");

      // Reset profit rule form product selection
      setNewProfitRule((prev) => ({ ...prev, productId: "" }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create product");
    },
  });
  
  const updateProductMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      productService.updateProduct(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update product");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => productService.deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["profitRules"] });
      
      // Fetch updated data
      const updatedProducts = await productService.getProducts();
      const updatedProfitRules = await profitService.getProfitRules();
      
      setProducts(updatedProducts);
      setProfitRules(updatedProfitRules);
      productsInitialized.current = true;
      profitRulesInitialized.current = true;
      
      toast.success("Product deleted successfully");
      setDeleteDialog({ open: false, type: "product", id: 0 });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete product");
      setDeleteDialog({ open: false, type: "product", id: 0 });
    },
  });

  const createProfitRuleMutation = useMutation({
    mutationFn: (data: {
      productId: number;
      profitPerGram: number;
      profitPerKilogram: number;
    }) => profitService.createProfitRule(data),
    onSuccess: async ( variables) => {
      // First, invalidate and refetch to get the latest data
      await queryClient.invalidateQueries({ queryKey: ["profitRules"] });
      
      // Fetch the updated profit rules
      const updatedProfitRules = await profitService.getProfitRules();
      
      // Update local state with the complete data from server
      setProfitRules(updatedProfitRules);
      profitRulesInitialized.current = true;
      
      // Find the product name for the success message
      const product = products.find(p => p.id === variables.productId);
      toast.success(`Profit rule for ${product?.productName || "product"} created successfully`);
      
      // Reset the form
      setNewProfitRule({
        productId: "",
        profitPerGram: "",
        profitPerKilogram: "",
      });
      setValidationErrors({});
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to create profit rule",
      );
    },
  });

  const updateProfitRuleMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { profitPerGram: number; profitPerKilogram: number };
    }) => profitService.updateProfitRule(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profitRules"] });
      
      // Fetch the updated profit rules
      const updatedProfitRules = await profitService.getProfitRules();
      setProfitRules(updatedProfitRules);
      
      toast.success("Profit rule updated successfully");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update profit rule",
      );
    },
  });

  const deleteProfitRuleMutation = useMutation({
    mutationFn: (id: number) => profitService.deleteProfitRule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profitRules"] });
      
      // Fetch the updated profit rules
      const updatedProfitRules = await profitService.getProfitRules();
      setProfitRules(updatedProfitRules);
      
      toast.success("Profit rule deleted successfully");
      setDeleteDialog({ open: false, type: "profit", id: 0 });
      profitRulesInitialized.current = true;
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to delete profit rule",
      );
      setDeleteDialog({ open: false, type: "profit", id: 0 });
    },
  });

  const handleUpdateAllProducts = useCallback(async () => {
    if (products.length === 0) return;

    const promises = products.map((product) =>
      updateProductMutation.mutateAsync({
        id: product.id,
        name: product.productName,
      }),
    );

    try {
      await Promise.all(promises);
      toast.success("All products updated successfully");
    } catch (error) {
      toast.error("Failed to update some products");
    }
  }, [products, updateProductMutation]);

  const handleUpdateAllProfitRules = useCallback(async () => {
    if (profitRules.length === 0) return;

    const promises = profitRules.map((rule) =>
      updateProfitRuleMutation.mutateAsync({
        id: rule.id,
        data: {
          profitPerGram: rule.profitPerGram,
          profitPerKilogram: rule.profitPerKilogram,
        },
      }),
    );

    try {
      await Promise.all(promises);
      toast.success("All profit rules updated successfully");
    } catch (error) {
      toast.error("Failed to update some profit rules");
    }
  }, [profitRules, updateProfitRuleMutation]);

  const handleCreateProfitRule = useCallback(() => {
    // Validate product selection
    if (!newProfitRule.productId || newProfitRule.productId === "") {
      setValidationErrors({ productId: "Product is required" });
      toast.error("Please select a product");
      return;
    }

    const productId = parseInt(newProfitRule.productId);

    if (isNaN(productId) || productId <= 0) {
      setValidationErrors({ productId: "Invalid product selected" });
      toast.error("Please select a valid product");
      return;
    }

    // Validate profit per gram
    const profitPerGram = parseFloat(newProfitRule.profitPerGram);
    if (isNaN(profitPerGram)) {
      setValidationErrors({
        profitPerGram: "Valid profit per gram is required",
      });
      toast.error("Please enter a valid profit per gram");
      return;
    }

    if (profitPerGram < 0) {
      setValidationErrors({
        profitPerGram: "Profit per gram cannot be negative",
      });
      toast.error("Profit per gram cannot be negative");
      return;
    }

    // Validate profit per kilogram
    const profitPerKilogram = parseFloat(newProfitRule.profitPerKilogram);
    if (isNaN(profitPerKilogram)) {
      setValidationErrors({
        profitPerKilogram: "Valid profit per kilogram is required",
      });
      toast.error("Please enter a valid profit per kilogram");
      return;
    }

    if (profitPerKilogram < 0) {
      setValidationErrors({
        profitPerKilogram: "Profit per kilogram cannot be negative",
      });
      toast.error("Profit per kilogram cannot be negative");
      return;
    }

    // Check if profit rule already exists for this product
    const ruleExists = profitRules.some(rule => rule.productId === productId);
    if (ruleExists) {
      setValidationErrors({ 
        productId: "A profit rule already exists for this product" 
      });
      toast.error("A profit rule already exists for this product");
      return;
    }

    // Create the profit rule
    createProfitRuleMutation.mutate({
      productId: productId,
      profitPerGram: profitPerGram,
      profitPerKilogram: profitPerKilogram,
    });
  }, [newProfitRule, profitRules, createProfitRuleMutation]);

  const handleDeleteClick = useCallback(
    (type: "product" | "profit", id: number, name?: string) => {
      setDeleteDialog({ open: true, type, id, name });
    },
    [],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteDialog.type === "product") {
      deleteProductMutation.mutate(deleteDialog.id);
    } else {
      deleteProfitRuleMutation.mutate(deleteDialog.id);
    }
  }, [deleteDialog, deleteProductMutation, deleteProfitRuleMutation]);

  const isUpdating =
    updateProductMutation.isPending || updateProfitRuleMutation.isPending;

  // Filter products that don't have profit rules yet
  const productsWithoutProfitRules = products.filter(
    (product) => !profitRules.some((rule) => rule.productId === product.id),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Manage your products and profit rules
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products">Product Items</TabsTrigger>
              <TabsTrigger value="profits">Profit Rules</TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <div className="space-y-4">
                {productsLoading ? (
                  <div className="text-center py-4">Loading products...</div>
                ) : (
                  <>
                    {/* Display existing products */}
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center space-x-2"
                      >
                        <Input
                          value={product.productName}
                          onChange={(e) =>
                            handleProductNameChange(product.id, e.target.value)
                          }
                          className="flex-1"
                          placeholder="Product name"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            handleDeleteClick(
                              "product",
                              product.id,
                              product.productName,
                            )
                          }
                          disabled={deleteProductMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* Add new product */}
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="New product name"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="flex-1"
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && newProductName.trim()) {
                            createProductMutation.mutate(newProductName);
                          }
                        }}
                      />
                      <Button
                        onClick={() =>
                          createProductMutation.mutate(newProductName)
                        }
                        disabled={
                          !newProductName.trim() ||
                          createProductMutation.isPending
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {/* Update all button */}
                    {products.length > 0 && (
                      <Button
                        onClick={handleUpdateAllProducts}
                        className="w-full"
                        disabled={isUpdating}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Update All Products
                      </Button>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            {/* Profit Rules Tab */}
            <TabsContent value="profits" className="space-y-4">
              <div className="space-y-4">
                {profitRulesLoading ? (
                  <div className="text-center py-4">
                    Loading profit rules...
                  </div>
                ) : (
                  <>
                    {/* Display existing profit rules list */}
                    {profitRules.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Existing Profit Rules</h3>
                        {profitRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg bg-gray-50"
                          >
                            <div className="md:col-span-1">
                              <Label>Product</Label>
                              <div className="text-sm font-medium mt-2 break-words">
                                {rule.product?.productName || "Unknown Product"}
                              </div>
                            </div>
                            <div>
                              <Label>Profit Per Gram (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={rule.profitPerGram}
                                onChange={(e) =>
                                  handleProfitRuleChange(
                                    rule.id,
                                    "profitPerGram",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Label>Profit Per Kilogram (₹)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={rule.profitPerKilogram}
                                onChange={(e) =>
                                  handleProfitRuleChange(
                                    rule.id,
                                    "profitPerKilogram",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() =>
                                  handleDeleteClick(
                                    "profit",
                                    rule.id,
                                    rule.product?.productName,
                                  )
                                }
                                disabled={deleteProfitRuleMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No profit rules added yet. Add your first profit rule below.
                      </div>
                    )}

                    {/* Add New Profit Rule Section */}
                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-lg font-semibold mb-4">Add New Profit Rule</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label>Product *</Label>
                          <SearchableSelect
                            options={productsWithoutProfitRules.map(
                              (product) => ({
                                value: product.id.toString(),
                                label: product.productName,
                              }),
                            )}
                            value={newProfitRule.productId}
                            onValueChange={(value) => {
                              setNewProfitRule({
                                ...newProfitRule,
                                productId: value,
                              });
                              if (validationErrors.productId) {
                                setValidationErrors({
                                  ...validationErrors,
                                  productId: undefined,
                                });
                              }
                            }}
                            placeholder="Search and select product..."
                            searchPlaceholder="Type to search products..."
                            emptyMessage={
                              productsWithoutProfitRules.length === 0
                                ? "All products already have profit rules"
                                : "No products found"
                            }
                            className={
                              validationErrors.productId ? "border-red-500" : ""
                            }
                          />
                          {validationErrors.productId && (
                            <p className="text-sm text-red-500 mt-1">
                              {validationErrors.productId}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Profit Per Gram (₹) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newProfitRule.profitPerGram}
                            onChange={(e) => {
                              setNewProfitRule({
                                ...newProfitRule,
                                profitPerGram: e.target.value,
                              });
                              if (validationErrors.profitPerGram) {
                                setValidationErrors({
                                  ...validationErrors,
                                  profitPerGram: undefined,
                                });
                              }
                            }}
                            className={
                              validationErrors.profitPerGram
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {validationErrors.profitPerGram && (
                            <p className="text-sm text-red-500 mt-1">
                              {validationErrors.profitPerGram}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label>Profit Per Kilogram (₹) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={newProfitRule.profitPerKilogram}
                            onChange={(e) => {
                              setNewProfitRule({
                                ...newProfitRule,
                                profitPerKilogram: e.target.value,
                              });
                              if (validationErrors.profitPerKilogram) {
                                setValidationErrors({
                                  ...validationErrors,
                                  profitPerKilogram: undefined,
                                });
                              }
                            }}
                            className={
                              validationErrors.profitPerKilogram
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {validationErrors.profitPerKilogram && (
                            <p className="text-sm text-red-500 mt-1">
                              {validationErrors.profitPerKilogram}
                            </p>
                          )}
                        </div>

                        <div className="flex items-end">
                          <Button
                            onClick={handleCreateProfitRule}
                            disabled={
                              !newProfitRule.productId ||
                              !newProfitRule.profitPerGram ||
                              !newProfitRule.profitPerKilogram ||
                              createProfitRuleMutation.isPending
                            }
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Rule
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Update all button */}
                    {profitRules.length > 0 && (
                      <Button
                        onClick={handleUpdateAllProfitRules}
                        className="w-full mt-4"
                        disabled={isUpdating}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Update All Profit Rules
                      </Button>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ open: false, type: "product", id: 0 })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "product"
                ? `This will permanently delete the product "${deleteDialog.name || "this item"}" and all its associated profit rules. This action cannot be undone.`
                : `This will permanently delete the profit rule for "${deleteDialog.name || "this product"}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}