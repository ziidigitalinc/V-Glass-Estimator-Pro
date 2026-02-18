
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Camera, FileText, Sparkles, 
  ChevronDown, Settings as SettingsIcon, 
  X, LayoutDashboard, 
  Users, Package, ShoppingCart, 
  Search, Bell, MoreHorizontal, Receipt, 
  Edit2, Printer,
  Building2, SaveAll, Sliders, Info, UserPlus, Briefcase, ArrowRightLeft, FileCheck, PlusCircle,
  Percent, DollarSign
} from 'lucide-react';
import { calculateSqFt, formatCurrency, formatSqFt, calculateLinearInches } from './utils/mathUtils';
import { processImageToEstimate } from './services/geminiService';

const VGMLogoIcon = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="12" height="60" fill="#7DD3FC" transform="skewX(-15)" />
    <rect x="22" y="5" width="12" height="65" fill="#38BDF8" transform="skewX(-15)" />
    <rect x="39" y="0" width="12" height="70" fill="#0EA5E9" transform="skewX(-15)" />
  </svg>
);

const DEFAULT_COMPANY = {
  name: 'Vaughan Glass and Mirror Inc.',
  address: '2211 Industry Ave, Unit 4B\nVaughan, ON L4K 1Z3',
  phone: '905-555-0123',
  email: 'quotes@vaughanglass.ca',
  slogan: 'Quality craftsmanship you can see through',
  hstNumber: '123456789 RT0001'
};

const DEFAULT_PRINT_OPTIONS = {
  showLogo: true,
  showSlogan: true,
  showCompanyContact: true,
  showCustomerContact: true,
  showDimensions: true,
  showPricePerSqFt: true,
  showItemServices: true,
  showSummaryBreakdown: true,
  showNotes: true,
  showHSTNumber: true,
};

const INITIAL_CUSTOMERS = [
  { id: 'c1', name: 'Highland Glass Interiors', email: 'quotes@highlandglass.com', phone: '555-0101', address: '123 Industrial Way, Toronto' },
  { id: 'c2', name: 'Clearview Windows', email: 'office@clearview.net', phone: '555-0102', address: '456 Skyline Blvd, Vancouver' },
  { id: 'c3', name: 'Artisan Glassworks', email: 'john@artisan.com', phone: '555-0103', address: '789 Craft St, Montreal' },
];

const INITIAL_PRODUCTS = [
  { id: '3mm-clear', name: '3mm Clear', price: 12.50 },
  { id: '5mm-clear', name: '5mm Clear', price: 15.75 },
  { id: '6mm-clear', name: '6mm Clear', price: 18.00 },
  { id: '10mm-clear', name: '10mm Clear', price: 24.50 },
  { id: '12mm-clear', name: '12mm Clear', price: 32.00 },
  { id: '5mm-mirror', name: '5mm Mirror', price: 19.50 },
];

const INITIAL_SERVICES = [
  { id: 'hole', name: 'Holes', unitPrice: 15.00 },
  { id: 'hinge', name: 'Hinges', unitPrice: 45.00 },
  { id: 'polish', name: 'Flat Polish', unitPrice: 2.50 },
  { id: 'temper', name: 'Tempering', unitPrice: 5.00 },
  { id: 'linear-all', name: 'Linear Edge - All Sides', unitPrice: 0.85 },
  { id: 'linear-long', name: 'Linear Edge - Long Sides Only', unitPrice: 0.85 },
  { id: 'linear-short', name: 'Linear Edge - Short Sides Only', unitPrice: 0.85 },
];

const generateId = () => Math.random().toString(36).slice(2, 11);

const DEFAULT_LINE_ITEM = (products) => ({
  id: generateId(),
  quantity: 1,
  width: '',
  height: '',
  glassType: products[0]?.id || '',
  pricePerSqFt: products[0]?.price || 0,
  itemServices: [],
  cncCharge: 0,
  otherServices: 0,
});

