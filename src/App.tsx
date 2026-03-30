import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Trash2,
  Moon,
  Sun,
  Download,
} from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: number;
  name: string;
  phone: string;
  product: string;
  duration_months: number;
  start_date: string;
  expiry_date: string;
  payment_status: string;
  amount: number;
  status: string;
}

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dashboard, setDashboard] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiringSoon: 0,
  });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    product: "",
    duration_months: "1",
    start_date: format(new Date(), "yyyy-MM-dd"),
    payment_status: "Paid",
    amount: "",
  });

  const fetchData = async () => {
    try {
      const [customersRes, dashboardRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/dashboard"),
      ]);
      setCustomers(await customersRes.json());
      setDashboard(await dashboardRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          duration_months: parseInt(formData.duration_months),
          amount: parseFloat(formData.amount),
        }),
      });
      setIsAddOpen(false);
      setFormData({
        name: "",
        phone: "",
        product: "",
        duration_months: "1",
        start_date: format(new Date(), "yyyy-MM-dd"),
        payment_status: "Paid",
        amount: "",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to add customer", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      await fetch(`/api/customers/${id}`, { method: "DELETE" });
      fetchData();
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Expiring Soon":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "Expired":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const exportToCSV = () => {
    if (filteredCustomers.length === 0) return;

    const headers = [
      "Name",
      "Phone",
      "Product",
      "Duration (Months)",
      "Start Date",
      "Expiry Date",
      "Payment Status",
      "Amount",
      "Status",
    ];
    const csvRows = [headers.join(",")];

    for (const customer of filteredCustomers) {
      const row = [
        `"${customer.name}"`,
        `"${customer.phone}"`,
        `"${customer.product}"`,
        customer.duration_months,
        customer.start_date,
        customer.expiry_date,
        customer.payment_status,
        customer.amount,
        customer.status,
      ];
      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `customers_export_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8 font-sans text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SubTrack BD</h1>
            <p className="text-muted-foreground">
              Manage digital product subscriptions
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddCustomer} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (with country code)</Label>
                    <Input
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+8801700000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input
                      required
                      value={formData.product}
                      onChange={(e) =>
                        setFormData({ ...formData, product: e.target.value })
                      }
                      placeholder="Netflix Premium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select
                        value={formData.duration_months}
                        onValueChange={(v) =>
                          setFormData({ ...formData, duration_months: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Month</SelectItem>
                          <SelectItem value="2">2 Months</SelectItem>
                          <SelectItem value="3">3 Months</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select
                        value={formData.payment_status}
                        onValueChange={(v) =>
                          setFormData({ ...formData, payment_status: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        required
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Save Customer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Customers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expiring Soon
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.expiringSoon}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expired
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.expired}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToCSV} disabled={filteredCustomers.length === 0}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50 dark:bg-gray-800/50 border-b">
                  <tr>
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Product</th>
                    <th className="px-6 py-3 font-medium">Dates</th>
                    <th className="px-6 py-3 font-medium">Payment</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-muted-foreground"
                      >
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {customer.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>{customer.product}</div>
                          <div className="text-muted-foreground text-xs">
                            {customer.duration_months} Month(s)
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <span className="text-muted-foreground">
                              Start:
                            </span>{" "}
                            {customer.start_date}
                          </div>
                          <div className="text-xs font-medium">
                            <span className="text-muted-foreground">End:</span>{" "}
                            {customer.expiry_date}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">
                            ${customer.amount.toFixed(2)}
                          </div>
                          <Badge
                            variant={
                              customer.payment_status === "Paid"
                                ? "default"
                                : "destructive"
                            }
                            className="mt-1 text-[10px] h-4"
                          >
                            {customer.payment_status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium",
                              getStatusColor(customer.status),
                            )}
                          >
                            {customer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
