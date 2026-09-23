import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, DollarSign,
  QrCode, UserPlus, FileText, CheckCircle, AlertTriangle, LogOut, ArrowLeft,
  History, Users, RefreshCw, BarChart2, ShieldAlert, Printer, XCircle, Eye,
  ArrowUpRight, ArrowDownRight, UserCheck, Phone, MapPin, Tag, Lock, ShieldCheck,
  Calendar, CalendarDays, Filter, RotateCcw, TrendingUp, X
} from 'lucide-react';
import { API_BASE } from '../config/api';

export function PdvApp() {
  const { user, token, logout } = useAuth();
  
  // Abas do PDV: 'pos' (Caixa), 'history' (Histórico), 'customers' (Clientes), 'exchanges' (Trocas), 'summary' (Resumo)
  const [activeTab, setActiveTab] = useState('pos');

  // Estados do Caixa / Produtos
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  
  // Sessão de Caixa
  const [cashSession, setCashSession] = useState(null);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashModalType, setCashModalType] = useState('OPEN'); // 'OPEN', 'CLOSE', 'SANGRIA', 'SUPRIMENTO'
  const [cashAmountInput, setCashAmountInput] = useState('');
  // Checkout & Pagamentos
  const [discountTotal, setDiscountTotal] = useState(0);
  const [payments, setPayments] = useState([]);
  const [payType, setPayType] = useState('DINHEIRO');
  const [payAmount, setPayAmount] = useState('');
  const [receivedMoney, setReceivedMoney] = useState('');
  const [cardBrand, setCardBrand] = useState('VISA_MASTER'); // 'VISA_MASTER', 'ELO', 'HIPERCARD', 'AMEX', 'OUTRAS'
  const [authorizerUserId, setAuthorizerUserId] = useState('');

  // Histórico de Vendas & Filtros de Data
  const [selectedDatePreset, setSelectedDatePreset] = useState('TODAS'); // 'TODAS', 'HOJE', 'ONTEM', '7DIAS', 'CUSTOM'
  const [customDateFilter, setCustomDateFilter] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('TODOS'); // 'TODOS', 'CONCLUIDA', 'CANCELADA'

  const [installments, setInstallments] = useState('1');
  const [feePayer, setFeePayer] = useState('LOJA'); // 'LOJA' (empresa assume) ou 'CLIENTE' (repassar juros)
  const [paymentFees, setPaymentFees] = useState({
    operatorName: 'Stone / PagBank',
    pixFeePct: 0.0,
    debitFeePct: 1.25,
    maxInstallments: 18,
    installmentRates: {
      '1': 3.15, '2': 4.15, '3': 4.95, '4': 5.75, '5': 6.45, '6': 7.15,
      '7': 8.05, '8': 8.85, '9': 9.65, '10': 10.45, '11': 11.15, '12': 11.85,
      '13': 12.65, '14': 13.35, '15': 14.05, '16': 14.75, '17': 15.45, '18': 16.15
    },
    brands: {
      VISA_MASTER: {
        name: 'Visa & Mastercard',
        debitFeePct: 1.25,
        installmentRates: {
          '1': 3.15, '2': 4.15, '3': 4.95, '4': 5.75, '5': 6.45, '6': 7.15,
          '7': 8.05, '8': 8.85, '9': 9.65, '10': 10.45, '11': 11.15, '12': 11.85,
          '13': 12.65, '14': 13.35, '15': 14.05, '16': 14.75, '17': 15.45, '18': 16.15
        }
      },
      ELO: {
        name: 'Elo',
        debitFeePct: 1.75,
        installmentRates: {
          '1': 3.49, '2': 4.59, '3': 5.49, '4': 6.29, '5': 7.09, '6': 7.89,
          '7': 8.79, '8': 9.59, '9': 10.39, '10': 11.19, '11': 11.89, '12': 12.59,
          '13': 13.39, '14': 14.09, '15': 14.79, '16': 15.49, '17': 16.19, '18': 16.89
        }
      },
      HIPERCARD: {
        name: 'Hipercard',
        debitFeePct: 1.65,
        installmentRates: {
          '1': 3.39, '2': 4.45, '3': 5.35, '4': 6.15, '5': 6.95, '6': 7.65,
          '7': 8.55, '8': 9.35, '9': 10.15, '10': 10.95, '11': 11.65, '12': 12.35,
          '13': 13.15, '14': 13.85, '15': 14.55, '16': 15.25, '17': 15.95, '18': 16.65
        }
      },
      AMEX: {
        name: 'American Express',
        debitFeePct: 1.90,
        installmentRates: {
          '1': 3.65, '2': 4.79, '3': 5.69, '4': 6.59, '5': 7.39, '6': 8.19,
          '7': 9.09, '8': 9.89, '9': 10.69, '10': 11.49, '11': 12.19, '12': 12.89,
          '13': 13.69, '14': 14.39, '15': 15.09, '16': 15.79, '17': 16.49, '18': 17.19
        }
      },
      OUTRAS: {
        name: 'Outras Bandeiras',
        debitFeePct: 1.99,
        installmentRates: {
          '1': 3.79, '2': 4.95, '3': 5.85, '4': 6.75, '5': 7.55, '6': 8.35,
          '7': 9.25, '8': 10.05, '9': 10.85, '10': 11.65, '11': 12.35, '12': 13.05,
          '13': 13.85, '14': 14.55, '15': 15.25, '16': 15.95, '17': 16.65, '18': 17.35
        }
      }
    },
    defaultFeePayer: 'LOJA'
  });
  const [showReceipt, setShowReceipt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Histórico de Vendas
  const [salesList, setSalesList] = useState([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Gestão de Clientes
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerForm, setCustomerForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '500'
  });
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState(null);

  // Trocas & Devoluções
  const [exchangeSaleCode, setExchangeSaleCode] = useState('');
  const [exchangeSaleData, setExchangeSaleData] = useState(null);
  const [selectedExchangeItems, setSelectedExchangeItems] = useState([]);
  const [exchangeReason, setExchangeReason] = useState('TAMANHO_INCORRETO');
  const [exchangeCondition, setExchangeCondition] = useState('NOVO');
  const [exchangeReturnToStock, setExchangeReturnToStock] = useState(true);
  const [exchangeReceipt, setExchangeReceipt] = useState(null);

  const barcodeInputRef = useRef(null);

  // Carregar dados iniciais
  useEffect(() => {
    fetchProducts();
    fetchCashStatus();
    fetchCustomers();
    fetchSales();
    fetchPaymentFees();
  }, [token]);

  const fetchPaymentFees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/payment-fees`);
      if (res.ok) {
        const data = await res.json();
        if (data.fees) {
          setPaymentFees(data.fees);
          if (data.fees.defaultFeePayer) {
            setFeePayer(data.fees.defaultFeePayer);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao carregar taxas da maquininha no PDV:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCashStatus = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/cash/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCashSession(data.activeSession);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCustomers(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSales = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSalesList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Leitor de Código de Barras no PDV
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const match = products.find(p => p.barcode === searchQuery || p.sku.toLowerCase() === searchQuery.toLowerCase());
      if (match) {
        addToCart(match);
        setSearchQuery('');
      }
    }
  };

  // Carrinho
  const addToCart = (product, selectedVariant = null) => {
    const variant = selectedVariant || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
    const itemKey = variant ? `${product.id}-${variant.id}` : product.id;

    const existingIndex = cart.findIndex(i => i.itemKey === itemKey);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        itemKey,
        productId: product.id,
        variantId: variant ? variant.id : null,
        productName: product.name,
        productSku: variant ? variant.sku : product.sku,
        size: variant ? variant.size : 'Único',
        unitPrice: variant && variant.price ? variant.price : (product.promoPrice || product.price),
        unitCost: product.costPrice || 0,
        qty: 1
      }]);
    }
  };

  const updateQty = (itemKey, delta) => {
    const updated = cart.map(i => {
      if (i.itemKey === itemKey) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean);
    setCart(updated);
  };

  const removeItem = (itemKey) => {
    setCart(cart.filter(i => i.itemKey !== itemKey));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.unitPrice * i.qty), 0);
  const total = Math.max(0, subtotal - discountTotal);
  const totalPaid = payments.reduce((acc, p) => acc + (p.baseAmount !== undefined ? p.baseAmount : p.amount), 0);
  const remaining = Math.max(0, total - totalPaid);

  const getSelectedFeeRate = () => {
    if (payType === 'PIX') return paymentFees.pixFeePct || 0;
    const currentBrand = paymentFees.brands?.[cardBrand] || paymentFees.brands?.VISA_MASTER || {};
    if (payType === 'DEBITO') {
      return currentBrand.debitFeePct !== undefined ? currentBrand.debitFeePct : (paymentFees.debitFeePct || 0);
    }
    if (payType === 'CREDITO') {
      const instKey = String(installments || '1');
      if (currentBrand.installmentRates && currentBrand.installmentRates[instKey] !== undefined) {
        return currentBrand.installmentRates[instKey];
      }
      return (paymentFees.installmentRates && paymentFees.installmentRates[instKey] !== undefined)
        ? paymentFees.installmentRates[instKey]
        : (paymentFees.credit1xFeePct || 3.15);
    }
    return 0;
  };

  const handleAddPayment = () => {
    const baseAmt = parseFloat(payAmount || remaining);
    if (baseAmt <= 0) return;

    if (payType === 'CREDIARIO' && !selectedCustomer) {
      setErrorMsg('Venda no crediário exige cliente identificado.');
      return;
    }

    const rate = getSelectedFeeRate();
    const inst = payType === 'CREDITO' ? parseInt(installments || 1) : 1;
    const isClientPayer = ['CREDITO', 'DEBITO', 'PIX'].includes(payType) && feePayer === 'CLIENTE';
    
    // Se o cliente assume, a taxa é somada ao valor cobrado do cliente
    const feeAmount = (baseAmt * rate) / 100;
    const chargedAmt = isClientPayer ? (baseAmt + feeAmount) : baseAmt;
    const netAmt = isClientPayer ? baseAmt : Math.max(0, baseAmt - feeAmount);

    let change = 0;
    if (payType === 'DINHEIRO' && receivedMoney) {
      const rec = parseFloat(receivedMoney);
      if (rec > baseAmt) {
        change = rec - baseAmt;
      }
    }

    setPayments([...payments, {
      type: payType,
      cardBrand: ['CREDITO', 'DEBITO'].includes(payType) ? cardBrand : null,
      amount: chargedAmt,
      baseAmount: baseAmt,
      installments: inst,
      feeRatePct: rate,
      feeAmount: feeAmount,
      feePayer: isClientPayer ? 'CLIENTE' : 'LOJA',
      netAmount: netAmt,
      changeAmount: change
    }]);

    setPayAmount('');
    setReceivedMoney('');
  };

  // Finalizar Venda PDV
  const handleFinalizeSale = async () => {
    setErrorMsg('');
    if (cart.length === 0) {
      setErrorMsg('Adicione produtos ao carrinho antes de finalizar.');
      return;
    }
    if (remaining > 0.05) {
      setErrorMsg(`Saldo restante de R$ ${remaining.toFixed(2)} precisa ser pago.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: selectedCustomer ? selectedCustomer.id : null,
          items: cart,
          payments,
          discountTotal,
          channel: 'PDV'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar venda.');
      }

      setSuccessMsg(`Venda ${data.code} concluída! Estoque e caixa atualizados.`);
      setShowReceipt(data);
      setCart([]);
      setPayments([]);
      setDiscountTotal(0);
      setSelectedCustomer(null);
      fetchProducts();
      fetchCashStatus();
      fetchSales();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Ações de Caixa (Abertura, Fechamento, Sangria, Suprimento)
  const handleCashAction = async () => {
    try {
      let endpoint = '';
      let payload = {};

      if (cashModalType === 'OPEN') {
        endpoint = `${API_BASE}/api/cash/open`;
        payload = { initialAmount: parseFloat(cashAmountInput || 0) };
      } else if (cashModalType === 'CLOSE') {
        endpoint = `${API_BASE}/api/cash/close`;
        payload = { closedAmount: parseFloat(cashAmountInput || 0), divergenceReason: cashReasonInput };
      } else if (cashModalType === 'SANGRIA') {
        endpoint = `${API_BASE}/api/cash/movement`;
        payload = { type: 'SANGRIA', amount: parseFloat(cashAmountInput || 0), description: cashReasonInput || 'Sangria de Caixa' };
      } else if (cashModalType === 'SUPRIMENTO') {
        endpoint = `${API_BASE}/api/cash/movement`;
        payload = { type: 'SUPRIMENTO', amount: parseFloat(cashAmountInput || 0), description: cashReasonInput || 'Suprimento de Caixa' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro na operação de caixa.');
        return;
      }

      setSuccessMsg(`Operação de caixa realizada com sucesso!`);
      setShowCashModal(false);
      setCashAmountInput('');
      setCashReasonInput('');
      fetchCashStatus();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Cancelamento de Venda
  const handleCancelSale = async () => {
    if (!saleToCancel || !cancelReason) return;
    try {
      const res = await fetch(`${API_BASE}/api/sales/${saleToCancel.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao cancelar venda.');
        return;
      }

      setSuccessMsg(data.message);
      setShowCancelModal(false);
      setSaleToCancel(null);
      setCancelReason('');
      setSelectedSaleDetails(null);
      fetchSales();
      fetchProducts();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Cadastrar Cliente
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...customerForm,
          creditLimit: parseFloat(customerForm.creditLimit || 500)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao cadastrar cliente.');
        return;
      }

      setSuccessMsg(`Cliente ${data.name} cadastrado com sucesso!`);
      setShowCustomerModal(false);
      setCustomerForm({ name: '', cpf: '', phone: '', email: '', address: '', creditLimit: '500' });
      fetchCustomers();
      if (activeTab === 'pos') {
        setSelectedCustomer(data);
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Buscar Venda para Troca
  const handleSearchSaleForExchange = async () => {
    if (!exchangeSaleCode) return;
    const found = salesList.find(s => s.code.toLowerCase() === exchangeSaleCode.trim().toLowerCase());
    if (found) {
      setExchangeSaleData(found);
      setSelectedExchangeItems([]);
    } else {
      setErrorMsg(`Venda com código "${exchangeSaleCode}" não encontrada no histórico.`);
    }
  };

  // Processar Troca / Devolução
  const handleProcessExchange = async () => {
    if (!exchangeSaleData || selectedExchangeItems.length === 0) {
      setErrorMsg('Selecione pelo menos um item para devolução/troca.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/exchanges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          originalSaleId: exchangeSaleData.id,
          items: selectedExchangeItems,
          reason: exchangeReason,
          condition: exchangeCondition,
          returningToStock: exchangeReturnToStock
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao processar troca.');
        return;
      }

      setSuccessMsg(`Troca ${data.exchange.code} gerada com sucesso!`);
      setExchangeReceipt(data);
      setExchangeSaleData(null);
      setExchangeSaleCode('');
      setSelectedExchangeItems([]);
      fetchProducts();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Funções Auxiliares de Data Local
  const getSaleLocalDate = (createdAt) => {
    const d = new Date(createdAt);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Filtros
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const filteredSales = salesList.filter(s => {
    // 1. Busca Textual
    const query = salesSearch.toLowerCase().trim();
    const matchesText = !query || (
      s.code.toLowerCase().includes(query) ||
      (s.customer && s.customer.name.toLowerCase().includes(query)) ||
      (s.user && s.user.name.toLowerCase().includes(query)) ||
      (s.payments && s.payments.some(p => p.type.toLowerCase().includes(query)))
    );

    if (!matchesText) return false;

    // 2. Filtro de Status
    if (salesStatusFilter !== 'TODOS' && s.status !== salesStatusFilter) {
      return false;
    }

    // 3. Filtro por Data
    const saleDateStr = getSaleLocalDate(s.createdAt);
    const saleDate = new Date(s.createdAt);

    if (selectedDatePreset === 'HOJE') {
      return saleDateStr === getTodayStr();
    }
    if (selectedDatePreset === 'ONTEM') {
      return saleDateStr === getYesterdayStr();
    }
    if (selectedDatePreset === '7DIAS') {
      const limit = new Date();
      limit.setDate(limit.getDate() - 7);
      limit.setHours(0, 0, 0, 0);
      return saleDate >= limit;
    }
    if (selectedDatePreset === 'CUSTOM' && customDateFilter) {
      return saleDateStr === customDateFilter;
    }

    return true;
  });

  // Métricas do Período/Dia Selecionado
  const filteredCompletedSales = filteredSales.filter(s => s.status === 'CONCLUIDA');
  const filteredCanceledSales = filteredSales.filter(s => s.status === 'CANCELADA');
  const filteredTotalRevenue = filteredCompletedSales.reduce((acc, s) => acc + s.total, 0);
  const filteredAvgTicket = filteredCompletedSales.length > 0 ? (filteredTotalRevenue / filteredCompletedSales.length) : 0;
  const filteredPayments = filteredCompletedSales.flatMap(s => s.payments || []);
  const filteredPix = filteredPayments.filter(p => p.type === 'PIX').reduce((acc, p) => acc + p.amount, 0);
  const filteredCard = filteredPayments.filter(p => ['CREDITO', 'DEBITO'].includes(p.type)).reduce((acc, p) => acc + p.amount, 0);
  const filteredCash = filteredPayments.filter(p => p.type === 'DINHEIRO').reduce((acc, p) => acc + p.amount, 0);
  const filteredCrediario = filteredPayments.filter(p => p.type === 'CREDIARIO').reduce((acc, p) => acc + p.amount, 0);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.cpf && c.cpf.includes(customerSearch)) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  // Totais Globais do Resumo do Caixa Geral
  const cashPayments = salesList.flatMap(s => s.payments || []);
  const totalSalesRevenue = salesList.filter(s => s.status !== 'CANCELADA').reduce((acc, s) => acc + s.total, 0);
  const totalPix = cashPayments.filter(p => p.type === 'PIX').reduce((acc, p) => acc + p.amount, 0);
  const totalCash = cashPayments.filter(p => p.type === 'DINHEIRO').reduce((acc, p) => acc + p.amount, 0);
  const totalDebit = cashPayments.filter(p => p.type === 'DEBITO').reduce((acc, p) => acc + p.amount, 0);
  const totalCredit = cashPayments.filter(p => p.type === 'CREDITO').reduce((acc, p) => acc + p.amount, 0);
  const totalCrediario = cashPayments.filter(p => p.type === 'CREDIARIO').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      
      {/* Top Header Principal */}
      <header className="bg-black border-b border-white/10 px-3 sm:px-6 py-2.5 flex flex-col gap-2.5 w-full">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="/" className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={14} /> <span className="hidden xs:inline">Loja</span>
            </a>
            <div className="h-4 w-px bg-white/20" />
            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1">
              LITRAN <span className="text-[#942620]">PDV</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs">
            {/* Status Caixa */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cashSession ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="font-semibold text-gray-300 hidden sm:inline">
                {cashSession ? `CX01 (R$ ${cashSession.initialAmount.toFixed(2)})` : 'Fechado'}
              </span>
              <button
                onClick={() => {
                  setCashModalType(cashSession ? 'CLOSE' : 'OPEN');
                  setShowCashModal(true);
                }}
                className="text-[10px] sm:text-[11px] bg-neutral-900 border border-white/20 hover:border-white text-white px-2 py-0.5 rounded font-bold transition-colors"
              >
                {cashSession ? 'Fechar' : 'Abrir'}
              </button>
            </div>

            {/* Atalho Admin para Gerência */}
            {['PROPRIETARIA', 'GERENTE'].includes(user?.role) && (
              <a
                href="/admin"
                className="bg-neutral-900 border border-[#dfa666]/40 hover:border-[#dfa666] text-[#dfa666] px-2 py-1 rounded-lg font-bold flex items-center gap-1 text-[10px] sm:text-[11px] transition-all"
              >
                <ShieldCheck size={13} /> <span className="hidden xs:inline">Admin</span>
              </a>
            )}

            {/* Usuário Logado */}
            <div className="text-right hidden md:block max-w-[120px] truncate">
              <span className="block font-bold text-white leading-tight truncate">{user?.name}</span>
              <span className="text-[10px] text-[#dfa666] uppercase font-bold">{user?.role}</span>
            </div>

            <button onClick={logout} title="Sair" className="text-gray-400 hover:text-red-400 transition-colors p-1 shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Abas de Navegação Responsivas (Horizontal Scrollbarless) */}
        <nav className="flex items-center bg-neutral-900/90 border border-white/10 rounded-xl p-1 gap-1 text-xs overflow-x-auto no-scrollbar w-full">
          {[
            { id: 'pos', label: 'Caixa', icon: ShoppingCart },
            { id: 'history', label: 'Vendas', icon: History },
            { id: 'customers', label: 'Clientes', icon: Users },
            { id: 'exchanges', label: 'Trocas', icon: RefreshCw },
            { id: 'summary', label: 'Resumo', icon: BarChart2 }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap flex-1 sm:flex-initial ${
                  activeTab === tab.id ? 'bg-[#942620] text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Alertas */}
      {errorMsg && (
        <div className="bg-red-950/90 text-white px-4 sm:px-6 py-2 text-xs font-bold flex items-center justify-between border-b border-red-500 animate-fadeIn w-full">
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <AlertTriangle size={15} className="text-red-400 shrink-0" />
            <span className="break-words">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="shrink-0 p-1">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-950/90 text-white px-4 sm:px-6 py-2 text-xs font-bold flex items-center justify-between border-b border-emerald-500 animate-fadeIn w-full">
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <CheckCircle size={15} className="text-emerald-400 shrink-0" />
            <span className="break-words">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="shrink-0 p-1">✕</button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL BASEADO NA ABA ATIVA */}
      <main className="flex-1 p-3 sm:p-4 w-full min-w-0 max-w-full overflow-y-auto">
        
        {/* ========================================================
            ABA 1: CAIXA / FRENTE DE VENDA
        ======================================================== */}
        {activeTab === 'pos' && (
          <div className="flex flex-col gap-3 w-full">
            {/* Banner de Ajuda Operacional */}
            <div className="bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-start sm:items-center gap-2">
                <span className="text-[#dfa666] font-black shrink-0">💡 CAIXA:</span>
                <span>Bipe o código de barras ou pesquise. Aceita pagamentos divididos.</span>
              </div>
              <span className="text-[11px] text-gray-500 font-mono hidden md:inline shrink-0">ENTER para buscar</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full min-w-0">
            
              {/* Esquerda: Busca & Catálogo Rápido (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3 w-full min-w-0">
                {/* Barra de Busca e Leitor */}
                <div className="bg-neutral-900 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5 w-full">
                  <Search size={18} className="text-[#942620] shrink-0" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Código de barras, nome ou SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="bg-transparent text-white text-xs w-full min-w-0 focus:outline-none placeholder-gray-500 font-mono"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white text-xs px-1">
                      ✕
                    </button>
                  )}
                </div>

                {/* Grade de Produtos com Estoque */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 max-h-[380px] lg:max-h-[calc(100vh-220px)] overflow-y-auto pr-1 w-full">
                  {filteredProducts.map((p) => {
                    const hasStock = p.stockAvailable > 0;
                    const price = p.promoPrice || p.price;

                    return (
                      <div
                        key={p.id}
                        onClick={() => hasStock && addToCart(p)}
                        className={`p-2.5 sm:p-3 bg-neutral-900/80 border rounded-xl flex flex-col justify-between transition-all select-none min-w-0 ${
                          hasStock
                            ? 'border-white/10 hover:border-[#942620] cursor-pointer hover:bg-neutral-800 active:scale-[0.98]'
                            : 'border-red-950/40 opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-[#dfa666] font-bold uppercase gap-1">
                            <span className="truncate">{p.sku}</span>
                            {p.promoPrice && <span className="bg-[#942620] text-white px-1 rounded shrink-0">PROMO</span>}
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight mt-1 break-words">{p.name}</h4>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-xs font-black text-white whitespace-nowrap">R$ {price.toFixed(2)}</span>
                          <span className={`text-[10px] font-bold shrink-0 ${hasStock ? 'text-emerald-400' : 'text-red-400'}`}>
                            Estoque: {p.stockAvailable}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Direita: Carrinho, Cliente & Checkout (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3 bg-neutral-900/90 border border-white/10 rounded-2xl p-3.5 sm:p-4 w-full min-w-0">
                
                {/* Seleção de Cliente */}
                <div className="flex items-center justify-between bg-black/60 border border-white/10 p-2.5 rounded-xl text-xs gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                    <UserCheck size={16} className={`shrink-0 ${selectedCustomer ? 'text-[#dfa666]' : 'text-gray-500'}`} />
                    {selectedCustomer ? (
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{selectedCustomer.name}</span>
                        <span className="text-[10px] text-gray-400 truncate block">CPF: {selectedCustomer.cpf || 'Não inf.'}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 truncate">Cliente Balcão</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedCustomer ? (
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="text-[10px] text-red-400 hover:underline px-1"
                      >
                        Remover
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveTab('customers')}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                        >
                          Buscar
                        </button>
                        <button
                          onClick={() => setShowCustomerModal(true)}
                          className="bg-[#942620] hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1"
                        >
                          <Plus size={12} /> Novo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Itens do Carrinho */}
                <div className="space-y-2 max-h-48 lg:max-h-56 overflow-y-auto pr-1 w-full">
                  {cart.length === 0 ? (
                    <div className="py-6 flex flex-col items-center justify-center text-gray-500 text-xs text-center">
                      <ShoppingCart size={28} className="mb-1.5 opacity-30" />
                      <p>Carrinho vazio</p>
                      <span className="text-[10px] text-gray-600">Bipe ou clique nos produtos</span>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.itemKey} className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-xl text-xs gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-white truncate">{item.productName}</h5>
                          <span className="text-[10px] text-gray-400">{item.size} • R$ {item.unitPrice.toFixed(2)} un</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <div className="flex items-center bg-neutral-900 border border-white/10 rounded-lg">
                            <button onClick={() => updateQty(item.itemKey, -1)} className="p-1 hover:text-red-400"><Minus size={11} /></button>
                            <span className="px-1.5 font-bold text-white text-xs">{item.qty}</span>
                            <button onClick={() => updateQty(item.itemKey, 1)} className="p-1 hover:text-green-400"><Plus size={11} /></button>
                          </div>
                          <span className="font-bold text-white text-xs whitespace-nowrap min-w-[55px] text-right">
                            R$ {(item.unitPrice * item.qty).toFixed(2)}
                          </span>
                          <button onClick={() => removeItem(item.itemKey)} className="text-gray-500 hover:text-red-400 p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Totais & Desconto */}
                <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs w-full">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} un):</span>
                    <span className="font-bold text-white">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Desconto (R$):</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={discountTotal || ''}
                      onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-20 bg-black border border-white/15 rounded px-1.5 py-0.5 text-right text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-white/10">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-[#dfa666] text-base">R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Formas de Pagamento Adicionadas */}
                {payments.length > 0 && (
                  <div className="space-y-1 bg-black/40 p-2.5 rounded-xl text-xs w-full">
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Pagamentos Inseridos:</span>
                    {payments.map((p, idx) => {
                      const brandName = p.cardBrand
                        ? (paymentFees.brands?.[p.cardBrand]?.name || p.cardBrand)
                        : '';
                      return (
                        <div key={idx} className="flex justify-between text-emerald-400 font-bold text-[11px]">
                          <span className="truncate mr-2">
                            • {p.installments > 1 ? `${p.installments}x ` : ''}{p.type}
                            {brandName ? ` (${brandName})` : ''}
                            {p.feePayer === 'CLIENTE' ? ' (c/ juros)' : ''}
                            {p.changeAmount > 0 ? ` (Troco: R$ ${p.changeAmount.toFixed(2)})` : ''}
                          </span>
                          <span className="shrink-0">R$ {p.amount.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Adicionar Pagamento */}
                {remaining > 0.05 && (
                  <div className="space-y-2 pt-2 border-t border-white/10 w-full">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 text-[10px] font-bold">
                      {['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'CREDIARIO'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setPayType(t)}
                          className={`py-1.5 rounded-lg text-center transition-all ${
                            payType === t ? 'bg-[#942620] text-white shadow' : 'bg-black text-gray-400 hover:text-white border border-white/10'
                          }`}
                        >
                          {t === 'DINHEIRO' ? 'Dinheiro' : t === 'DEBITO' ? 'Débito' : t === 'CREDITO' ? 'Crédito' : t === 'CREDIARIO' ? 'Crediário' : 'PIX'}
                        </button>
                      ))}
                    </div>

                    {/* Seleção de Bandeira para Crédito e Débito */}
                    {['CREDITO', 'DEBITO'].includes(payType) && (
                      <div className="space-y-1 bg-black/50 border border-white/10 p-2 rounded-xl text-xs">
                        <label className="text-[10px] font-bold text-gray-400 block uppercase">
                          Bandeira do Cartão:
                        </label>
                        <div className="grid grid-cols-3 xs:grid-cols-5 gap-1">
                          {[
                            { id: 'VISA_MASTER', label: 'Visa/Master' },
                            { id: 'ELO', label: 'Elo' },
                            { id: 'HIPERCARD', label: 'Hipercard' },
                            { id: 'AMEX', label: 'Amex' },
                            { id: 'OUTRAS', label: 'Outras' }
                          ].map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setCardBrand(b.id)}
                              className={`py-1 px-1 rounded-lg text-center font-bold text-[10px] transition-all truncate ${
                                cardBrand === b.id
                                  ? 'bg-[#dfa666] text-black shadow'
                                  : 'bg-neutral-900 text-gray-400 hover:text-white border border-white/10'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parcelamento 1x até 18x para Crédito */}
                    {payType === 'CREDITO' && (
                      <div className="space-y-1.5 bg-black/50 border border-white/10 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-gray-300">
                            Número de Parcelas ({paymentFees.brands?.[cardBrand]?.name || 'Visa / Master'}):
                          </label>
                          <span className="text-[10px] text-[#dfa666] font-mono font-bold">Taxa: {getSelectedFeeRate()}%</span>
                        </div>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-bold"
                        >
                          {Array.from({ length: paymentFees.maxInstallments || 18 }, (_, idx) => idx + 1).map((n) => {
                            const brandObj = paymentFees.brands?.[cardBrand] || paymentFees.brands?.VISA_MASTER || {};
                            const r = (brandObj.installmentRates && brandObj.installmentRates[String(n)] !== undefined)
                              ? brandObj.installmentRates[String(n)]
                              : (paymentFees.installmentRates?.[String(n)] ?? 0);
                            const estBase = parseFloat(payAmount || remaining);
                            const estCharged = feePayer === 'CLIENTE' ? estBase + (estBase * r) / 100 : estBase;
                            const estParcel = estCharged / n;
                            return (
                              <option key={n} value={String(n)}>
                                {n}x {feePayer === 'CLIENTE' ? `de R$ ${estParcel.toFixed(2)} (c/ juros de ${r}%)` : `de R$ ${estParcel.toFixed(2)} (taxa loja: ${r}%)`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Toggle: Quem assume a taxa da maquininha? */}
                    {['CREDITO', 'DEBITO', 'PIX'].includes(payType) && (
                      <div className="space-y-1.5 bg-black/40 border border-white/5 p-2.5 rounded-xl text-xs">
                        <label className="text-[10px] font-black uppercase text-gray-400 block">
                          Quem assume as taxas da maquininha?
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setFeePayer('LOJA')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all truncate ${
                              feePayer === 'LOJA'
                                ? 'bg-[#942620] text-white shadow'
                                : 'bg-neutral-900 text-gray-400 hover:text-white border border-white/10'
                            }`}
                          >
                            🏢 Empresa Assume
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeePayer('CLIENTE')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all truncate ${
                              feePayer === 'CLIENTE'
                                ? 'bg-amber-600 text-white shadow'
                                : 'bg-neutral-900 text-gray-400 hover:text-white border border-white/10'
                            }`}
                          >
                            👤 Repassar ao Cliente
                          </button>
                        </div>

                        {/* Preview rápido do valor final */}
                        {(() => {
                          const base = parseFloat(payAmount || remaining);
                          const r = getSelectedFeeRate();
                          const fee = (base * r) / 100;
                          const totalCard = feePayer === 'CLIENTE' ? base + fee : base;
                          const inst = payType === 'CREDITO' ? parseInt(installments || 1) : 1;
                          const parcel = totalCard / inst;
                          const brandLabel = ['CREDITO', 'DEBITO'].includes(payType)
                            ? (paymentFees.brands?.[cardBrand]?.name || cardBrand)
                            : payType;
                          return (
                            <div className="text-[10px] text-gray-300 pt-1 space-y-0.5 font-mono">
                              <div className="flex items-center justify-between">
                                <span>Cobrar do cliente: <strong className="text-white">R$ {totalCard.toFixed(2)}</strong> {inst > 1 ? `(${inst}x R$ ${parcel.toFixed(2)})` : ''}</span>
                                <span className="text-[#dfa666] font-bold">Taxa: {r}%</span>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-gray-400">
                                <span>Bandeira: <span className="text-white font-bold">{brandLabel}</span></span>
                                <span>Líquido Loja: <span className="text-emerald-400 font-bold">R$ {(feePayer === 'CLIENTE' ? base : Math.max(0, base - fee)).toFixed(2)}</span></span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full">
                      <input
                        type="number"
                        step="0.5"
                        placeholder={`Restante R$ ${remaining.toFixed(2)}`}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="flex-1 min-w-[120px] bg-black border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      {payType === 'DINHEIRO' && (
                        <input
                          type="number"
                          placeholder="Recebido"
                          value={receivedMoney}
                          onChange={(e) => setReceivedMoney(e.target.value)}
                          className="w-24 sm:w-28 bg-black border border-white/15 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none"
                        />
                      )}
                      <button
                        onClick={handleAddPayment}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0"
                      >
                        Inserir
                      </button>
                    </div>
                  </div>
                )}

                {/* Botão Finalizar Venda */}
                <button
                  onClick={handleFinalizeSale}
                  disabled={cart.length === 0 || remaining > 0.05}
                  className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    cart.length > 0 && remaining <= 0.05
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer'
                      : 'bg-neutral-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle size={16} /> Finalizar Venda (PDV)
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            ABA 2: HISTÓRICO DE VENDAS & COMPROVANTES
        ======================================================== */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-3.5 w-full">
            {/* Banner de Controle e Filtros de Data */}
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-lg">
              
              {/* Linha Superior: Presets de Datas & Seletor Calendário */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 mr-1">
                    <CalendarDays size={15} className="text-[#dfa666]" /> Período:
                  </span>
                  
                  {[
                    { key: 'TODAS', label: 'Todas as Vendas' },
                    { key: 'HOJE', label: 'Hoje' },
                    { key: 'ONTEM', label: 'Ontem' },
                    { key: '7DIAS', label: 'Últimos 7 Dias' }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => {
                        setSelectedDatePreset(p.key);
                        if (p.key !== 'CUSTOM') setCustomDateFilter('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        selectedDatePreset === p.key
                          ? 'bg-[#942620] text-white shadow font-black'
                          : 'bg-black/60 hover:bg-neutral-800 text-gray-300 border border-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Seletor Específico de Data Passada */}
                <div className="flex items-center gap-2 bg-black/80 border border-white/15 px-3 py-1.5 rounded-xl">
                  <Calendar size={14} className="text-[#dfa666] shrink-0" />
                  <span className="text-xs font-bold text-gray-300 shrink-0">Filtrar por Dia:</span>
                  <input
                    type="date"
                    value={customDateFilter}
                    onChange={(e) => {
                      setCustomDateFilter(e.target.value);
                      if (e.target.value) {
                        setSelectedDatePreset('CUSTOM');
                      } else {
                        setSelectedDatePreset('TODAS');
                      }
                    }}
                    className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                  />
                  {customDateFilter && (
                    <button
                      onClick={() => {
                        setCustomDateFilter('');
                        setSelectedDatePreset('TODAS');
                      }}
                      title="Limpar filtro de data"
                      className="text-gray-400 hover:text-white p-0.5"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Linha Inferior: Barra de Pesquisa + Filtro de Status + Totalizador */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md w-full bg-black/60 border border-white/10 px-3 py-2 rounded-xl">
                  <Search size={16} className="text-[#942620] shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar código (VD-XXXX), cliente ou vendedor..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="bg-transparent text-white text-xs w-full min-w-0 focus:outline-none placeholder-gray-500"
                  />
                  {salesSearch && (
                    <button onClick={() => setSalesSearch('')} className="text-gray-500 hover:text-white">
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black/60 border border-white/10 p-0.5 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setSalesStatusFilter('TODOS')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        salesStatusFilter === 'TODOS' ? 'bg-neutral-800 text-white font-black' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setSalesStatusFilter('CONCLUIDA')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        salesStatusFilter === 'CONCLUIDA' ? 'bg-emerald-950 text-emerald-300 font-black border border-emerald-800/50' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Concluídas
                    </button>
                    <button
                      onClick={() => setSalesStatusFilter('CANCELADA')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        salesStatusFilter === 'CANCELADA' ? 'bg-red-950 text-red-300 font-black border border-red-800/50' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Canceladas
                    </button>
                  </div>

                  <button
                    onClick={fetchSales}
                    title="Atualizar lista de vendas"
                    className="p-2 bg-black/60 hover:bg-neutral-800 text-gray-300 hover:text-white border border-white/10 rounded-xl transition-colors shrink-0"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard / Resumo Métrico do Dia ou Período Selecionado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-3 sm:p-3.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                  Faturamento do Dia / Período
                </span>
                <strong className="text-base sm:text-xl font-black text-emerald-400">
                  R$ {filteredTotalRevenue.toFixed(2)}
                </strong>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  {filteredCompletedSales.length} {filteredCompletedSales.length === 1 ? 'venda concluída' : 'vendas concluídas'}
                </span>
              </div>

              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-3 sm:p-3.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                  Ticket Médio
                </span>
                <strong className="text-base sm:text-xl font-black text-white">
                  R$ {filteredAvgTicket.toFixed(2)}
                </strong>
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  Média por venda no período
                </span>
              </div>

              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-3 sm:p-3.5 col-span-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Distribuição de Pagamentos do Dia
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                  <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-lg">
                    PIX: <strong>R$ {filteredPix.toFixed(2)}</strong>
                  </span>
                  <span className="bg-blue-950/60 border border-blue-500/30 text-blue-300 px-2 py-0.5 rounded-lg">
                    Cartão: <strong>R$ {filteredCard.toFixed(2)}</strong>
                  </span>
                  <span className="bg-amber-950/60 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-lg">
                    Dinheiro: <strong>R$ {filteredCash.toFixed(2)}</strong>
                  </span>
                  {filteredCrediario > 0 && (
                    <span className="bg-purple-950/60 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-lg">
                      Crediário: <strong>R$ {filteredCrediario.toFixed(2)}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabela de Vendas do Dia Selecionado */}
            <div className="overflow-x-auto w-full bg-neutral-900/80 border border-white/10 rounded-2xl p-2.5">
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 text-gray-400 flex items-center justify-center mx-auto">
                    <Calendar size={22} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Nenhuma venda encontrada para esta data ou filtro</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {selectedDatePreset === 'CUSTOM' && customDateFilter
                      ? `Não foram registradas vendas no dia ${new Date(customDateFilter + 'T00:00:00').toLocaleDateString('pt-BR')}.`
                      : 'Experimente selecionar "Todas as Vendas" ou limpar a busca textual.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDatePreset('TODAS');
                      setCustomDateFilter('');
                      setSalesSearch('');
                      setSalesStatusFilter('TODOS');
                    }}
                    className="mt-2 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Ver Todas as Vendas
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase font-bold">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Data / Hora</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Vendedor</th>
                      <th className="py-2.5 px-3">Pagamento</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#dfa666] font-mono">{s.code}</td>
                        <td className="py-2.5 px-3 text-gray-300 whitespace-nowrap">
                          {new Date(s.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white max-w-[160px] truncate">
                          {s.customer?.name || 'Cliente Balcão'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">{s.user?.name}</td>
                        <td className="py-2.5 px-3 text-gray-300">
                          <div className="flex flex-wrap gap-1">
                            {s.payments && s.payments.length > 0 ? (
                              s.payments.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="bg-black/60 border border-white/10 text-[10px] px-1.5 py-0.5 rounded font-mono text-gray-300"
                                >
                                  {p.type} {p.cardBrand ? `(${p.cardBrand})` : ''}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-[10px]">N/A</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-black text-white text-right whitespace-nowrap font-mono">
                          R$ {s.total.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'CONCLUIDA'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedSaleDetails(s)}
                              title="Ver Detalhes dos Itens da Venda"
                              className="p-1.5 text-gray-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setShowReceipt(s)}
                              title="Reimprimir Comprovante Térmico (80mm / 58mm)"
                              className="p-1.5 text-gray-300 hover:text-[#dfa666] bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                            >
                              <Printer size={14} />
                            </button>
                            {['PROPRIETARIA', 'GERENTE'].includes(user?.role) && s.status !== 'CANCELADA' && (
                              <button
                                onClick={() => {
                                  setSaleToCancel(s);
                                  setShowCancelModal(true);
                                }}
                                title="Cancelar Venda e Estornar Itens ao Estoque"
                                className="p-1.5 text-gray-400 hover:text-red-400 bg-neutral-800 hover:bg-red-950/60 rounded-lg transition-colors"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 3: GESTÃO DE CLIENTES & CREDIÁRIO
        ======================================================== */}
        {activeTab === 'customers' && (
          <div className="flex flex-col gap-3 w-full">
            {/* Banner Explicativo */}
            <div className="bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#dfa666] font-black">👥 CREDIÁRIO BALCÃO:</span>
                <span>Vincule o cliente antes de finalizar a venda para compras no crediário próprio.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900 border border-white/10 p-3 rounded-xl w-full">
              <div className="flex items-center gap-2 flex-1 max-w-md w-full">
                <Search size={18} className="text-[#942620] shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por nome, CPF ou telefone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="bg-transparent text-white text-xs w-full min-w-0 focus:outline-none placeholder-gray-500"
                />
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="bg-[#942620] hover:bg-red-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow self-start sm:self-auto shrink-0"
              >
                <UserPlus size={14} /> Novo Cliente
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
              {filteredCustomers.map((c) => (
                <div key={c.id} className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between w-full min-w-0">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-white text-sm break-words min-w-0">{c.name}</h4>
                      <span className="text-[10px] bg-neutral-800 text-gray-300 px-2 py-0.5 rounded font-mono shrink-0">
                        {c.cpf ? `CPF: ${c.cpf}` : 'Sem CPF'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 space-y-1">
                      {c.phone && <p className="flex items-center gap-1.5 truncate"><Phone size={12} className="text-[#dfa666] shrink-0" /> <span className="truncate">{c.phone}</span></p>}
                      {c.address && <p className="flex items-center gap-1.5 break-words"><MapPin size={12} className="text-[#dfa666] shrink-0" /> <span className="line-clamp-2">{c.address}</span></p>}
                    </div>

                    {/* Crediário Próprio */}
                    <div className="bg-black/60 border border-white/5 rounded-xl p-2.5 text-xs space-y-1 mt-2">
                      <div className="flex justify-between text-gray-400 text-[11px]">
                        <span>Limite:</span>
                        <span className="text-white font-bold">R$ {(c.creditLimit || 500).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[11px]">
                        <span>Saldo Usado:</span>
                        <span className="text-red-400 font-bold">R$ {(c.creditAccount?.usedCredit || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedCustomer(c);
                        setActiveTab('pos');
                        setSuccessMsg(`Cliente ${c.name} selecionado para venda.`);
                      }}
                      className="text-xs bg-[#942620] hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg"
                    >
                      Selecionar no Caixa
                    </button>
                    <button
                      onClick={() => setSelectedCustomerHistory(c)}
                      className="text-xs text-gray-400 hover:text-white underline"
                    >
                      Ver Compras
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 4: TROCAS & DEVOLUÇÕES
        ======================================================== */}
        {activeTab === 'exchanges' && (
          <div className="flex flex-col gap-3 w-full">
            {/* Banner Explicativo */}
            <div className="bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#dfa666] font-black">🔄 TROCAS:</span>
                <span>Digite o código da venda original para emitir Vale-Crédito e estornar produto ao estoque.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 w-full">
              {/* Esquerda: Localizar Venda Original (5 cols) */}
              <div className="lg:col-span-5 bg-neutral-900 border border-white/10 rounded-2xl p-4 flex flex-col gap-3.5 w-full">
                <h3 className="text-sm font-black uppercase text-white flex items-center gap-2">
                  <RefreshCw size={16} className="text-[#942620]" /> Localizar Venda
                </h3>

                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Código da venda (ex: VD-123456)..."
                    value={exchangeSaleCode}
                    onChange={(e) => setExchangeSaleCode(e.target.value)}
                    className="flex-1 min-w-0 bg-black border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleSearchSaleForExchange}
                    className="bg-[#942620] hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                  >
                    Buscar
                  </button>
                </div>

                {exchangeSaleData && (
                  <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs space-y-2 w-full">
                    <div className="flex justify-between font-bold">
                      <span className="text-[#dfa666]">{exchangeSaleData.code}</span>
                      <span className="text-gray-400">{new Date(exchangeSaleData.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p className="text-gray-300 truncate">Cliente: <strong className="text-white">{exchangeSaleData.customer?.name || 'Cliente Balcão'}</strong></p>
                    <p className="text-gray-300">Total Original: <strong className="text-white">R$ {exchangeSaleData.total.toFixed(2)}</strong></p>
                  </div>
                )}
              </div>

              {/* Direita: Seleção de Peças e Emissão de Troca (7 cols) */}
              <div className="lg:col-span-7 bg-neutral-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between w-full">
                <div>
                  <h3 className="text-sm font-black uppercase text-white mb-3">
                    Itens da Venda para Devolução
                  </h3>

                  {!exchangeSaleData ? (
                    <p className="text-xs text-gray-500">Busque uma venda ao lado para selecionar os itens a serem trocados.</p>
                  ) : (
                    <div className="space-y-2">
                      {exchangeSaleData.items?.map((item) => {
                        const isSelected = selectedExchangeItems.some(i => i.id === item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedExchangeItems(selectedExchangeItems.filter(i => i.id !== item.id));
                              } else {
                                setSelectedExchangeItems([...selectedExchangeItems, {
                                  ...item,
                                  qty: 1
                                }]);
                              }
                            }}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs gap-2 ${
                              isSelected ? 'bg-neutral-800 border-[#942620]' : 'bg-black/40 border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div className="min-w-0">
                              <h5 className="font-bold text-white truncate">{item.productName}</h5>
                              <span className="text-[10px] text-gray-400 block truncate">SKU: {item.productSku} • R$ {item.unitPrice.toFixed(2)}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold shrink-0 ${
                              isSelected ? 'bg-[#942620] text-white' : 'bg-neutral-800 text-gray-400'
                            }`}>
                              {isSelected ? '✓ Selecionado' : 'Selecionar'}
                            </span>
                          </div>
                        );
                      })}

                      {/* Motivo & Retorno ao Estoque */}
                      {selectedExchangeItems.length > 0 && (
                        <div className="pt-3 mt-3 border-t border-white/10 space-y-3 text-xs w-full">
                          <div>
                            <label className="block text-gray-400 mb-1 font-bold">Motivo da Troca:</label>
                            <select
                              value={exchangeReason}
                              onChange={(e) => setExchangeReason(e.target.value)}
                              className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                            >
                              <option value="TAMANHO_INCORRETO">Tamanho / Caimento Incorreto</option>
                              <option value="DEFEITO_FABRICACAO">Defeito de Fabricação</option>
                              <option value="INSATISFACAO_MODELO">Troca de Modelo / Cor</option>
                              <option value="PRESENTE">Troca de Presente</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="returnStock"
                              checked={exchangeReturnToStock}
                              onChange={(e) => setExchangeReturnToStock(e.target.checked)}
                              className="rounded border-white/20"
                            />
                            <label htmlFor="returnStock" className="text-gray-300 text-xs">
                              Produto em estado novo (retornar peça ao Estoque Físico)
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedExchangeItems.length > 0 && (
                  <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                    <div>
                      <span className="text-xs text-gray-400 block">Crédito a Gerar:</span>
                      <strong className="text-base text-emerald-400 font-black">
                        R$ {selectedExchangeItems.reduce((acc, i) => acc + (i.unitPrice * i.qty), 0).toFixed(2)}
                      </strong>
                    </div>
                    <button
                      onClick={handleProcessExchange}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow"
                    >
                      Confirmar Troca & Gerar Vale
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 5: RESUMO FINANCEIRO & CAIXA DO DIA
        ======================================================== */}
        {activeTab === 'summary' && (
          <div className="space-y-4 w-full">
            {/* Banner Explicativo */}
            <div className="bg-neutral-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#dfa666] font-black">📊 FECHAMENTO:</span>
                <span>Conferência cega do turno. Registre sangrias, suprimentos e encerre o caixa.</span>
              </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold block uppercase">Faturamento Bruto</span>
                <strong className="text-xl font-black text-white block mt-1">R$ {totalSalesRevenue.toFixed(2)}</strong>
                <span className="text-[10px] text-emerald-400">Total do histórico geral</span>
              </div>
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold block uppercase">Total no PIX</span>
                <strong className="text-xl font-black text-[#dfa666] block mt-1">R$ {totalPix.toFixed(2)}</strong>
                <span className="text-[10px] text-gray-400">Recebimento instantâneo</span>
              </div>
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold block uppercase">Total em Dinheiro</span>
                <strong className="text-xl font-black text-emerald-400 block mt-1">R$ {totalCash.toFixed(2)}</strong>
                <span className="text-[10px] text-gray-400">Gaveta física</span>
              </div>
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4">
                <span className="text-xs text-gray-400 font-bold block uppercase">Cartões (Débito + Crédito)</span>
                <strong className="text-xl font-black text-white block mt-1">R$ {(totalDebit + totalCredit).toFixed(2)}</strong>
                <span className="text-[10px] text-gray-400">Maquininhas POS</span>
              </div>
            </div>

            {/* Operações de Caixa (Sangria & Suprimento) */}
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 space-y-3 w-full">
              <h3 className="text-sm font-black uppercase text-white">Operações de Gaveta / Turno</h3>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full">
                <button
                  onClick={() => {
                    setCashModalType('SANGRIA');
                    setShowCashModal(true);
                  }}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ArrowDownRight size={14} className="text-red-400" /> Registrar Sangria (Retirada)
                </button>
                <button
                  onClick={() => {
                    setCashModalType('SUPRIMENTO');
                    setShowCashModal(true);
                  }}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight size={14} className="text-emerald-400" /> Registrar Suprimento (Entrada)
                </button>
                <button
                  onClick={() => {
                    setCashModalType('CLOSE');
                    setShowCashModal(true);
                  }}
                  className="bg-[#942620] hover:bg-red-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <Lock size={14} /> Fechar Caixa do Turno
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          MODAL: ABERTURA / FECHAMENTO / SANGRIA DE CAIXA
      ======================================================== */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-white/15 rounded-2xl p-4 sm:p-6 max-w-sm w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm sm:text-base font-black text-white uppercase">
              {cashModalType === 'OPEN' && 'Abertura de Caixa'}
              {cashModalType === 'CLOSE' && 'Fechamento de Caixa'}
              {cashModalType === 'SANGRIA' && 'Registrar Sangria'}
              {cashModalType === 'SUPRIMENTO' && 'Registrar Suprimento'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">
                  {cashModalType === 'OPEN' ? 'Fundo de Troco Inicial (R$):' : 'Valor (R$):'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={cashAmountInput}
                  onChange={(e) => setCashAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  autoFocus
                />
              </div>

              {cashModalType !== 'OPEN' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Motivo / Justificativa:</label>
                  <input
                    type="text"
                    value={cashReasonInput}
                    onChange={(e) => setCashReasonInput(e.target.value)}
                    placeholder="Ex: Pagamento de fornecedor, recolhimento..."
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCashModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCashAction}
                className="flex-1 py-2.5 bg-[#942620] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CADASTRO DE CLIENTE
      ======================================================== */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <form onSubmit={handleSaveCustomer} className="bg-neutral-900 border border-white/15 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm sm:text-base font-black text-white uppercase">Cadastrar Novo Cliente</h3>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">CPF</label>
                <input
                  type="text"
                  value={customerForm.cpf}
                  onChange={(e) => setCustomerForm({ ...customerForm, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Endereço Completo</label>
              <input
                type="text"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Limite Inicial de Crediário (R$)</label>
              <input
                type="number"
                value={customerForm.creditLimit}
                onChange={(e) => setCustomerForm({ ...customerForm, creditLimit: e.target.value })}
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#942620] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL: CANCELAMENTO DE VENDA
      ======================================================== */}
      {showCancelModal && saleToCancel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-red-500/50 rounded-2xl p-4 sm:p-6 max-w-sm w-full space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-red-400">
              <ShieldAlert size={20} className="shrink-0" />
              <h3 className="text-sm font-black uppercase text-white truncate">Cancelar {saleToCancel.code}</h3>
            </div>

            <p className="text-xs text-gray-300">
              Esta ação irá cancelar a venda de <strong>R$ {saleToCancel.total.toFixed(2)}</strong> e devolver todos os itens automaticamente ao estoque central.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Motivo do Cancelamento *</label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Desistência do cliente..."
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Voltar
              </button>
              <button
                onClick={handleCancelSale}
                disabled={!cancelReason}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DETALHES DE ITENS DA VENDA
      ======================================================== */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-white">
                  Detalhes da Venda {selectedSaleDetails.code}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(selectedSaleDetails.createdAt).toLocaleString('pt-BR')} • {selectedSaleDetails.customer?.name || 'Cliente Balcão'}
                </p>
              </div>
              <button onClick={() => setSelectedSaleDetails(null)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-gray-400 block">Itens da Compra:</span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {selectedSaleDetails.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 border border-white/5 p-2 rounded-xl text-xs">
                    <div>
                      <strong className="text-white block">{item.qty}x {item.productName}</strong>
                      <span className="text-[10px] text-gray-400">SKU: {item.productSku} • R$ {item.unitPrice.toFixed(2)} un</span>
                    </div>
                    <span className="font-bold text-white">R$ {(item.totalPrice || (item.unitPrice * item.qty)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
              <span className="text-gray-400">Total Pago:</span>
              <strong className="text-base text-emerald-400 font-black">R$ {selectedSaleDetails.total.toFixed(2)}</strong>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedSaleDetails(null)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: HISTÓRICO DE COMPRAS DO CLIENTE
      ======================================================== */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-white">
                  Histórico de Compras
                </h3>
                <p className="text-xs text-[#dfa666] font-bold mt-0.5">
                  {selectedCustomerHistory.name} {selectedCustomerHistory.cpf ? `• CPF: ${selectedCustomerHistory.cpf}` : ''}
                </p>
              </div>
              <button onClick={() => setSelectedCustomerHistory(null)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {salesList.filter(s => s.customer?.id === selectedCustomerHistory.id).length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">Nenhuma compra registrada para este cliente ainda.</p>
              ) : (
                salesList.filter(s => s.customer?.id === selectedCustomerHistory.id).map(s => (
                  <div key={s.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-white block">{s.code}</strong>
                      <span className="text-[10px] text-gray-400">{new Date(s.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-white block">R$ {s.total.toFixed(2)}</strong>
                      <span className={`text-[10px] font-bold ${s.status === 'CONCLUIDA' ? 'text-emerald-400' : 'text-red-400'}`}>{s.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedCustomerHistory(null)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: COMPROVANTE TÉRMICO / CUPOM DE VENDA
      ======================================================== */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white text-black p-5 sm:p-6 rounded-2xl max-w-xs w-full font-mono text-[11px] space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center border-b border-black/20 pb-2">
              <h4 className="font-bold text-sm tracking-wider uppercase">LITRAN MODA ESPORTIVA</h4>
              <p className="text-[9px] text-gray-600">Comprovante de Venda Não Fiscal</p>
              <p className="text-[10px] font-bold text-black mt-1">CÓDIGO: {showReceipt.code}</p>
              <p className="text-[9px] text-gray-500">{new Date(showReceipt.createdAt || Date.now()).toLocaleString('pt-BR')}</p>
            </div>

            <div className="space-y-1 border-b border-black/20 pb-2">
              <span className="font-bold block text-[9px] uppercase">Itens Vendidos:</span>
              {showReceipt.items?.map((i, idx) => (
                <div key={idx} className="flex justify-between gap-2">
                  <span className="truncate">{i.qty}x {i.productName}</span>
                  <span className="shrink-0">R$ {(i.totalPrice || (i.unitPrice * i.qty)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-0.5 border-b border-black/20 pb-2">
              <div className="flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>R$ {showReceipt.total?.toFixed(2)}</span>
              </div>
              {showReceipt.discount > 0 && (
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Desconto:</span>
                  <span>- R$ {showReceipt.discount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="space-y-0.5 border-b border-black/20 pb-2">
              <span className="font-bold block text-[9px] uppercase">Formas de Pagamento:</span>
              {showReceipt.payments?.map((p, idx) => {
                const brandLabel = p.cardBrand
                  ? (paymentFees.brands?.[p.cardBrand]?.name || p.cardBrand)
                  : '';
                const instLabel = p.installments > 1 ? `${p.installments}x ` : '';
                return (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="truncate pr-2">
                      {instLabel}{p.type}{brandLabel ? ` (${brandLabel})` : ''}
                      {p.feePayer === 'CLIENTE' ? ' *' : ''}
                    </span>
                    <span className="shrink-0 font-bold">R$ {p.amount.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-[9px] text-gray-500 pt-1">
              <p>Obrigado pela preferência!</p>
              <p>Trocas em até 30 dias com esta via.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-black text-white rounded font-sans text-xs font-bold flex items-center justify-center gap-1"
              >
                <Printer size={12} /> Imprimir
              </button>
              <button
                onClick={() => setShowReceipt(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded font-sans text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: COMPROVANTE DE TROCA / VALE-CRÉDITO
      ======================================================== */}
      {exchangeReceipt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white text-black p-5 sm:p-6 rounded-2xl max-w-xs w-full font-mono text-[11px] space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center border-b border-black/20 pb-2">
              <h4 className="font-bold text-sm tracking-wider uppercase">LITRAN MODA ESPORTIVA</h4>
              <p className="text-[9px] text-gray-600">Comprovante de Troca / Devolução</p>
              <p className="text-[10px] font-bold text-black mt-1">CÓDIGO: {exchangeReceipt.exchange?.code}</p>
            </div>

            <div className="space-y-1 border-b border-black/20 pb-2">
              <div className="flex justify-between font-bold">
                <span>VALOR DO CRÉDITO:</span>
                <span className="text-emerald-700">R$ {exchangeReceipt.exchange?.creditAmount?.toFixed(2)}</span>
              </div>
              {exchangeReceipt.storeCredit && (
                <p className="text-[10px] text-gray-600">
                  Código do Vale: <strong>{exchangeReceipt.storeCredit.code}</strong>
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-black text-white rounded font-sans text-xs font-bold flex items-center justify-center gap-1"
              >
                <Printer size={12} /> Imprimir
              </button>
              <button
                onClick={() => setExchangeReceipt(null)}
                className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded font-sans text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