const Modal = ({ isOpen, onClose, title, children = null, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-2xl w-full ${maxWidth} shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200`}>
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X size={18}/></button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState('Dashboard');
  const [isQuotesOpen, setIsQuotesOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);
  const [servicesDef, setServicesDef] = useState(INITIAL_SERVICES);
  const [documents, setDocuments] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('vgm_company_profile');
    return saved ? JSON.parse(saved) : DEFAULT_COMPANY;
  });

  const [printOptions, setPrintOptions] = useState(() => {
    const saved = localStorage.getItem('vgm_print_options');
    return saved ? JSON.parse(saved) : DEFAULT_PRINT_OPTIONS;
  });

  const [editingDoc, setEditingDoc] = useState(null);
  const [printDoc, setPrintDoc] = useState(null);
  const [isPrintConfigOpen, setIsPrintConfigOpen] = useState(false);

  // Financial States
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'dollar'
  const [discountInput, setDiscountInput] = useState(0);
  const [taxRate, setTaxRate] = useState(13);
  const [energyRate, setEnergyRate] = useState(8);

  const [isProcessing, setIsProcessing] = useState(false);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    localStorage.setItem('vgm_company_profile', JSON.stringify(companyProfile));
  }, [companyProfile]);

  useEffect(() => {
    localStorage.setItem('vgm_print_options', JSON.stringify(printOptions));
  }, [printOptions]);

  useEffect(() => {
    if (items.length === 0 && products.length > 0) {
      setItems([DEFAULT_LINE_ITEM(products)]);
    }
  }, [products]);

  const calculateItemTotals = (item) => {
    const sqFt = calculateSqFt(item.width, item.height);
    const glassTotal = sqFt * item.pricePerSqFt;
    const servicesTotal = (item.itemServices || []).reduce((sum, s) => sum + (s.quantity * s.price), 0);
    return {
      sqFt,
      glassTotal,
      servicesTotal,
      lineTotal: (glassTotal + servicesTotal) * item.quantity
    };
  };

  const summary = useMemo(() => {
    const rawSubtotal = items.reduce((sum, item) => sum + calculateItemTotals(item).lineTotal, 0);
    const totalSqFt = items.reduce((sum, item) => sum + (calculateSqFt(item.width, item.height) * item.quantity), 0);
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    
    let discountValue = 0;
    if (discountType === 'percentage') {
      discountValue = rawSubtotal * (discountInput / 100);
    } else {
      discountValue = discountInput;
    }
    
    const subtotalAfterDiscount = Math.max(0, rawSubtotal - discountValue);
    const energyCharge = subtotalAfterDiscount * (energyRate / 100);
    const hstCharge = (subtotalAfterDiscount + energyCharge) * (taxRate / 100);
    
    return {
      subtotal: rawSubtotal,
      discountType,
      discountInput,
      discountValue,
      energyRate,
      energyCharge,
      taxRate,
      hstCharge,
      total: subtotalAfterDiscount + energyCharge + hstCharge,
      totalSqFt, 
      totalQty
    };
  }, [items, discountType, discountInput, energyRate, taxRate]);

  const addItem = () => {
    setItems(prev => {
      const lastItem = prev[prev.length - 1];
      const newItem = {
        ...DEFAULT_LINE_ITEM(products),
        glassType: lastItem ? lastItem.glassType : (products[0]?.id || ''),
        pricePerSqFt: lastItem ? lastItem.pricePerSqFt : (products[0]?.price || 0),
      };
      return [...prev, newItem];
    });
  };

  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  
  const updateItem = (id, updates) => {
    setItems(prev => {
      let alreadyAutoAdded = false;
      const newItems = prev.map(i => {
        if (i.id !== id) return i;
        const updated = { ...i, ...updates };
        
        if (updates.width !== undefined || updates.height !== undefined) {
          updated.itemServices = (updated.itemServices || []).map(s => {
            if (s.serviceId === 'linear-all') return { ...s, quantity: calculateLinearInches(updated.width, updated.height, 'all') };
            if (s.serviceId === 'linear-long') return { ...s, quantity: calculateLinearInches(updated.width, updated.height, 'long') };
            if (s.serviceId === 'linear-short') return { ...s, quantity: calculateLinearInches(updated.width, updated.height, 'short') };
            return s;
          });
        }

        if (updates.glassType) {
          const prod = products.find(p => p.id === updates.glassType);
          if (prod) updated.pricePerSqFt = prod.price;
        }

        const isLastRow = id === prev[prev.length - 1].id;
        if (isLastRow && updated.width && updated.height && (updates.width || updates.height)) {
          alreadyAutoAdded = true;
        }

        return updated;
      });

      if (alreadyAutoAdded) {
        const lastUpdated = newItems[newItems.length - 1];
        const nextItem = {
          ...DEFAULT_LINE_ITEM(products),
          glassType: lastUpdated.glassType,
          pricePerSqFt: lastUpdated.pricePerSqFt,
        };
        return [...newItems, nextItem];
      }

      return newItems;
    });
  };

  const addServiceToItem = (itemId) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const newService = {
        id: generateId(),
        serviceId: '',
        quantity: 1,
        price: 0
      };
      return { ...item, itemServices: [...(item.itemServices || []), newService] };
    }));
  };

  const updateServiceRow = (itemId, serviceRowId, updates) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        itemServices: item.itemServices.map(s => {
          if (s.id !== serviceRowId) return s;
          const updated = { ...s, ...updates };
          if (updates.serviceId) {
            const def = servicesDef.find(d => d.id === updates.serviceId);
            if (def) {
              updated.price = def.unitPrice;
              if (updates.serviceId === 'linear-all') updated.quantity = calculateLinearInches(item.width, item.height, 'all');
              if (updates.serviceId === 'linear-long') updated.quantity = calculateLinearInches(item.width, item.height, 'long');
              if (updates.serviceId === 'linear-short') updated.quantity = calculateLinearInches(item.width, item.height, 'short');
            }
          }
          return updated;
        })
      };
    }));
  };

  const removeServiceRow = (itemId, serviceRowId) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, itemServices: item.itemServices.filter(s => s.id !== serviceRowId) };
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (base64) {
          const results = await processImageToEstimate(base64);
          const newItems = results.map((r) => ({
            ...DEFAULT_LINE_ITEM(products),
            quantity: r.quantity || 1, width: r.width || '', height: r.height || '',
          }));
          setItems(prev => [...prev, ...newItems]);
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) { setIsProcessing(false); }
  };

  const handleNewQuoteClick = () => {
    setItems([DEFAULT_LINE_ITEM(products)]);
    setSelectedCustomerId('');
    setNotes('');
    setDiscountInput(0);
    setDiscountType('percentage');
    setTaxRate(13);
    setEnergyRate(8);
    setEditingDoc(null);
    setActiveView('New Quote');
  };

  const editDocument = (doc) => {
    setEditingDoc(doc);
    setItems(doc.items);
    setSelectedCustomerId(doc.customerId);
    setNotes(doc.notes || '');
    setDiscountType(doc.summary.discountType || 'percentage');
    setDiscountInput(doc.summary.discountInput || 0);
    setTaxRate(doc.summary.taxRate || 13);
    setEnergyRate(doc.summary.energyRate || 8);
    setActiveView('New Quote');
  };

  const saveDocument = () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) {
      alert("Please select a customer first.");
      return;
    }

    const docType = editingDoc ? editingDoc.type : 'Quote';
    const prefix = docType === 'Quote' ? 'Q' : docType === 'Order' ? 'S' : 'I';

    const newDoc = {
      id: editingDoc?.id || generateId(),
      docNumber: editingDoc?.docNumber || `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`,
      type: docType,
      customerId: customer.id,
      customerName: customer.name,
      date: editingDoc?.date || new Date().toISOString().split('T')[0],
      items: [...items],
      summary: { ...summary },
      notes,
      status: editingDoc?.status || 'Active'
    };

    if (editingDoc) {
      setDocuments(documents.map(d => d.id === editingDoc.id ? newDoc : d));
    } else {
      setDocuments([newDoc, ...documents]);
    }

    setActiveView(docType === 'Quote' ? 'Quotes' : docType === 'Order' ? 'Sales Orders' : 'Invoices');
    setEditingDoc(null);
  };

  const convertDocument = (docId, nextType) => {
    const originalDoc = documents.find(d => d.id === docId);
    if (!originalDoc) return;

    const prefix = nextType === 'Quote' ? 'Q' : nextType === 'Order' ? 'S' : 'I';
    const suffix = originalDoc.docNumber.includes('-') ? originalDoc.docNumber.split('-')[1] : originalDoc.docNumber;

    const newDoc = {
      ...originalDoc,
      id: generateId(),
      type: nextType,
      docNumber: `${prefix}-${suffix}`,
      status: nextType === 'Invoice' ? 'Unpaid' : 'Pending',
      date: new Date().toISOString().split('T')[0],
    };

    setDocuments([newDoc, ...documents]);
    setActiveView(nextType === 'Quote' ? 'Quotes' : nextType === 'Order' ? 'Sales Orders' : 'Invoices');
  };

  const handlePrintRequest = (doc) => {
    setPrintDoc(doc);
    setIsPrintConfigOpen(true);
  };

  const executePrint = () => {
    setIsPrintConfigOpen(false);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer = {
      id: editingCustomer?.id || generateId(),
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      address: String(formData.get('address') || ''),
    };
    if (editingCustomer) {
      setCustomers(customers.map(c => c.id === editingCustomer.id ? newCustomer : c));
    } else {
      setCustomers([...customers, newCustomer]);
    }
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProduct = {
      id: editingProduct?.id || generateId(),
      name: String(formData.get('name') || ''),
      price: parseFloat(String(formData.get('price') || '0')),
    };
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? newProduct : p));
    } else {
      setProducts([...products, newProduct]);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleSaveService = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newService = {
      id: editingService?.id || generateId(),
      name: String(formData.get('name') || ''),
      unitPrice: parseFloat(String(formData.get('unitPrice') || '0')),
    };
    if (editingService) {
      setServicesDef(servicesDef.map(s => s.id === editingService.id ? newService : s));
    } else {
      setServicesDef([...servicesDef, newService]);
    }
    setIsServiceModalOpen(false);
    setEditingService(null);
  };

  const handleSaveCompanyProfile = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedProfile = {
      name: String(formData.get('name') || ''),
      address: String(formData.get('address') || ''),
      phone: String(formData.get('phone') || ''),
      email: String(formData.get('email') || ''),
      slogan: String(formData.get('slogan') || ''),
      hstNumber: String(formData.get('hstNumber') || ''),
    };
    setCompanyProfile(updatedProfile);
    alert("Company profile updated successfully!");
  };

  const togglePrintOption = (key) => {
    setPrintOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderNewQuote = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-screen flex flex-col overflow-hidden animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">{editingDoc ? `Edit ${editingDoc.type} #${editingDoc.docNumber}` : 'New Quote'}</h1>
          <div className="bg-blue-50 px-3 py-1 rounded-full"><span className="text-[10px] font-black text-blue-600 uppercase">Draft Mode</span></div>
        </div>
        <div className="flex items-center gap-2">
           {editingDoc && (
             <button onClick={() => handlePrintRequest(editingDoc)} className="p-2.5 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-600 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest"><Printer size={16}/> Print</button>
           )}
           <button onClick={() => setActiveView('Quotes')} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-10 overflow-y-auto bg-[#FBFBFC]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-6 max-w-6xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-600 mb-1.5 font-bold uppercase tracking-tight">Customer Name*</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm appearance-none"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="p-2.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 shadow-lg shadow-blue-100"><Search size={18} /></button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Date</label>
              <input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white shadow-sm" defaultValue={editingDoc?.date || new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{editingDoc?.type || 'Quote'}#</label>
              <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 font-bold" value={editingDoc?.docNumber || "Q-AUTO"} readOnly />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Item Table</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4 w-[280px]">Item Details</th>
                  <th className="px-3 py-4 text-center w-20">Quantity</th>
                  <th className="px-3 py-4 text-center w-28">Width</th>
                  <th className="px-3 py-4 text-center w-28">Height</th>
                  <th className="px-3 py-4 text-center w-28">Price / SqFt</th>
                  <th className="px-3 py-4 text-center w-24">Sq Ft</th>
                  <th className="px-3 py-4 text-center w-28">Glass Total</th>
                  <th className="px-6 py-4 text-right w-[200px]">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => {
                  const totals = calculateItemTotals(item);
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-6 align-top">
                          <select 
                            value={item.glassType}
                            onChange={(e) => updateItem(item.id, { glassType: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-blue-400 transition-all"
                          >
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-6 align-top">
                          <input type="number" className="w-full text-center py-2 border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-400" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })} />
                        </td>
                        <td className="px-3 py-6 align-top">
                          <input className="w-full text-center py-2 border border-slate-200 rounded-lg text-sm font-medium shadow-sm outline-none focus:border-blue-400" placeholder="Width" value={item.width} onChange={e => updateItem(item.id, { width: e.target.value })} />
                        </td>
                        <td className="px-3 py-6 align-top">
                          <input className="w-full text-center py-2 border border-slate-200 rounded-lg text-sm font-medium shadow-sm outline-none focus:border-blue-400" placeholder="Height" value={item.height} onChange={e => updateItem(item.id, { height: e.target.value })} />
                        </td>
                        <td className="px-3 py-6 align-top">
                          <div className="relative">
                            <span className="absolute left-2.5 top-2 text-[10px] text-slate-300 font-bold">$</span>
                            <input type="number" className="w-full pl-5 pr-2 py-2 border border-slate-200 rounded-lg text-sm font-bold shadow-sm outline-none focus:border-blue-400" value={item.pricePerSqFt} onChange={e => updateItem(item.id, { pricePerSqFt: parseFloat(e.target.value) || 0 })} />
                          </div>
                        </td>
                        <td className="px-3 py-6 text-center align-top pt-8">
                          <span className="text-sm font-bold text-slate-800">{formatSqFt(totals.sqFt)}</span>
                        </td>
                        <td className="px-3 py-6 text-center align-top pt-8">
                          <span className="text-sm font-bold text-slate-800">{formatCurrency(totals.glassTotal)}</span>
                        </td>
                        <td rowSpan={2 + (item.itemServices?.length || 0)} className="px-6 py-6 align-top text-right bg-blue-50/20 border-l border-blue-50">
                           <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center min-w-[180px] group/box relative">
                              <span className="text-2xl font-black text-slate-900 tracking-tight tabular-nums">{formatCurrency(totals.lineTotal)}</span>
                              <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover/box:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                           </div>
                        </td>
                      </tr>
                      {(item.itemServices || []).map((serviceRow) => (
                        <tr key={serviceRow.id} className="bg-white border-t border-slate-50">
                          <td className="px-6 py-4 pl-12">
                            <select 
                              value={serviceRow.serviceId}
                              onChange={e => updateServiceRow(item.id, serviceRow.id, { serviceId: e.target.value })}
                              className="w-full px-3 py-1.5 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-500 bg-slate-50 outline-none focus:border-blue-200 transition-all"
                            >
                              <option value="">Service Selection Dropdown</option>
                              {servicesDef.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-300 uppercase mb-1">Units/In</span>
                              <input type="number" className="w-16 text-center py-1 border border-slate-100 rounded text-xs font-bold outline-none" value={serviceRow.quantity} onChange={e => updateServiceRow(item.id, serviceRow.id, { quantity: parseFloat(e.target.value) || 0 })} />
                            </div>
                          </td>
                          <td colSpan={2} />
                          <td className="px-3 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-300 uppercase mb-1">Price</span>
                              <div className="relative w-20">
                                <span className="absolute left-1.5 top-0.5 text-[9px] text-slate-300 font-bold">$</span>
                                <input type="number" className="w-full pl-4 pr-1 py-0.5 border border-slate-100 rounded text-xs font-bold outline-none" value={serviceRow.price} onChange={e => updateServiceRow(item.id, serviceRow.id, { price: parseFloat(e.target.value) || 0 })} />
                              </div>
                            </div>
                          </td>
                          <td />
                          <td className="px-3 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] font-black text-slate-300 uppercase mb-1">Service Total</span>
                              <span className="text-xs font-black text-slate-600">{formatCurrency(serviceRow.quantity * serviceRow.price)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-white border-t border-slate-50">
                        <td colSpan={7} className="px-12 py-3">
                           <div className="flex items-center justify-between">
                              <button onClick={() => addServiceToItem(item.id)} className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-700 flex items-center gap-2 transition-colors">
                                 <Plus size={12}/> Add New Service Row
                              </button>
                              {index === items.length - 1 && (
                                <button 
                                  onClick={addItem} 
                                  className="text-emerald-600 text-[12px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-emerald-800 transition-all hover:scale-105"
                                >
                                   <PlusCircle size={16}/> Add New Item Row
                                </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Customer Notes</label>
              <textarea 
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm h-24 shadow-sm outline-none focus:border-blue-400 resize-none transition-all" 
                placeholder="Notes for the customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-3 text-blue-700 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-blue-900 transition-all">
               <Camera size={18} /> AI Vision Recognition
               <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-10 space-y-6 shadow-sm">
             {/* Financial Summary Breakdown */}
             <div className="flex justify-between items-center group">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sub Total</span>
               <span className="text-lg font-black text-slate-900">{formatCurrency(summary.subtotal)}</span>
             </div>

             {/* Discount Row */}
             <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Discount</span>
                  <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button 
                      onClick={() => setDiscountType('percentage')}
                      className={`p-1.5 rounded-md transition-all ${discountType === 'percentage' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                      <Percent size={12} />
                    </button>
                    <button 
                      onClick={() => setDiscountType('dollar')}
                      className={`p-1.5 rounded-md transition-all ${discountType === 'dollar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                    >
                      <DollarSign size={12} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-24 px-3 py-1.5 border border-slate-200 rounded-lg text-center text-sm font-bold shadow-sm focus:border-blue-400 outline-none" 
                      value={discountInput} 
                      onChange={e => setDiscountInput(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-600">-{formatCurrency(summary.discountValue)}</span>
                </div>
             </div>

             {/* Surcharge & Tax Grid */}
             <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Energy Surcharge</span>
                      <div className="flex items-center gap-1">
                        <input 
                           type="number" 
                           className="w-12 px-1 py-0.5 border border-slate-200 rounded text-center text-[11px] font-bold outline-none focus:border-blue-400" 
                           value={energyRate} 
                           onChange={e => setEnergyRate(parseFloat(e.target.value) || 0)} 
                        />
                        <span className="text-[10px] font-bold text-slate-400">%</span>
                      </div>
                   </div>
                   <div className="text-right text-sm font-bold text-slate-600">{formatCurrency(summary.energyCharge)}</div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tax (HST/GST)</span>
                      <select 
                        className="text-[11px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer"
                        value={taxRate}
                        onChange={e => setTaxRate(parseFloat(e.target.value))}
                      >
                         <option value="0">0%</option>
                         <option value="5">5%</option>
                         <option value="13">13%</option>
                         <option value="15">15%</option>
                      </select>
                   </div>
                   <div className="text-right text-sm font-bold text-slate-600">{formatCurrency(summary.hstCharge)}</div>
                </div>
             </div>

             {/* Grand Total Footer */}
             <div className="pt-6 border-t border-slate-200 mt-6 flex justify-between items-end">
                <div className="flex flex-col">
                   <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest mb-1">Estimated Grand Total</span>
                   <span className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrency(summary.total)}</span>
                </div>
                <div className="text-right">
                   <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Calculated Metrics</span>
                   <span className="text-sm font-bold text-slate-700">{formatSqFt(summary.totalSqFt)} Sq Ft / {summary.totalQty} Units</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-8 border-t border-slate-100 flex justify-end gap-4 bg-white z-20">
         <button onClick={() => setActiveView('Quotes')} className="px-8 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all">Cancel</button>
         <button onClick={saveDocument} className="px-10 py-3 bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-800 shadow-xl shadow-blue-100 transition-all">
           {editingDoc ? `Update ${editingDoc.type}` : 'Save & Send'}
         </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Pending Quotes', val: documents.filter(d => d.type === 'Quote').length.toString(), color: 'text-blue-700', trend: '+2%' },
          { label: 'Active Orders', val: documents.filter(d => d.type === 'Order').length.toString(), color: 'text-sky-600', trend: 'Stable' },
          { label: 'Active Customers', val: customers.length.toString(), color: 'text-amber-500', trend: '+1 new' },
          { label: 'Total Invoiced', val: formatCurrency(documents.filter(d => d.type === 'Invoice').reduce((acc, d) => acc + d.summary.total, 0)), color: 'text-slate-900', trend: '+15%' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className={`text-2xl font-black tracking-tight mb-1 truncate ${stat.color}`}>{stat.val}</div>
            <div className="flex justify-between items-center">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
              <div className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 rounded">{stat.trend}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Recent Activity</h3>
         <div className="space-y-4">
            {documents.slice(0, 5).map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.type === 'Quote' ? 'bg-blue-50 text-blue-700' : doc.type === 'Order' ? 'bg-sky-50 text-sky-600' : 'bg-amber-50 text-amber-500'}`}><FileText size={18}/></div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{doc.type} #{doc.docNumber}</div>
                    <div className="text-xs text-slate-400">{doc.customerName} • {doc.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(doc.summary.total)}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => editDocument(doc)} className="text-[10px] font-black text-blue-700 uppercase tracking-widest hover:underline">View</button>
                    <button onClick={() => handlePrintRequest(doc)} className="text-slate-300 hover:text-slate-600 transition-colors"><Printer size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
            {documents.length === 0 && <div className="text-center py-10 text-slate-400 text-sm font-medium">No recent activity yet.</div>}
         </div>
      </div>
    </div>
  );

  const renderDocumentList = (type) => {
    const list = documents.filter(d => d.type === type);
    const theme = type === 'Quote' ? 'blue' : type === 'Order' ? 'sky' : 'amber';
    const primaryColor = theme === 'blue' ? 'blue-700' : theme === 'sky' ? 'sky-600' : 'amber-500';
    
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
           <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{type} History</h2>
           {type === 'Quote' && (
             <button onClick={handleNewQuoteClick} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all flex items-center gap-2"><Plus size={14}/> New Quote</button>
           )}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-8 py-4">{type} #</th>
              <th className="px-8 py-4">Customer</th>
              <th className="px-8 py-4">Total Amount</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {list.map(doc => (
              <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className={`px-8 py-5 font-black text-${primaryColor}`}>{doc.docNumber}</td>
                <td className="px-8 py-5 font-bold text-slate-800">{doc.customerName}</td>
                <td className="px-8 py-5 font-bold text-slate-900">{formatCurrency(doc.summary.total)}</td>
                <td className="px-8 py-5">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${doc.status === 'Active' ? 'bg-blue-50 text-blue-700' : doc.status === 'Unpaid' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                  <button onClick={() => handlePrintRequest(doc)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100"><Printer size={14}/> Print</button>
                  {type === 'Quote' && (
                    <button 
                      onClick={() => convertDocument(doc.id, 'Order')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-sky-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ArrowRightLeft size={14}/> Convert to Order
                    </button>
                  )}
                  {type === 'Order' && (
                    <button 
                      onClick={() => convertDocument(doc.id, 'Invoice')}
                      className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <FileCheck size={14}/> Convert to Invoice
                    </button>
                  )}
                  <button onClick={() => editDocument(doc)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all shadow-sm">
                    <Edit2 size={14} className="text-slate-400"/>
                  </button>
                  <button onClick={() => setDocuments(documents.filter(d => d.id !== doc.id))} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all ml-2">
                    <Trash2 size={14} className="text-slate-300 hover:text-red-400"/>
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium text-sm">No {type.toLowerCase()}s found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-10 max-w-4xl mx-auto pb-20 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-3">
              <Building2 className="text-blue-700" size={24} />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Company Profile Settings</h2>
           </div>
        </div>
        <form onSubmit={handleSaveCompanyProfile} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Company Name</label>
                <input name="name" defaultValue={companyProfile.name} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Slogan / Tagline</label>
                <input name="slogan" defaultValue={companyProfile.slogan} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">HST Number</label>
                <input name="hstNumber" defaultValue={companyProfile.hstNumber} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Public Email</label>
                <input name="email" type="email" defaultValue={companyProfile.email} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                <input name="phone" defaultValue={companyProfile.phone} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Business Address</label>
                <textarea name="address" defaultValue={companyProfile.address} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" rows={3} required />
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button type="submit" className="flex items-center gap-2 bg-blue-700 text-white font-black uppercase text-xs tracking-[0.1em] px-8 py-3.5 rounded-xl hover:bg-blue-800 transition-all shadow-xl shadow-blue-100">
              <SaveAll size={18} /> Update Company Info
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderCustomersList = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
         <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Customer Management</h2>
         <button onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all flex items-center gap-2"><UserPlus size={14}/> Add Customer</button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <th className="px-8 py-4">Customer Name</th>
            <th className="px-8 py-4">Email</th>
            <th className="px-8 py-4">Phone</th>
            <th className="px-8 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {customers.map(c => (
            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-5 font-black text-slate-900">{c.name}</td>
              <td className="px-8 py-5 text-sm font-medium text-slate-600">{c.email}</td>
              <td className="px-8 py-5 text-sm font-medium text-slate-600">{c.phone}</td>
              <td className="px-8 py-5 text-right">
                <button onClick={() => { setEditingCustomer(c); setIsCustomerModalOpen(true); }} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"><Edit2 size={14} className="text-slate-400"/></button>
                <button onClick={() => setCustomers(customers.filter(cust => cust.id !== c.id))} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all ml-2"><Trash2 size={14} className="text-slate-300 hover:text-red-400"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderProductsList = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
         <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Products (Glass Types)</h2>
         <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-sky-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-100 hover:bg-sky-700 transition-all flex items-center gap-2"><Plus size={14}/> Add Product</button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <th className="px-8 py-4">Product Name</th>
            <th className="px-8 py-4">Price / SqFt</th>
            <th className="px-8 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {products.map(p => (
            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-5 font-black text-slate-900">{p.name}</td>
              <td className="px-8 py-5 font-bold text-slate-600">{formatCurrency(p.price)}</td>
              <td className="px-8 py-5 text-right">
                <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"><Edit2 size={14} className="text-slate-400"/></button>
                <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all ml-2"><Trash2 size={14} className="text-slate-300 hover:text-red-400"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderServicesList = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
         <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Services & Labor</h2>
         <button onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all flex items-center gap-2"><Plus size={14}/> Add Service</button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <th className="px-8 py-4">Service Name</th>
            <th className="px-8 py-4">Unit Price</th>
            <th className="px-8 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {servicesDef.map(s => (
            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-5 font-black text-slate-900">{s.name}</td>
              <td className="px-8 py-5 font-bold text-slate-600">{formatCurrency(s.unitPrice)}</td>
              <td className="px-8 py-5 text-right">
                <button onClick={() => { setEditingService(s); setIsServiceModalOpen(true); }} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"><Edit2 size={14} className="text-slate-400"/></button>
                <button onClick={() => setServicesDef(servicesDef.filter(item => item.id !== s.id))} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all ml-2"><Trash2 size={14} className="text-slate-300 hover:text-red-400"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const PrintTemplate = ({ doc }) => {
    if (!doc) return null;
    const customer = customers.find(c => c.id === doc.customerId);
    return (
      <div id="print-area" className="hidden print:block p-10 bg-white text-slate-900 font-sans min-h-screen">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            {printOptions.showLogo && <VGMLogoIcon className="w-16 h-16" />}
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-blue-900 uppercase">{companyProfile.name.split(' ').map(w => w[0]).join('')}</h1>
              {printOptions.showSlogan && <p className="text-[10px] text-blue-800 font-black uppercase tracking-widest">{companyProfile.slogan}</p>}
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black text-slate-200 uppercase tracking-tighter mb-1">{doc.type}</h2>
            <p className="text-sm font-black text-slate-900">#{doc.docNumber}</p>
            <p className="text-xs text-slate-400 font-bold">{doc.date}</p>
            {printOptions.showHSTNumber && companyProfile.hstNumber && <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">HST: {companyProfile.hstNumber}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-20 mb-12">
          <div>
            {printOptions.showCustomerContact && (
              <>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Bill To</h3>
                <p className="text-lg font-black text-slate-900 mb-1">{customer?.name}</p>
                <p className="text-sm text-slate-600 mb-0.5">{customer?.email}</p>
                <p className="text-sm text-slate-600 mb-0.5">{customer?.phone}</p>
                <p className="text-sm text-slate-600 whitespace-pre-line">{customer?.address}</p>
              </>
            )}
          </div>
          <div className="text-right flex flex-col items-end">
            {printOptions.showCompanyContact && (
              <>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Company Details</h3>
                <p className="text-sm font-black text-slate-800">{companyProfile.name}</p>
                <p className="text-sm text-slate-500 whitespace-pre-line">{companyProfile.address}</p>
                <p className="text-sm text-slate-500">{companyProfile.email}</p>
                <p className="text-sm text-slate-500">{companyProfile.phone}</p>
              </>
            )}
          </div>
        </div>

        <table className="w-full border-collapse mb-10">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4">Item Description</th>
              {printOptions.showDimensions && <th className="py-4 text-center">Dimensions</th>}
              <th className="py-4 text-center">Qty</th>
              {printOptions.showPricePerSqFt && <th className="py-4 text-center">Price / SqFt</th>}
              <th className="py-4 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {doc.items.map(item => {
              const prod = products.find(p => p.id === item.glassType);
              const totals = calculateItemTotals(item);
              return (
                <React.Fragment key={item.id}>
                  <tr>
                    <td className="py-5">
                      <p className="font-black text-slate-900">{prod?.name || item.glassType}</p>
                      {printOptions.showItemServices && (item.itemServices || []).map(s => {
                        const sDef = servicesDef.find(sd => sd.id === s.serviceId);
                        return <p key={s.id} className="text-[10px] text-slate-400 font-bold">+ {sDef?.name} ({s.quantity}x)</p>;
                      })}
                    </td>
                    {printOptions.showDimensions && <td className="py-5 text-center font-bold text-slate-700">{item.width} x {item.height}</td>}
                    <td className="py-5 text-center font-bold text-slate-700">{item.quantity}</td>
                    {printOptions.showPricePerSqFt && <td className="py-5 text-center font-bold text-slate-700">{formatCurrency(item.pricePerSqFt)}</td>}
                    <td className="py-5 text-right font-black text-slate-900">{formatCurrency(totals.lineTotal)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-between items-start gap-20">
          <div className="max-w-md">
            {printOptions.showNotes && (
              <>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Terms & Notes</h3>
                <p className="text-xs text-slate-500 leading-relaxed italic">{doc.notes || "No additional notes provided."}</p>
              </>
            )}
          </div>
          <div className="w-64 space-y-3">
            <div className="flex justify-between items-center text-sm font-bold text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(doc.summary.subtotal)}</span>
            </div>
            {doc.summary.discountValue > 0 && (
              <div className="flex justify-between items-center text-sm font-bold text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(doc.summary.discountValue)}</span>
              </div>
            )}
            {printOptions.showSummaryBreakdown && (
              <>
                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                  <span>Energy Charge ({doc.summary.energyRate}%)</span>
                  <span>{formatCurrency(doc.summary.energyCharge)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                  <span>HST ({doc.summary.taxRate}%)</span>
                  <span>{formatCurrency(doc.summary.hstCharge)}</span>
                </div>
              </>
            )}
            <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-widest">Total</span>
              <span className="text-2xl font-black text-slate-900">{formatCurrency(doc.summary.total)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex h-screen bg-[#F3F4F6] font-sans text-slate-700 overflow-hidden print:hidden">
        <aside className="w-64 bg-[#1E293B] text-[#94A3B8] flex flex-col shrink-0 z-30">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <VGMLogoIcon className="w-12 h-12" />
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl tracking-tighter leading-none">{companyProfile.name.split(' ').map(w => w[0]).join('')}</span>
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.1em] leading-tight truncate max-w-[140px]">{companyProfile.name}</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
            <button onClick={() => setActiveView('Dashboard')} className={`w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Dashboard' ? 'bg-slate-800 text-white shadow-inner' : 'hover:bg-slate-800/50'}`}>
              <div className="flex items-center gap-3"><LayoutDashboard size={18} /> Dashboard</div>
            </button>
            
            <div>
              <button onClick={() => setIsQuotesOpen(!isQuotesOpen)} className={`w-full flex items-center justify-between px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Quotes' || activeView === 'New Quote' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}>
                <div className="flex items-center gap-3"><FileText size={18} /> Quotes</div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isQuotesOpen ? '' : '-rotate-90'}`} />
              </button>
              {isQuotesOpen && (
                <div className="mt-1 ml-4 pl-4 border-l border-slate-800 space-y-1 py-2">
                  <button onClick={handleNewQuoteClick} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'New Quote' && !editingDoc ? 'text-white bg-blue-500/10' : 'text-slate-400 hover:text-white'}`}>+ New Quote</button>
                  <button onClick={() => setActiveView('Quotes')} className={`w-full text-left px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'Quotes' ? 'text-white bg-slate-800/40' : 'text-slate-400 hover:text-white'}`}>Quote List</button>
                </div>
              )}
            </div>

            <button onClick={() => setActiveView('Sales Orders')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Sales Orders' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}><ShoppingCart size={18} /> Sales Orders</button>
            <button onClick={() => setActiveView('Invoices')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Invoices' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}><Receipt size={18} /> Invoices</button>
            <button onClick={() => setActiveView('Customers')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Customers' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}><Users size={18} /> Customers</button>
            <button onClick={() => setActiveView('Products')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Products' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}><Package size={18} /> Products</button>
            <button onClick={() => setActiveView('Services')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Services' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}><Briefcase size={18} /> Services</button>
            <button onClick={() => setActiveView('Settings')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-bold transition-all ${activeView === 'Settings' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50'}`}><SettingsIcon size={18} /> Settings</button>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-20">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">{activeView}</h2>
          </header>

          <main className="flex-1 overflow-y-auto p-10">
            <div className="max-w-[1500px] mx-auto">
              {activeView === 'Dashboard' && renderDashboard()}
              {(activeView === 'Quotes' || activeView === 'Sales Orders' || activeView === 'Invoices') && activeView !== 'New Quote' && renderDocumentList(activeView)}
              {activeView === 'New Quote' && renderNewQuote()}
              {activeView === 'Customers' && renderCustomersList()}
              {activeView === 'Products' && renderProductsList()}
              {activeView === 'Services' && renderServicesList()}
              {activeView === 'Settings' && renderSettings()}
            </div>
          </main>

          <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title={editingCustomer ? "Edit Customer" : "Add Customer"}>
            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label><input name="name" defaultValue={editingCustomer?.name} className="w-full px-4 py-2 border rounded-lg mt-1 outline-none font-bold" required /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label><input name="email" type="email" defaultValue={editingCustomer?.email} className="w-full px-4 py-2 border rounded-lg mt-1 outline-none font-bold" required /></div>
              <button type="submit" className="w-full bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl mt-2">Save Customer</button>
            </form>
          </Modal>

          <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? "Edit Product" : "Add Product"}>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</label><input name="name" defaultValue={editingProduct?.name} className="w-full px-4 py-2 border rounded-lg mt-1 outline-none font-bold" required /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price / SqFt</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} className="w-full px-4 py-2 border rounded-lg mt-1 outline-none font-bold" required /></div>
              <button type="submit" className="w-full bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl mt-2">Save Product</button>
            </form>
          </Modal>

          <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingService ? "Edit Service" : "Add Service"}>
            <form onSubmit={handleSaveService} className="space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Name</label><input name="name" defaultValue={editingService?.name} className="w-full px-4 py-2 border rounded-lg mt-1 outline-none font-bold" required /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</label><input name="unitPrice" type="number" step="0.01" defaultValue={editingService?.unitPrice} className="w-full px-4 py-2 border rounded-lg mt-1 outline-none font-bold" required /></div>
              <button type="submit" className="w-full bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl mt-2">Save Service</button>
            </form>
          </Modal>

          <Modal isOpen={isPrintConfigOpen} onClose={() => setIsPrintConfigOpen(false)} title="Print Preview Options" maxWidth="max-w-2xl">
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(printOptions).map((key) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={printOptions[key]} onChange={() => togglePrintOption(key)} />
                    <span className="text-sm font-bold">{key.replace('show', '').replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
              <button onClick={executePrint} className="w-full bg-blue-700 text-white font-black py-3 rounded-xl">Generate PDF/Print</button>
            </div>
          </Modal>

          {isProcessing && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center">
               <div className="bg-white p-12 rounded-3xl shadow-2xl flex flex-col items-center gap-6">
                  <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <h3 className="text-xl font-black text-slate-900">AI Sketch Recognition...</h3>
               </div>
            </div>
          )}
        </div>
      </div>
      
      <PrintTemplate doc={printDoc} />
    </>
  );
};

export default App;
