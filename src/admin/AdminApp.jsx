import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, Boxes, Users, DollarSign, RefreshCw,
  BarChart3, ShieldCheck, LogOut, ArrowLeft, Plus, Download, Search,
  AlertCircle, Edit2, Trash2, CheckCircle, AlertTriangle, Eye, ShoppingBag,
  ExternalLink, Phone, Mail, MapPin, Tag, ArrowUpRight, ArrowDownRight,
  UserCheck, UserX, Shield, Lock, Percent, FileText, Info, HelpCircle,
  TrendingUp, Layers, CreditCard, Menu, X, Calculator, Sliders, Check,
  Upload, Image as ImageIcon, Sparkles, FileSpreadsheet, CheckCheck, Copy, Camera, Palette
} from 'lucide-react';
import { API_BASE } from '../config/api';

export function AdminApp() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dados Principais
  const [salesSummary, setSalesSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryBalances, setInventoryBalances] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [usersList, setUsersList] = useState(() => {
    try {
      const cached = localStorage.getItem('litran_users_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [movements, setMovements] = useState([]);

  // Cupons & Descontos Promocionais
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountPercent: '20',
    description: '',
    isActive: true
  });
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [selectedCouponForSale, setSelectedCouponForSale] = useState(null);
  const [showRecordSaleModal, setShowRecordSaleModal] = useState(false);
  const [saleRecordForm, setSaleRecordForm] = useState({
    saleCode: '',
    customerName: '',
    amount: '',
    discountValue: '',
    notes: ''
  });
  const [recordingSale, setRecordingSale] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCouponForHistory, setSelectedCouponForHistory] = useState(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState(null);

  // Configuração de Taxas da Maquininha por Bandeira (1x até 18x)
  const defaultBrandRates = {
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
  };

  const [paymentFees, setPaymentFees] = useState({
    operatorName: 'Stone / PagBank',
    pixFeePct: 0.0,
    debitFeePct: 1.25,
    maxInstallments: 18,
    installmentRates: defaultBrandRates.VISA_MASTER.installmentRates,
    brands: defaultBrandRates,
    payoutDays: 'D+1',
    defaultFeePayer: 'LOJA',
    passFeeToCustomer: false,
    updatedAt: '',
    updatedBy: ''
  });
  const [selectedBrandFeeTab, setSelectedBrandFeeTab] = useState('VISA_MASTER');
  const [savingFees, setSavingFees] = useState(false);

  // Simulador de Taxas
  const [simAmount, setSimAmount] = useState('100.00');
  const [simMethod, setSimMethod] = useState('CREDITO');
  const [simBrand, setSimBrand] = useState('VISA_MASTER');
  const [simInstallment, setSimInstallment] = useState('3');
  const [simFeePayer, setSimFeePayer] = useState('LOJA'); // 'LOJA' | 'CLIENTE'

  // Notificações
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros de busca
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Modais de Produto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState('');
  const [productForm, setProductForm] = useState({
    name: '', description: '', categoryId: '', brand: 'Litran', sku: '',
    barcode: '', price: '', promoPrice: '', costPrice: '', minStock: '2', stockQty: '15', image: '', variants: [], colorImages: {}
  });
  const [newColorInput, setNewColorInput] = useState('');

  // Modal Importador de Planilha (Excel / CSV)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [parsedProducts, setParsedProducts] = useState([]);
  const [importingBatch, setImportingBatch] = useState(false);
  const [defaultMarginMultiplier, setDefaultMarginMultiplier] = useState(2.2);
  const [defaultImportCategory, setDefaultImportCategory] = useState('MODA FITNESS');

  // Modais de Cliente
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '', cpf: '', phone: '', email: '', address: '', creditLimit: '500'
  });

  // Modais de Funcionário
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VENDEDOR',
    discountLimitPct: '5.0',
    commissionPct: '3.0'
  });
  const [selectedUserReport, setSelectedUserReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Modal Ajuste de Estoque
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustIsPositive, setAdjustIsPositive] = useState(true);

  useEffect(() => {
    if (token) {
      loadData();
      fetchCategories();
      fetchPaymentFees();
      fetchUsers();
    }
  }, [token, activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'dashboard' || activeTab === 'reports') {
        const res = await fetch(`${API_BASE}/api/reports/sales-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setSalesSummary(await res.json());
      }
      if (activeTab === 'products') {
        const res = await fetch(`${API_BASE}/api/products?activeOnly=false`);
        if (res.ok) setProducts(await res.json());
      }
      if (activeTab === 'inventory') {
        const resB = await fetch(`${API_BASE}/api/inventory/balances`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resB.ok) setInventoryBalances(await resB.json());

        const resM = await fetch(`${API_BASE}/api/inventory/movements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resM.ok) setMovements(await resM.json());
      }
      if (activeTab === 'customers') {
        const res = await fetch(`${API_BASE}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setCustomers(await res.json());
      }
      if (activeTab === 'users') {
        fetchUsers();
      }
      if (activeTab === 'fees') {
        fetchPaymentFees();
      }
      if (activeTab === 'coupons') {
        fetchCoupons();
      }
      if (activeTab === 'audit') {
        const res = await fetch(`${API_BASE}/api/audit`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setAuditLogs(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCoupons = async () => {
    try {
      setLoadingCoupons(true);
      const res = await fetch(`${API_BASE}/api/coupons`);
      if (res.ok) {
        const data = await res.json();
        if (data.coupons) {
          setCoupons(data.coupons);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar cupons:', err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      setCreatingCoupon(true);
      const res = await fetch(`${API_BASE}/api/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(couponForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar cupom');
      setSuccessMsg(data.message || `Cupom ${data.coupon?.code} criado com sucesso!`);
      setCouponForm({ code: '', discountPercent: '20', description: '', isActive: true });
      if (data.coupons) setCoupons(data.coupons);
      else fetchCoupons();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponItem) => {
    try {
      const res = await fetch(`${API_BASE}/api/coupons/${couponItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isActive: !couponItem.isActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar status');
      setSuccessMsg(`Cupom ${couponItem.code} ${!couponItem.isActive ? 'ativado' : 'desativado'} com sucesso!`);
      if (data.coupons) setCoupons(data.coupons);
      else fetchCoupons();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteCoupon = async (couponItem) => {
    if (!window.confirm(`Tem certeza que deseja excluir o código de desconto "${couponItem.code}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/coupons/${couponItem.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      setSuccessMsg(data.message || 'Cupom removido com sucesso!');
      if (data.coupons) setCoupons(data.coupons);
      else fetchCoupons();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleRecordSale = async (e) => {
    if (e) e.preventDefault();
    if (!selectedCouponForSale) return;
    try {
      setRecordingSale(true);
      const res = await fetch(`${API_BASE}/api/coupons/${selectedCouponForSale.id}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...saleRecordForm,
          reportedBy: user?.name || 'Administrador'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar venda');
      setSuccessMsg(data.message || 'Venda registrada no cupom!');
      setShowRecordSaleModal(false);
      setSaleRecordForm({ saleCode: '', customerName: '', amount: '', discountValue: '', notes: '' });
      if (data.coupons) setCoupons(data.coupons);
      else fetchCoupons();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setRecordingSale(false);
    }
  };

  const handleQuickAddSale = async (couponItem) => {
    try {
      const res = await fetch(`${API_BASE}/api/coupons/${couponItem.id}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          reportedBy: user?.name || 'Administrador'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar venda rápida');
      setSuccessMsg(`+1 venda informada no cupom ${couponItem.code}! Total de vendas: ${data.coupon?.salesCount || (couponItem.salesCount + 1)}.`);
      if (data.coupons) setCoupons(data.coupons);
      else fetchCoupons();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const fetchPaymentFees = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/payment-fees`);
      if (res.ok) {
        const data = await res.json();
        if (data.fees) {
          setPaymentFees(data.fees);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePaymentFees = async (e) => {
    e.preventDefault();
    setSavingFees(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/settings/payment-fees`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(paymentFees)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar taxas da maquininha.');
      }
      setSuccessMsg('Configurações de taxas da maquininha gravadas com sucesso!');
      if (data.fees) setPaymentFees(data.fees);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingFees(false);
    }
  };

  const applyFeePreset = (presetKey) => {
    const buildBrandTables = (baseDebit, base1x, increment) => {
      const generateInstallments = (startRate, inc) => {
        const rates = {};
        for (let i = 1; i <= 18; i++) {
          if (i === 1) rates['1'] = parseFloat(startRate.toFixed(2));
          else rates[String(i)] = parseFloat((startRate + (i - 1) * inc).toFixed(2));
        }
        return rates;
      };

      return {
        VISA_MASTER: {
          name: 'Visa & Mastercard',
          debitFeePct: parseFloat(baseDebit.toFixed(2)),
          installmentRates: generateInstallments(base1x, increment)
        },
        ELO: {
          name: 'Elo',
          debitFeePct: parseFloat((baseDebit + 0.35).toFixed(2)),
          installmentRates: generateInstallments(base1x + 0.35, increment + 0.05)
        },
        HIPERCARD: {
          name: 'Hipercard',
          debitFeePct: parseFloat((baseDebit + 0.25).toFixed(2)),
          installmentRates: generateInstallments(base1x + 0.25, increment + 0.03)
        },
        AMEX: {
          name: 'American Express',
          debitFeePct: parseFloat((baseDebit + 0.50).toFixed(2)),
          installmentRates: generateInstallments(base1x + 0.50, increment + 0.08)
        },
        OUTRAS: {
          name: 'Outras Bandeiras',
          debitFeePct: parseFloat((baseDebit + 0.60).toFixed(2)),
          installmentRates: generateInstallments(base1x + 0.60, increment + 0.09)
        }
      };
    };

    const presets = {
      stone: {
        operatorName: 'Stone Pro',
        pixFeePct: 0.0,
        debitFeePct: 1.25,
        maxInstallments: 18,
        payoutDays: 'D+1',
        brands: buildBrandTables(1.25, 3.15, 0.77)
      },
      pagbank: {
        operatorName: 'PagBank (PagSeguro)',
        pixFeePct: 0.0,
        debitFeePct: 1.39,
        maxInstallments: 18,
        payoutDays: 'D+1',
        brands: buildBrandTables(1.39, 3.19, 0.79)
      },
      infinitepay: {
        operatorName: 'InfinitePay',
        pixFeePct: 0.0,
        debitFeePct: 0.75,
        maxInstallments: 18,
        payoutDays: 'D+1',
        brands: buildBrandTables(0.75, 2.80, 0.76)
      },
      mercadopago: {
        operatorName: 'Mercado Pago Point',
        pixFeePct: 0.0,
        debitFeePct: 1.68,
        maxInstallments: 18,
        payoutDays: 'D+0',
        brands: buildBrandTables(1.68, 3.15, 0.81)
      },
      ton: {
        operatorName: 'Ton (Plano Black)',
        pixFeePct: 0.0,
        debitFeePct: 0.99,
        maxInstallments: 18,
        payoutDays: 'D+1',
        brands: buildBrandTables(0.99, 2.99, 0.76)
      },
      cielo: {
        operatorName: 'Cielo / Rede',
        pixFeePct: 0.0,
        debitFeePct: 1.45,
        maxInstallments: 18,
        payoutDays: 'D+1',
        brands: buildBrandTables(1.45, 3.29, 0.79)
      }
    };

    if (presets[presetKey]) {
      const selectedPreset = presets[presetKey];
      setPaymentFees(prev => ({
        ...prev,
        ...selectedPreset,
        installmentRates: selectedPreset.brands.VISA_MASTER.installmentRates,
        brands: selectedPreset.brands
      }));
      setSuccessMsg(`Preset da operadora "${selectedPreset.operatorName}" com taxas de todas as bandeiras (1x a 18x) aplicado! Clique em salvar para gravar.`);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (list.length > 0) {
          setUsersList(list);
          try {
            localStorage.setItem('litran_users_cache', JSON.stringify(list));
          } catch (_) {}
        } else if (usersList.length === 0) {
          // Se o banco estiver vazio, garantir que a proprietária padrão conste
          const defaultList = [{
            id: 'owner-default',
            name: 'Gabriela Litran',
            email: 'gabilitranmodas@gmail.com',
            role: 'PROPRIETARIA',
            discountLimitPct: 100.0,
            commissionPct: 0.0,
            isBlocked: false,
            createdAt: new Date().toISOString()
          }];
          setUsersList(defaultList);
          try {
            localStorage.setItem('litran_users_cache', JSON.stringify(defaultList));
          } catch (_) {}
        }
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn('Aviso ao carregar equipe:', err);
      }
    } catch (e) {
      console.error('Erro na requisição de usuários:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  // Manipulação de Upload de Foto
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('A imagem selecionada é muito grande (máximo 15MB). Escolha uma foto menor.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setProductForm(prev => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Upload e manipulação de Fotos por Variação de Cor
  const handleColorImageUpload = (colorName, file) => {
    if (!file || !colorName || !colorName.trim()) return;
    const cleanColor = colorName.trim();
    if (file.size > 15 * 1024 * 1024) {
      setModalErrorMsg('A imagem para a cor deve ter no máximo 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setProductForm(prev => ({
        ...prev,
        colorImages: {
          ...(prev.colorImages || {}),
          [cleanColor]: event.target.result
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSetColorImageUrl = (colorName, url) => {
    if (!colorName || !colorName.trim()) return;
    const cleanColor = colorName.trim();
    setProductForm(prev => ({
      ...prev,
      colorImages: {
        ...(prev.colorImages || {}),
        [cleanColor]: (url || '').trim()
      }
    }));
  };

  const handleRemoveColorImage = (colorName) => {
    if (!colorName) return;
    const cleanColor = colorName.trim();
    setProductForm(prev => {
      const next = { ...(prev.colorImages || {}) };
      delete next[cleanColor];
      return { ...prev, colorImages: next };
    });
  };

  const handleAddCustomColor = (colorName) => {
    if (!colorName || !colorName.trim()) return;
    const cleanColor = colorName.trim();
    setProductForm(prev => {
      const current = prev.colorImages || {};
      if (current[cleanColor] !== undefined) return prev;
      return {
        ...prev,
        colorImages: {
          ...current,
          [cleanColor]: ''
        }
      };
    });
    setNewColorInput('');
  };

  // Manipulação da Grade de Variações
  const handleAddVariant = (size = 'M', color = '') => {
    setProductForm(prev => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          size: size || 'M',
          color: color || '',
          stockQty: '5',
          price: prev.price || '',
          costPrice: prev.costPrice || ''
        }
      ]
    }));
  };

  const handleQuickAddGrid = (sizesList, defaultColor = '') => {
    setProductForm(prev => {
      const existing = prev.variants || [];
      const newVariants = [...existing];
      sizesList.forEach(s => {
        const alreadyExists = newVariants.some(
          v => v.size.toUpperCase() === s.toUpperCase() && (v.color || '').toLowerCase() === (defaultColor || '').toLowerCase()
        );
        if (!alreadyExists) {
          newVariants.push({
            size: s,
            color: defaultColor,
            stockQty: '3',
            price: prev.price || '',
            costPrice: prev.costPrice || ''
          });
        }
      });
      return { ...prev, variants: newVariants };
    });
  };

  const handleRemoveVariant = (index) => {
    setProductForm(prev => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    setProductForm(prev => {
      const next = [...(prev.variants || [])];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return { ...prev, variants: next };
    });
  };

  // Processamento e Leitura de Planilha Excel (.xlsx, .xls, .csv)
  const handleSpreadsheetFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Identifica aba: se tiver "Estoque LITRAN" seleciona, senão a primeira
        const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('estoque')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          setErrorMsg('A planilha selecionada está vazia ou sem dados válidos.');
          return;
        }

        const productsMap = {};

        rows.forEach((row) => {
          // Extração inteligente de colunas com suporte a vários cabeçalhos
          const pName = row['Produto'] || row['PRODUTO'] || row['Nome'] || row['NOME'] || row['Item'] || row['Descrição'] || row['Descricao'];
          if (!pName || typeof pName !== 'string' || !pName.trim()) return;

          const cleanName = pName.trim();
          const rawCor = (row['Cor'] || row['COR'] || row['Color'] || '').toString().trim();
          const cor = (rawCor.toLowerCase() === 'não informado' || rawCor.toLowerCase() === 'sem cor') ? '' : rawCor;
          
          const rawTam = (row['Tamanho'] || row['TAMANHO'] || row['Grade'] || row['GRADE'] || row['Tam'] || '').toString().trim();
          const tam = (rawTam.toLowerCase() === 'não informado' || !rawTam) ? 'ÚNICO' : rawTam.toUpperCase();

          const qtd = Math.max(0, parseInt(row['Quantidade'] || row['QUANTIDADE'] || row['Qtd'] || row['QTD'] || row['Estoque'] || 0) || 0);
          
          // Extração de preço de custo
          let custo = 0;
          const rawCusto = row['Custo Unitário (R$)'] || row['Custo Unitário'] || row['Custo'] || row['CUSTO'] || row['Preço Custo'] || row['Preco Custo'];
          if (typeof rawCusto === 'number') {
            custo = rawCusto;
          } else if (typeof rawCusto === 'string') {
            custo = parseFloat(rawCusto.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          }

          // Extração de preço de venda (ou sugestão automática)
          let preco = 0;
          const rawPreco = row['Preço de Venda (R$)'] || row['Preço de Venda'] || row['Preco de Venda'] || row['Preço'] || row['PREÇO'] || row['Valor Final'];
          if (typeof rawPreco === 'number' && rawPreco > 0) {
            preco = rawPreco;
          } else if (typeof rawPreco === 'string' && rawPreco.trim()) {
            preco = parseFloat(rawPreco.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
          }
          if (preco <= 0 && custo > 0) {
            preco = parseFloat((custo * defaultMarginMultiplier).toFixed(2));
          }

          const brand = (row['Compra'] || row['Fornecedor'] || row['Marca'] || 'Litran').toString().trim();

          if (!productsMap[cleanName]) {
            productsMap[cleanName] = {
              name: cleanName,
              brand: brand || 'Litran',
              categoryName: defaultImportCategory,
              costPrice: custo,
              price: preco > 0 ? preco : (custo > 0 ? parseFloat((custo * defaultMarginMultiplier).toFixed(2)) : 49.90),
              variants: [],
              totalQty: 0
            };
          }

          productsMap[cleanName].variants.push({
            color: cor,
            size: tam,
            stockQty: qtd,
            costPrice: custo,
            price: preco > 0 ? preco : productsMap[cleanName].price
          });

          productsMap[cleanName].totalQty += qtd;
        });

        const list = Object.values(productsMap);
        if (list.length === 0) {
          setErrorMsg('Não foi possível identificar colunas de produtos na planilha. Verifique se há uma coluna "Produto".');
          return;
        }

        setParsedProducts(list);
        setSuccessMsg(`Planilha processada! ${list.length} produtos e ${rows.length} itens identificados.`);
      } catch (err) {
        console.error('Erro ao ler planilha:', err);
        setErrorMsg('Falha ao processar arquivo Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Recalcular preços sugeridos com nova margem
  const handleUpdateMarginMultiplier = (newMultiplier) => {
    setDefaultMarginMultiplier(newMultiplier);
    setParsedProducts(prev => prev.map(p => {
      const newPrice = p.costPrice > 0 ? parseFloat((p.costPrice * newMultiplier).toFixed(2)) : p.price;
      return {
        ...p,
        price: newPrice,
        variants: p.variants.map(v => ({ ...v, price: newPrice }))
      };
    }));
  };

  // Executar Importação em Lote
  const handleExecuteBatchImport = async () => {
    if (!parsedProducts || parsedProducts.length === 0) return;
    setImportingBatch(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/products/batch-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ products: parsedProducts })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao importar produtos.');
        setImportingBatch(false);
        return;
      }

      setSuccessMsg(data.message || 'Produtos importados e lançados com sucesso no catálogo e estoque!');
      setShowImportModal(false);
      setParsedProducts([]);
      setImportFileName('');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setImportingBatch(false);
    }
  };

  // Salvar Produto (Criar / Editar com Variações e Fotos)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setModalErrorMsg('');
    setIsSavingProduct(true);
    try {
      const authToken = token || localStorage.getItem('litran_token') || '';
      const isEditing = !!editingProduct;
      const url = isEditing
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const formattedVariants = (productForm.variants || []).map(v => {
        const vColor = (v.color || '').trim();
        const vImg = v.imageUrl || (productForm.colorImages && vColor ? productForm.colorImages[vColor] : null) || null;
        return {
          id: v.id,
          sku: v.sku,
          size: (v.size || 'M').trim(),
          color: vColor,
          imageUrl: vImg,
          stockQty: Math.max(0, parseInt(v.stockQty || 0) || 0),
          price: v.price ? parseFloat(v.price) : parseFloat(productForm.price || 0),
          costPrice: v.costPrice ? parseFloat(v.costPrice) : parseFloat(productForm.costPrice || 0)
        };
      });

      const targetCategoryId = productForm.categoryId || (categories.length > 0 ? categories[0].id : undefined);

      const payload = {
        name: productForm.name.trim(),
        description: productForm.description?.trim() || '',
        categoryId: targetCategoryId,
        brand: productForm.brand || 'Litran',
        sku: productForm.sku.trim(),
        barcode: productForm.barcode?.trim() || null,
        price: parseFloat(productForm.price),
        promoPrice: productForm.promoPrice ? parseFloat(productForm.promoPrice) : null,
        costPrice: parseFloat(productForm.costPrice || 0),
        minStock: parseInt(productForm.minStock || 2),
        stockQty: parseInt(productForm.stockQty || 0),
        image: productForm.image || undefined,
        colorImages: productForm.colorImages || {},
        variants: formattedVariants
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        const errorText = data.error || 'Erro ao salvar produto.';
        setErrorMsg(errorText);
        setModalErrorMsg(errorText);
        setIsSavingProduct(false);
        return;
      }

      setSuccessMsg(isEditing ? 'Produto e variações atualizados com sucesso!' : 'Novo produto cadastrado com sucesso!');
      setShowProductModal(false);
      setEditingProduct(null);
      setModalErrorMsg('');

      if (data && data.id) {
        setProducts(prev => {
          const exists = prev.some(p => p.id === data.id);
          if (exists) {
            return prev.map(p => p.id === data.id ? data : p);
          }
          return [data, ...prev];
        });
      }

      // Recarrega lista de produtos e saldos de estoque imediatamente
      try {
        const [prodRes, invRes] = await Promise.all([
          fetch(`${API_BASE}/api/products?activeOnly=false`),
          authToken ? fetch(`${API_BASE}/api/inventory/balances`, { headers: { Authorization: `Bearer ${authToken}` } }) : Promise.resolve(null)
        ]);
        if (prodRes && prodRes.ok) setProducts(await prodRes.json());
        if (invRes && invRes.ok) setInventoryBalances(await invRes.json());
      } catch (_) {
        loadData();
      }
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      setErrorMsg(err.message);
      setModalErrorMsg(err.message);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Desativar Produto
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Tem certeza que deseja desativar este produto do catálogo?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg('Produto desativado.');
        loadData();
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Salvar Cliente
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const isEditing = !!editingCustomer;
      const url = isEditing
        ? `${API_BASE}/api/customers/${editingCustomer.id}`
        : `${API_BASE}/api/customers`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: customerForm.name,
          cpf: customerForm.cpf,
          phone: customerForm.phone,
          email: customerForm.email,
          address: customerForm.address,
          creditLimit: parseFloat(customerForm.creditLimit || 500)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao salvar cliente.');
        return;
      }

      setSuccessMsg('Cliente salvo com sucesso!');
      setShowCustomerModal(false);
      loadData();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Excluir Cliente
  const handleDeleteCustomer = async (targetCustomer) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cadastro de ${targetCustomer.name}?`)) return;

    try {
      setCustomers(prev => prev.filter(c => c.id !== targetCustomer.id));
      const res = await fetch(`${API_BASE}/api/customers/${targetCustomer.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Cliente removido com sucesso!');
        loadData();
      } else {
        setErrorMsg(data.error || 'Erro ao remover cliente.');
        loadData();
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Salvar Funcionário (Criar / Editar)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const isEditing = !!editingUser;
      const url = isEditing
        ? `${API_BASE}/api/auth/users/${editingUser.id}`
        : `${API_BASE}/api/auth/users`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role,
        discountLimitPct: parseFloat(userForm.discountLimitPct || 5.0),
        commissionPct: parseFloat(userForm.commissionPct || 0.0)
      };
      if (userForm.password) {
        payload.password = userForm.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao salvar funcionário.');
        return;
      }

      setSuccessMsg(isEditing ? 'Dados do funcionário atualizados!' : 'Novo funcionário cadastrado no sistema!');
      setShowUserModal(false);

      // Persistência local imediata e garantida
      setUsersList(prev => {
        let updated;
        if (isEditing) {
          updated = prev.map(u => u.id === (editingUser.id || data.id) ? { ...u, ...data } : u);
        } else {
          updated = [data, ...prev.filter(u => u.id !== data.id && u.email !== data.email)];
        }
        try { localStorage.setItem('litran_users_cache', JSON.stringify(updated)); } catch (_) {}
        return updated;
      });

      fetchUsers();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Bloquear / Desbloquear Funcionário
  const handleToggleBlockUser = async (targetUser) => {
    const confirmMsg = targetUser.isBlocked
      ? `Deseja reativar o acesso de ${targetUser.name}?`
      : `Deseja suspender imediatamente o acesso de ${targetUser.name}?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      // Atualização otimista
      setUsersList(prev => {
        const updated = prev.map(u => u.id === targetUser.id ? { ...u, isBlocked: !targetUser.isBlocked } : u);
        try { localStorage.setItem('litran_users_cache', JSON.stringify(updated)); } catch (_) {}
        return updated;
      });

      const res = await fetch(`${API_BASE}/api/auth/users/${targetUser.id}/toggle-block`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Status do funcionário alterado com sucesso!');
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Erro ao alterar status do usuário.');
        fetchUsers();
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Excluir Funcionário
  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Tem certeza que deseja excluir o funcionário ${targetUser.name}? Esta ação é irreversível.`)) return;

    try {
      // Atualização otimista
      setUsersList(prev => {
        const updated = prev.filter(u => u.id !== targetUser.id);
        try { localStorage.setItem('litran_users_cache', JSON.stringify(updated)); } catch (_) {}
        return updated;
      });

      const res = await fetch(`${API_BASE}/api/auth/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Funcionário excluído com sucesso!');
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Erro ao excluir funcionário.');
        fetchUsers();
      }
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Abrir Relatório Individual do Funcionário
  const handleOpenUserReport = async (targetUser) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${targetUser.id}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserReport(data);
      } else {
        setErrorMsg('Não foi possível carregar o relatório deste funcionário.');
      }
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoadingReport(false);
    }
  };

  // Ajuste Manual de Estoque (Auditoria)
  const handleStockAdjust = async () => {
    if (!selectedProduct || !adjustQty || !adjustReason) {
      setErrorMsg('Preencha o produto, quantidade e motivo do ajuste.');
      return;
    }

    try {
      const qty = parseInt(adjustQty);
      const res = await fetch(`${API_BASE}/api/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: selectedProduct,
          qty: adjustIsPositive ? qty : -qty,
          reason: adjustReason,
          type: adjustIsPositive ? 'ENTRADA_MANUAL' : 'BAIXA_MANUAL'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao ajustar estoque.');
        return;
      }

      setSuccessMsg('Ajuste de estoque computado e auditado com sucesso!');
      setShowAdjustModal(false);
      setSelectedProduct('');
      setAdjustQty('1');
      setAdjustReason('');
      loadData();
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Exportar CSV
  const handleExportCsv = async (type) => {
    try {
      const url = `${API_BASE}/api/reports/export-csv?type=${type}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao exportar CSV.');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `litran_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccessMsg('Relatório CSV baixado com sucesso!');
    } catch (e) {
      setErrorMsg(e.message);
    }
  };

  // Filtros
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.category && p.category.name.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.cpf && c.cpf.includes(customerSearch)) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const filteredUsers = (usersList || []).filter(u => {
    if (!u) return false;
    const name = (u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const role = (u.role || '').toLowerCase();
    const q = (userSearch || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  });

  const filteredCoupons = coupons.filter(c => {
    const q = (couponSearch || '').toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard },
    { id: 'products', label: 'Produtos & Variações', icon: Package },
    { id: 'inventory', label: 'Estoque Central', icon: Boxes },
    { id: 'customers', label: 'Clientes & Crediário', icon: Users },
    { id: 'users', label: 'Equipe & Funcionários', icon: UserCheck },
    { id: 'coupons', label: 'Descontos & Cupons', icon: Tag },
    { id: 'fees', label: 'Taxas da Maquininha', icon: Percent },
    { id: 'reports', label: 'Relatórios & CSV', icon: BarChart3 },
    { id: 'audit', label: 'Logs de Auditoria', icon: ShieldCheck }
  ];

  // Cálculo do simulador de taxas (1x a 18x com suporte a bandeiras e repasse de juros)
  const simVal = parseFloat(simAmount || 0);
  const currentSimBrandData = paymentFees.brands?.[simBrand] || defaultBrandRates[simBrand] || defaultBrandRates.VISA_MASTER;
  let activeRate = 0;
  if (simMethod === 'PIX') {
    activeRate = paymentFees.pixFeePct || 0;
  } else if (simMethod === 'DEBITO') {
    activeRate = currentSimBrandData.debitFeePct ?? paymentFees.debitFeePct ?? 1.25;
  } else if (simMethod === 'CREDITO') {
    const instKey = String(simInstallment || '1');
    activeRate = (currentSimBrandData.installmentRates && currentSimBrandData.installmentRates[instKey] !== undefined)
      ? currentSimBrandData.installmentRates[instKey]
      : (paymentFees.installmentRates?.[instKey] || 3.15);
  }

  const simInstCount = simMethod === 'CREDITO' ? Math.max(1, parseInt(simInstallment || 1)) : 1;
  let simTotalCustomer = simVal;
  let simFeeDeduction = 0;
  let simNetAmount = simVal;

  if (simFeePayer === 'CLIENTE') {
    // Cliente assume: repassa juros da maquininha no valor final
    simFeeDeduction = (simVal * activeRate) / 100;
    simTotalCustomer = simVal + simFeeDeduction;
    simNetAmount = simVal;
  } else {
    // Empresa assume: desconta do valor líquido da loja
    simTotalCustomer = simVal;
    simFeeDeduction = (simVal * activeRate) / 100;
    simNetAmount = Math.max(0, simVal - simFeeDeduction);
  }

  const simParcelValue = simTotalCustomer / simInstCount;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col lg:flex-row font-sans w-full max-w-full overflow-x-hidden">
      
      {/* Mobile Top Header (Visible on < lg) */}
      <header className="lg:hidden bg-black border-b border-white/10 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-gray-400 hover:text-white bg-neutral-900 border border-white/10 rounded-lg transition-colors"
            aria-label="Abrir Menu"
          >
            <Menu size={18} />
          </button>
          <h1 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1">
            LITRAN <span className="text-[#942620]">ADMIN</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/pdv"
            className="bg-[#942620] hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow"
          >
            <ShoppingBag size={12} /> PDV
          </a>
          <button
            onClick={logout}
            title="Encerrar Sessão"
            className="text-gray-400 hover:text-red-400 p-1.5 bg-neutral-900 border border-white/10 rounded-lg"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay & Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-black border-r border-white/10 p-4 flex flex-col justify-between z-50 animate-slide-down shadow-2xl">
            <div>
              <div className="pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <a href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={14} /> Loja Online
                  </a>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 text-gray-400 hover:text-white bg-neutral-900 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                <h1 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  LITRAN <span className="text-[#942620]">ADMIN</span>
                </h1>
                <p className="text-[10px] text-gray-400">Painel Geral de Gestão & Estoque</p>
                <div className="mt-3">
                  <a
                    href="/pdv"
                    className="w-full bg-[#942620] hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow"
                  >
                    <ShoppingBag size={14} /> Ir para PDV Balcão
                  </a>
                </div>
              </div>

              <nav className="space-y-1">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === tab.id
                          ? 'bg-[#942620] text-white shadow-lg'
                          : 'text-gray-400 hover:bg-neutral-900 hover:text-white'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="block text-xs font-bold text-white leading-tight truncate">{user?.name}</span>
                <span className="text-[10px] text-[#dfa666] uppercase font-bold">{user?.role}</span>
              </div>
              <button onClick={logout} title="Encerrar Sessão" className="text-gray-400 hover:text-red-400 p-1.5 bg-neutral-900 rounded-lg shrink-0">
                <LogOut size={16} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 bg-black border-r border-white/10 p-4 flex-col justify-between shrink-0 h-screen sticky top-0">
        <div>
          <div className="pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <a href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Loja Online
              </a>
              <a href="/pdv" className="bg-[#942620] hover:bg-red-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow">
                <ShoppingBag size={12} /> PDV Balcão
              </a>
            </div>
            <h1 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
              LITRAN <span className="text-[#942620]">ADMIN</span>
            </h1>
            <p className="text-[10px] text-gray-400">Painel Geral de Gestão & Estoque</p>
          </div>

          <nav className="space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#942620] text-white shadow-lg'
                      : 'text-gray-400 hover:bg-neutral-900 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="block text-xs font-bold text-white leading-tight truncate">{user?.name}</span>
            <span className="text-[10px] text-[#dfa666] uppercase font-bold">{user?.role}</span>
          </div>
          <button onClick={logout} title="Encerrar Sessão" className="text-gray-400 hover:text-red-400 p-1 shrink-0">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Body */}
      <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto w-full min-w-0 max-w-full">
        
        {/* Alertas */}
        {errorMsg && (
          <div className="bg-red-950/90 border border-red-500 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-between mb-4 w-full">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span className="break-words">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="shrink-0 font-bold p-1">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/90 border border-emerald-500 text-white p-3 rounded-xl text-xs font-bold flex items-center justify-between mb-4 w-full">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span className="break-words">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="shrink-0 font-bold p-1">✕</button>
          </div>
        )}

        {/* ========================================================
            ABA 1: DASHBOARD
        ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white">Painel de Controle Executivo</h2>
              <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 mt-2 flex items-start gap-3">
                <Info size={18} className="text-[#dfa666] shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 space-y-1">
                  <p className="font-bold text-white">O que você está vendo aqui?</p>
                  <p>Métricas consolidadas de vendas em tempo real de todos os canais (Loja Virtual + PDV Balcão). Os cálculos de margem de lucro deduzem automaticamente o preço de custo cadastrado em cada peça.</p>
                </div>
              </div>
            </div>

            {salesSummary && (
              <div className="space-y-4">
                {/* Linha Principal de Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl relative overflow-hidden">
                    <span className="text-xs text-gray-400 font-bold block uppercase">Faturamento Bruto</span>
                    <span className="text-xl sm:text-2xl font-black text-white block mt-1">R$ {salesSummary.totalRevenue.toFixed(2)}</span>
                    <p className="text-[11px] text-gray-400 mt-2">{salesSummary.totalSalesCount} vendas concluídas</p>
                  </div>
                  <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl relative overflow-hidden">
                    <span className="text-xs text-gray-400 font-bold block uppercase">Custo dos Produtos</span>
                    <span className="text-xl sm:text-2xl font-black text-rose-400 block mt-1">R$ {salesSummary.totalCost.toFixed(2)}</span>
                    <p className="text-[11px] text-gray-400 mt-2">Custo de compra das peças vendidas</p>
                  </div>
                  <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl relative overflow-hidden">
                    <span className="text-xs text-gray-400 font-bold block uppercase">Taxas Maquininha</span>
                    <span className="text-xl sm:text-2xl font-black text-[#dfa666] block mt-1">
                      - R$ {(salesSummary.totalFeesCost ?? 0).toFixed(2)}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-2">Retenções de cartão e PIX da operadora</p>
                  </div>
                  <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl relative overflow-hidden">
                    <span className="text-xs text-emerald-400 font-bold block uppercase">Lucro Líquido Real</span>
                    <span className="text-xl sm:text-2xl font-black text-emerald-300 block mt-1">
                      R$ {(salesSummary.netProfit ?? salesSummary.grossMargin).toFixed(2)}
                    </span>
                    <p className="text-[11px] text-emerald-400/80 mt-2">Margem Líquida: {salesSummary.netMarginPct ?? salesSummary.marginPct}%</p>
                  </div>
                </div>

                {/* Sub-bar com Comissões e Descontos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-neutral-900/90 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-bold block">Comissões da Equipe a Pagar:</span>
                      <span className="text-[11px] text-gray-500">Calculadas pelas taxas individuais dos vendedores</span>
                    </div>
                    <span className="text-sm sm:text-base font-black text-amber-400">
                      R$ {(salesSummary.totalCommissions ?? 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-neutral-900/90 border border-white/10 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-bold block">Descontos Concedidos no PDV:</span>
                      <span className="text-[11px] text-gray-500">Total de abatimentos aplicados no balcão</span>
                    </div>
                    <span className="text-sm sm:text-base font-black text-gray-300">
                      R$ {salesSummary.totalDiscounts.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            ABA: TAXAS & MAQUININHA (NOVA FUNCIONALIDADE)
        ======================================================== */}
        {activeTab === 'fees' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white flex items-center gap-2">
                <Percent size={20} className="text-[#942620]" /> Taxas da Maquininha & Pagamentos
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Configure com exatidão as taxas de intermediação cobradas pela sua maquininha (PIX, Débito e Crédito Parcelado).
              </p>
            </div>

            {/* Presets Rápidos das Principais Maquininhas */}
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#dfa666] flex items-center gap-1.5">
                  <Sliders size={14} /> Aplicar Predefinição Rápida de Operadora:
                </span>
                <span className="text-[11px] text-gray-400 hidden sm:inline">Preenche valores médios de mercado</span>
              </div>
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: 'stone', name: 'Stone' },
                  { id: 'pagbank', name: 'PagBank' },
                  { id: 'infinitepay', name: 'InfinitePay' },
                  { id: 'ton', name: 'Ton Black' },
                  { id: 'mercadopago', name: 'Mercado Pago' },
                  { id: 'cielo', name: 'Cielo / Rede' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyFeePreset(p.id)}
                    className="bg-black hover:bg-neutral-800 border border-white/10 hover:border-[#942620] text-xs font-bold text-gray-300 hover:text-white py-2 px-2.5 rounded-xl transition-all text-center truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Principal: Formulário de Taxas + Simulador em Tempo Real */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              
              {/* Formulário de Taxas (7 cols) */}
              <form onSubmit={handleSavePaymentFees} className="lg:col-span-7 bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                    <CreditCard size={16} className="text-[#942620]" /> Taxas Cadastradas (1x até 18x)
                  </h3>
                  {paymentFees.updatedAt && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      Atualizado: {new Date(paymentFees.updatedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 mb-1">Nome da Maquininha / Operadora *</label>
                    <input
                      type="text"
                      required
                      value={paymentFees.operatorName}
                      onChange={(e) => setPaymentFees({ ...paymentFees, operatorName: e.target.value })}
                      placeholder="Ex: Stone Pro, PagBank, InfinitePay..."
                      className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Parcelamento Máx.</label>
                    <select
                      value={paymentFees.maxInstallments || 18}
                      onChange={(e) => setPaymentFees({ ...paymentFees, maxInstallments: parseInt(e.target.value) })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    >
                      <option value="6">Até 6x</option>
                      <option value="10">Até 10x</option>
                      <option value="12">Até 12x</option>
                      <option value="18">Até 18x (Recomendado)</option>
                    </select>
                  </div>
                </div>

                {/* PIX (Global da Operadora) */}
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl">
                  <label className="block text-xs font-bold text-white mb-1 flex items-center justify-between">
                    <span>Taxa PIX da Maquininha (%)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Geralmente 0.00%</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={paymentFees.pixFeePct}
                      onChange={(e) => setPaymentFees({ ...paymentFees, pixFeePct: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none pr-8"
                    />
                    <span className="absolute right-3 top-2 text-xs text-gray-500">%</span>
                  </div>
                </div>

                {/* Seletor de Bandeiras para Configuração Individual */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black uppercase text-[#dfa666] tracking-wider flex items-center gap-1.5">
                      <CreditCard size={14} /> Selecione a Bandeira para Configurar:
                    </label>
                    <span className="text-[10px] text-gray-400">Taxas e parcelamento por bandeira</span>
                  </div>

                  <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'VISA_MASTER', label: 'Visa / Master', sub: 'Padrão' },
                      { id: 'ELO', label: 'Elo', sub: 'Nacional' },
                      { id: 'HIPERCARD', label: 'Hipercard', sub: 'Varejo' },
                      { id: 'AMEX', label: 'Amex', sub: 'Premium' },
                      { id: 'OUTRAS', label: 'Outras', sub: 'Diversas' }
                    ].map(b => {
                      const isSelected = selectedBrandFeeTab === b.id;
                      const brandData = paymentFees.brands?.[b.id] || defaultBrandRates[b.id] || {};
                      const debRate = brandData.debitFeePct ?? 0;

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBrandFeeTab(b.id)}
                          className={`p-2 rounded-xl text-left border transition-all ${
                            isSelected
                              ? 'bg-[#942620] border-[#942620] text-white shadow-lg'
                              : 'bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs block truncate">{b.label}</span>
                          </div>
                          <span className="text-[9px] opacity-80 block">Débito: {debRate}%</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Configuração da Bandeira Selecionada */}
                {(() => {
                  const activeBrandKey = selectedBrandFeeTab;
                  const activeBrandData = paymentFees.brands?.[activeBrandKey] || defaultBrandRates[activeBrandKey] || defaultBrandRates.VISA_MASTER;

                  return (
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                          🏷️ Bandeira: <strong className="text-[#dfa666]">{activeBrandData.name}</strong>
                        </span>
                        <span className="text-[10px] text-gray-400">Edite o Débito e cada parcela de 1x a 18x</span>
                      </div>

                      {/* Taxa de Débito da Bandeira */}
                      <div>
                        <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center justify-between">
                          <span>Taxa Cartão de Débito ({activeBrandData.name})</span>
                          <span className="text-[10px] text-gray-400">Cobrada nas compras à vista no débito</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={activeBrandData.debitFeePct ?? ''}
                            onChange={(e) => {
                              const newDeb = parseFloat(e.target.value) || 0;
                              const updatedBrands = { ...(paymentFees.brands || defaultBrandRates) };
                              updatedBrands[activeBrandKey] = {
                                ...activeBrandData,
                                debitFeePct: newDeb
                              };
                              setPaymentFees({
                                ...paymentFees,
                                debitFeePct: activeBrandKey === 'VISA_MASTER' ? newDeb : paymentFees.debitFeePct,
                                brands: updatedBrands
                              });
                            }}
                            className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none pr-8"
                          />
                          <span className="absolute right-3 top-2 text-xs text-gray-500">%</span>
                        </div>
                      </div>

                      {/* Grade de Taxas 1x a 18x da Bandeira */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-bold text-gray-300">
                          Taxas de Parcelamento no Crédito (1x até 18x - {activeBrandData.name}):
                        </label>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-60 overflow-y-auto pr-1">
                          {Array.from({ length: 18 }, (_, idx) => idx + 1).map((n) => {
                            const key = String(n);
                            const isWithinMax = n <= (paymentFees.maxInstallments || 18);
                            const val = activeBrandData.installmentRates?.[key] ?? '';

                            return (
                              <div
                                key={n}
                                className={`p-2 rounded-lg border transition-all ${
                                  isWithinMax ? 'bg-neutral-900/90 border-white/10' : 'bg-neutral-950/40 border-white/5 opacity-40'
                                }`}
                              >
                                <span className="block text-[10px] font-black text-gray-300 uppercase mb-1">
                                  {n === 1 ? '1x (À vista)' : `${n}x`}
                                </span>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={val}
                                    onChange={(e) => {
                                      const newPct = parseFloat(e.target.value) || 0;
                                      const updatedRates = { ...(activeBrandData.installmentRates || {}) };
                                      updatedRates[key] = newPct;

                                      const updatedBrands = { ...(paymentFees.brands || defaultBrandRates) };
                                      updatedBrands[activeBrandKey] = {
                                        ...activeBrandData,
                                        installmentRates: updatedRates
                                      };

                                      setPaymentFees({
                                        ...paymentFees,
                                        installmentRates: activeBrandKey === 'VISA_MASTER' ? updatedRates : paymentFees.installmentRates,
                                        brands: updatedBrands
                                      });
                                    }}
                                    placeholder="0.00"
                                    className="w-full bg-black border border-white/15 rounded px-1.5 py-1 text-[11px] text-white font-mono text-center focus:outline-none focus:border-[#942620]"
                                  />
                                  <span className="absolute right-1 top-1 text-[10px] text-gray-500">%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Prazo de Recebimento & Padrão de Repasse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Prazo de Recebimento</label>
                    <select
                      value={paymentFees.payoutDays}
                      onChange={(e) => setPaymentFees({ ...paymentFees, payoutDays: e.target.value })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    >
                      <option value="D+0">D+0 (Cai na hora no mesmo dia)</option>
                      <option value="D+1">D+1 (1 dia útil após a venda)</option>
                      <option value="D+14">D+14 (14 dias corridos)</option>
                      <option value="D+30">D+30 (30 dias para cada parcela)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Quem assume a taxa por padrão?</label>
                    <select
                      value={paymentFees.defaultFeePayer || 'LOJA'}
                      onChange={(e) => setPaymentFees({ ...paymentFees, defaultFeePayer: e.target.value, passFeeToCustomer: e.target.value === 'CLIENTE' })}
                      className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    >
                      <option value="LOJA">🏢 Empresa Assume (Sem juros p/ cliente)</option>
                      <option value="CLIENTE">👤 Cliente Assume (Repassar juros no PDV)</option>
                    </select>
                  </div>
                </div>

                {['PROPRIETARIA', 'GERENTE'].includes(user?.role) && (
                  <button
                    type="submit"
                    disabled={savingFees}
                    className="w-full py-3 bg-[#942620] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check size={16} /> {savingFees ? 'Gravando Alterações...' : 'Salvar Taxas da Maquininha & Bandeiras'}
                  </button>
                )}
              </form>

              {/* Simulador Interativo de Lucro Líquido (5 cols) */}
              <div className="lg:col-span-5 bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-[#dfa666] border-b border-white/10 pb-3">
                    <Calculator size={18} />
                    <h3 className="text-sm font-black uppercase text-white">Simulador em Tempo Real</h3>
                  </div>

                  <p className="text-xs text-gray-400 mt-2">
                    Simule qualquer valor por bandeira em até 18x e veja o impacto exato no caixa:
                  </p>

                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">Valor da Venda (R$)</label>
                      <input
                        type="number"
                        step="5"
                        min="1"
                        value={simAmount}
                        onChange={(e) => setSimAmount(e.target.value)}
                        placeholder="100.00"
                        className="w-full bg-black border border-white/20 rounded-xl px-3.5 py-2 text-white text-sm font-black font-mono focus:outline-none focus:border-[#942620]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">Forma de Pagamento</label>
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        {[
                          { id: 'PIX', label: 'PIX' },
                          { id: 'DEBITO', label: 'Débito' },
                          { id: 'CREDITO', label: 'Crédito' }
                        ].map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSimMethod(m.id)}
                            className={`p-2 rounded-xl text-center font-bold transition-all text-xs ${
                              simMethod === m.id
                                ? 'bg-[#942620] text-white shadow'
                                : 'bg-black text-gray-400 hover:text-white border border-white/10'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Seleção de Bandeira no Simulador */}
                    {['CREDITO', 'DEBITO'].includes(simMethod) && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">Bandeira do Cartão</label>
                        <div className="grid grid-cols-3 xs:grid-cols-5 gap-1 text-[11px]">
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
                              onClick={() => setSimBrand(b.id)}
                              className={`py-1.5 px-1 rounded-lg text-center font-bold transition-all text-[10px] truncate ${
                                simBrand === b.id
                                  ? 'bg-[#dfa666] text-black shadow'
                                  : 'bg-black text-gray-400 hover:text-white border border-white/10'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {simMethod === 'CREDITO' && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">Número de Parcelas (1x a 18x)</label>
                        <select
                          value={simInstallment}
                          onChange={(e) => setSimInstallment(e.target.value)}
                          className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none font-bold"
                        >
                          {Array.from({ length: paymentFees.maxInstallments || 18 }, (_, idx) => idx + 1).map((n) => {
                            const r = (currentSimBrandData.installmentRates && currentSimBrandData.installmentRates[String(n)] !== undefined)
                              ? currentSimBrandData.installmentRates[String(n)]
                              : (paymentFees.installmentRates?.[String(n)] ?? 0);
                            return (
                              <option key={n} value={String(n)}>
                                {n}x ({r}% de taxa - {currentSimBrandData.name})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Toggle: Quem assume a taxa? */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 mb-1 uppercase">Quem assume a taxa da maquininha?</label>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setSimFeePayer('LOJA')}
                          className={`p-2 rounded-xl text-center font-bold transition-all text-[11px] ${
                            simFeePayer === 'LOJA'
                              ? 'bg-neutral-800 text-white border border-[#dfa666]'
                              : 'bg-black text-gray-400 hover:text-white border border-white/10'
                          }`}
                        >
                          🏢 Empresa Assume
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimFeePayer('CLIENTE')}
                          className={`p-2 rounded-xl text-center font-bold transition-all text-[11px] ${
                            simFeePayer === 'CLIENTE'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-600'
                              : 'bg-black text-gray-400 hover:text-white border border-white/10'
                          }`}
                        >
                          👤 Cliente Assume
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resultado do Cálculo */}
                  <div className="bg-black/60 border border-white/10 rounded-2xl p-4 space-y-2.5 mt-4">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Total Cobrado do Cliente:</span>
                      <span className="text-white font-black font-mono">R$ {simTotalCustomer.toFixed(2)}</span>
                    </div>

                    {simMethod === 'CREDITO' && (
                      <div className="flex justify-between text-xs text-[#dfa666]">
                        <span>Valor de Cada Parcela:</span>
                        <span className="font-bold font-mono">{simInstCount}x de R$ {simParcelValue.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-red-400">
                      <span>Taxa Maquininha ({activeRate.toFixed(2)}% • {simMethod === 'PIX' ? 'PIX' : currentSimBrandData.name}):</span>
                      <span className="font-bold font-mono">
                        {simFeePayer === 'LOJA' ? `- R$ ${simFeeDeduction.toFixed(2)}` : `+ R$ ${simFeeDeduction.toFixed(2)} (Pago pelo cliente)`}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                      <span className="text-xs font-bold text-emerald-400 uppercase">Líquido na Conta da Loja:</span>
                      <span className="text-xl font-black text-emerald-400 font-mono">
                        R$ {simNetAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                      <span>Previsão de Crédito:</span>
                      <span className="text-[#dfa666] font-bold">{paymentFees.payoutDays} ({paymentFees.operatorName})</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-800/40 p-3 rounded-xl text-[11px] text-gray-400">
                  💡 <strong>No PDV:</strong> O vendedor poderá escolher a bandeira do cartão e se a venda será sem juros (empresa assume) ou com repasse (cliente assume).
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            ABA 2: PRODUTOS & VARIAÇÕES
        ======================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white">Produtos & Catálogo</h2>
                <p className="text-xs text-gray-400">Cadastre novas peças, gerencie fotos, preços de venda, preços promocionais e estoque inicial.</p>
              </div>

              <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 flex-1 sm:w-56">
                  <Search size={15} className="text-[#942620] shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar nome ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none placeholder-gray-500 w-full min-w-0"
                  />
                </div>

                {['PROPRIETARIA', 'GERENTE'].includes(user?.role) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="bg-emerald-700/90 hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow shrink-0 border border-emerald-500/30 transition-colors"
                      title="Importar produtos em lote a partir de planilha Excel (.xlsx)"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-300" /> Importar Planilha (.xlsx)
                    </button>

                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({
                          name: '',
                          description: '',
                          categoryId: categories[0]?.id || '',
                          brand: 'Litran',
                          sku: '',
                          barcode: '',
                          price: '',
                          promoPrice: '',
                          costPrice: '',
                          minStock: '2',
                          stockQty: '10',
                          image: '',
                          colorImages: {},
                          variants: [
                            { size: 'P', color: '', stockQty: '2' },
                            { size: 'M', color: '', stockQty: '4' },
                            { size: 'G', color: '', stockQty: '4' }
                          ]
                        });
                        setShowProductModal(true);
                      }}
                      className="bg-[#942620] hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow shrink-0 transition-colors"
                    >
                      <Plus size={16} /> Cadastrar Produto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Banner de Ajuda da Aba */}
            <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3 text-xs text-gray-300 flex items-center gap-2">
              <HelpCircle size={15} className="text-[#dfa666] shrink-0" />
              <span><strong>Dica rápida:</strong> O SKU é o identificador único da peça no sistema. Você pode cadastrar foto por upload direto e gerenciar a grade completa de cores, tamanhos e quantidades por variação.</span>
            </div>

            {/* Tabela de Produtos */}
            <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-black text-gray-400 uppercase font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">Foto / SKU</th>
                      <th className="p-3">Nome da Peça & Grade</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3 text-right">Preço de Venda</th>
                      <th className="p-3 text-right">Preço de Custo</th>
                      <th className="p-3 text-center">Estoque Total</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map((p) => {
                      const primaryImg = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url;
                      const hasVariants = p.variants && p.variants.length > 0;

                      return (
                        <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {primaryImg ? (
                                <img src={primaryImg} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0 bg-black" />
                              ) : (
                                <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-[10px] text-gray-500 shrink-0 border border-white/5">Sem foto</div>
                              )}
                              <span className="font-mono font-bold text-[#dfa666]">{p.sku}</span>
                            </div>
                          </td>
                          <td className="p-3 max-w-[280px]">
                            <div className="font-bold text-white truncate">{p.name}</div>
                            {hasVariants ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.variants.slice(0, 5).map((v) => (
                                  <span
                                    key={v.id || v.sku}
                                    className="bg-black/60 border border-white/10 text-[10px] px-1.5 py-0.5 rounded text-gray-300 flex items-center gap-1 font-mono"
                                  >
                                    {v.color ? <span className="text-[#dfa666]">{v.color}</span> : null}
                                    <span className="font-bold text-white">{v.size}</span>
                                    <span className="text-emerald-400 font-extrabold">({v.stockQty ?? v.stockAvailable ?? 0})</span>
                                  </span>
                                ))}
                                {p.variants.length > 5 && (
                                  <span className="text-[10px] text-gray-500 self-center">+{p.variants.length - 5} var</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500 block mt-0.5">Variação única</span>
                            )}
                          </td>
                          <td className="p-3 text-gray-400">{p.category?.name || 'Geral'}</td>
                          <td className="p-3 text-right font-black text-white whitespace-nowrap">
                            R$ {p.price.toFixed(2)}
                            {p.promoPrice && <span className="block text-[10px] text-[#942620]">Promo: R$ {p.promoPrice.toFixed(2)}</span>}
                          </td>
                          <td className="p-3 text-right text-gray-400 whitespace-nowrap">R$ {p.costPrice.toFixed(2)}</td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`font-black ${p.stockAvailable > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {p.stockAvailable} un
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                            }`}>
                              {p.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  const loadedColorImages = p.colorImages ? { ...p.colorImages } : {};
                                  if (p.variants && Array.isArray(p.variants)) {
                                    p.variants.forEach(v => {
                                      if (v.color && v.imageUrl && !loadedColorImages[v.color.trim()]) {
                                        loadedColorImages[v.color.trim()] = v.imageUrl;
                                      }
                                    });
                                  }
                                  const loadedVariants = (p.variants && p.variants.length > 0)
                                    ? p.variants.map(v => ({
                                        id: v.id,
                                        sku: v.sku,
                                        size: v.size,
                                        color: v.color || '',
                                        imageUrl: v.imageUrl || (v.color ? loadedColorImages[v.color.trim()] : null) || null,
                                        stockQty: String(v.stockQty ?? v.stockAvailable ?? 0),
                                        price: v.price ? String(v.price) : String(p.price),
                                        costPrice: v.costPrice ? String(v.costPrice) : String(p.costPrice)
                                      }))
                                    : [];
                                  setProductForm({
                                    name: p.name,
                                    description: p.description || '',
                                    categoryId: p.categoryId,
                                    brand: p.brand || 'Litran',
                                    sku: p.sku,
                                    barcode: p.barcode || '',
                                    price: String(p.price),
                                    promoPrice: p.promoPrice ? String(p.promoPrice) : '',
                                    costPrice: String(p.costPrice),
                                    minStock: String(p.minStock),
                                    stockQty: String(p.stockAvailable || 0),
                                    image: primaryImg || '',
                                    colorImages: loadedColorImages,
                                    variants: loadedVariants
                                  });
                                  setShowProductModal(true);
                                }}
                                title="Editar Produto, Variações & Foto"
                                className="p-1.5 bg-neutral-800 hover:bg-[#942620] text-gray-300 hover:text-white rounded transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                              {['PROPRIETARIA'].includes(user?.role) && p.isActive && (
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  title="Desativar Produto do Catálogo"
                                  className="p-1 bg-neutral-800 hover:bg-red-900/60 text-red-400 rounded"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 3: ESTOQUE CENTRAL & AJUSTES
        ======================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white">Estoque Central & Saldos</h2>
                <p className="text-xs text-gray-400">Controle rigoroso dos saldos físicos e disponíveis por peça e variação de tamanho.</p>
              </div>
              {['PROPRIETARIA', 'GERENTE'].includes(user?.role) && (
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="bg-[#942620] hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-2 shadow self-start sm:self-auto shrink-0"
                >
                  <Plus size={16} /> Ajustar Estoque Manual
                </button>
              )}
            </div>

            {/* Banner Explicativo de Estoque */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3 text-xs">
                <span className="font-bold text-white block">Estoque Físico:</span>
                <p className="text-gray-400 mt-0.5">Total de peças presentes fisicamente nas prateleiras e gavetas.</p>
              </div>
              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3 text-xs">
                <span className="font-bold text-white block">Estoque Reservado:</span>
                <p className="text-gray-400 mt-0.5">Peças em processo de separação ou aguardando pagamento online.</p>
              </div>
              <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3 text-xs">
                <span className="font-bold text-emerald-400 block">Estoque Disponível:</span>
                <p className="text-gray-400 mt-0.5">Físico menos Reservado. Quantidade que pode ser vendida agora.</p>
              </div>
            </div>

            <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-black text-gray-400 uppercase font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-center">Físico</th>
                      <th className="p-3 text-center">Reservado</th>
                      <th className="p-3 text-center">Disponível para Venda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {inventoryBalances.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 font-mono font-bold text-[#dfa666]">{b.variant ? b.variant.sku : b.product.sku}</td>
                        <td className="p-3 font-bold text-white">
                          {b.product.name}{' '}
                          {b.variant ? (
                            <span className="text-[#dfa666] font-mono text-[11px]">
                              ({b.variant.color ? b.variant.color + ' ' : ''}{b.variant.size})
                            </span>
                          ) : ''}
                        </td>
                        <td className="p-3 text-center text-gray-300">{b.physicalQty}</td>
                        <td className="p-3 text-center text-gray-500">{b.reservedQty}</td>
                        <td className="p-3 text-center font-extrabold text-emerald-400">{b.availableQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="text-sm font-black uppercase text-white mt-6">Histórico Recente de Movimentações (Auditoria de Estoque)</h3>
            <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-black text-gray-400 uppercase font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Tipo da Movimentação</th>
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-center">Qtd</th>
                      <th className="p-3">Motivo Informado / Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 text-gray-400 whitespace-nowrap">{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                        <td className="p-3 font-bold text-[#942620]">{m.type}</td>
                        <td className="p-3 text-white">{m.product.name}</td>
                        <td className="p-3 text-center font-bold">{m.qty}</td>
                        <td className="p-3 text-gray-300">{m.reason} ({m.user.name})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 4: CLIENTES & CREDIÁRIO
        ======================================================== */}
        {activeTab === 'customers' && (
          <div className="space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white">Clientes & Crediário Próprio</h2>
                <p className="text-xs text-gray-400">Administre o cadastro de clientes, limites de crédito fiado e histórico financeiro.</p>
              </div>

              <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 flex-1 sm:w-56">
                  <Search size={15} className="text-[#942620] shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar nome, CPF ou tel..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none placeholder-gray-500 w-full min-w-0"
                  />
                </div>

                <button
                  onClick={() => {
                    setEditingCustomer(null);
                    setCustomerForm({ name: '', cpf: '', phone: '', email: '', address: '', creditLimit: '500' });
                    setShowCustomerModal(true);
                  }}
                  className="bg-[#942620] hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow shrink-0"
                >
                  <Plus size={16} /> Novo Cliente
                </button>
              </div>
            </div>

            {/* Banner de Ajuda do Crediário */}
            <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3 text-xs text-gray-300 flex items-center gap-2">
              <CreditCard size={16} className="text-[#dfa666] shrink-0" />
              <span><strong>Como funciona o Crediário?</strong> O cliente cadastrado pode comprar a prazo no PDV. O sistema debita do limite concedido e bloqueia automaticamente novas compras se o limite for atingido.</span>
            </div>

            {/* Grid de Clientes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredCustomers.map((c) => {
                const limit = c.creditLimit || c.creditAccount?.creditLimit || 500;
                const used = c.creditAccount?.usedCredit || 0;
                const avail = Math.max(0, limit - used);

                return (
                  <div key={c.id} className="bg-neutral-900 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 w-full min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-white text-sm break-words min-w-0">{c.name}</h4>
                        <span className="text-[10px] bg-neutral-800 text-gray-300 px-2 py-0.5 rounded font-mono shrink-0">
                          {c.cpf ? `CPF: ${c.cpf}` : 'Sem CPF'}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400 space-y-1 mt-2">
                        {c.phone && <p className="flex items-center gap-1.5 truncate"><Phone size={12} className="text-[#dfa666] shrink-0" /> <span className="truncate">{c.phone}</span></p>}
                        {c.email && <p className="flex items-center gap-1.5 truncate"><Mail size={12} className="text-[#dfa666] shrink-0" /> <span className="truncate">{c.email}</span></p>}
                        {c.address && <p className="flex items-center gap-1.5 break-words"><MapPin size={12} className="text-[#dfa666] shrink-0" /> <span className="line-clamp-2">{c.address}</span></p>}
                      </div>

                      {/* Caixa de Crediário */}
                      <div className="bg-black/60 border border-white/5 rounded-xl p-2.5 text-xs space-y-1 mt-3">
                        <div className="flex justify-between text-gray-400">
                          <span>Limite Aprovado:</span>
                          <span className="text-white font-bold">R$ {limit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Dívida Atual:</span>
                          <span className="text-red-400 font-bold">R$ {used.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-white/5">
                          <span>Saldo Disponível:</span>
                          <span>R$ {avail.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCustomer(c);
                            setCustomerForm({
                              name: c.name,
                              cpf: c.cpf || '',
                              phone: c.phone || '',
                              email: c.email || '',
                              address: c.address || '',
                              creditLimit: String(limit)
                            });
                            setShowCustomerModal(true);
                          }}
                          className="text-xs text-gray-300 hover:text-white flex items-center gap-1"
                        >
                          <Edit2 size={13} /> Ajustar Dados
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c)}
                          title="Excluir Cliente"
                          className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <a
                        href="/pdv"
                        className="text-xs bg-[#942620] hover:bg-red-700 text-white px-2.5 py-1 rounded-lg font-bold"
                      >
                        Atender no PDV
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 5: EQUIPE & FUNCIONÁRIOS
        ======================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-4 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black uppercase text-white">Equipe & Funcionários</h2>
                  <span className="text-xs bg-neutral-800 border border-white/10 text-[#dfa666] font-bold px-2.5 py-0.5 rounded-full">
                    {usersList.length} {usersList.length === 1 ? 'membro' : 'membros'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Crie contas, defina cargos, limite de descontos no PDV e comissões por venda.</p>
              </div>

              <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <div className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 flex-1 sm:w-52">
                  <Search size={15} className="text-[#942620] shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="bg-transparent text-xs text-white focus:outline-none placeholder-gray-500 w-full min-w-0"
                  />
                </div>

                <button
                  onClick={fetchUsers}
                  title="Recarregar Lista"
                  className="bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-gray-300 hover:text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow shrink-0"
                >
                  <RefreshCw size={14} /> <span className="hidden xs:inline">Atualizar</span>
                </button>

                {['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes((user?.role || '').toUpperCase()) && (
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm({ name: '', email: '', password: '', role: 'VENDEDOR', discountLimitPct: '5.0', commissionPct: '3.0' });
                      setShowUserModal(true);
                    }}
                    className="bg-[#942620] hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow shrink-0"
                  >
                    <Plus size={16} /> Novo Funcionário
                  </button>
                )}
              </div>
            </div>

            {/* Banner de Ajuda de Permissões */}
            <div className="bg-neutral-900/60 border border-white/10 rounded-xl p-3 text-xs text-gray-300 flex items-center gap-2">
              <Shield size={16} className="text-[#dfa666] shrink-0" />
              <span><strong>Controle de Acesso Imediato:</strong> Todo funcionário criado acessa imediatamente o sistema com o e-mail e senha cadastrados. Se suspender o acesso, o login dele é bloqueado na hora.</span>
            </div>

            {/* Grid de Funcionários ou Estado Vazio */}
            {filteredUsers.length === 0 ? (
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-8 text-center space-y-3">
                <Users size={40} className="text-gray-500 mx-auto" />
                <h3 className="text-sm font-bold text-white uppercase">
                  {userSearch ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {userSearch
                    ? `Nenhum resultado para "${userSearch}". Verifique a digitação ou limpe a busca.`
                    : 'Cadastre os membros da sua equipe para definir permissões, limites de desconto e comissões por venda no PDV.'}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={fetchUsers}
                    className="bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Recarregar Lista
                  </button>
                  {['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes((user?.role || '').toUpperCase()) && (
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setUserForm({ name: '', email: '', password: '', role: 'VENDEDOR', discountLimitPct: '5.0', commissionPct: '3.0' });
                        setShowUserModal(true);
                      }}
                      className="bg-[#942620] hover:bg-red-700 text-xs text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Novo Funcionário
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filteredUsers.map((u) => {
                  const isProprietaria = ['PROPRIETARIA', 'ADMIN', 'ADMINISTRADOR'].includes((u.role || '').toUpperCase());

                  return (
                    <div key={u.id} className="bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 w-full min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-white text-sm sm:text-base break-words">{u.name}</h4>
                            <span className="text-xs text-gray-400 block truncate">{u.email}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            u.isBlocked
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}>
                            {u.isBlocked ? 'Suspenso' : 'Ativo'}
                          </span>
                        </div>

                        {/* Cargo e Alçada */}
                        <div className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs space-y-2 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Cargo:</span>
                            <span className="font-black text-[#dfa666] uppercase">{u.role}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Comissão por Venda:</span>
                            <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded text-[11px]">
                              {u.commissionPct ?? 0}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Desc. Max PDV:</span>
                            <span className="font-bold text-white bg-neutral-800 px-2 py-0.5 rounded text-[11px]">
                              {u.discountLimitPct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações do Funcionário */}
                      <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenUserReport(u)}
                          className="bg-neutral-800 hover:bg-neutral-700 text-[#dfa666] px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <FileText size={13} /> Relatório
                        </button>

                        <div className="flex items-center gap-1.5">
                          {['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes((user?.role || '').toUpperCase()) && (
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setUserForm({
                                  name: u.name,
                                  email: u.email,
                                  password: '',
                                  role: u.role,
                                  discountLimitPct: String(u.discountLimitPct ?? 5.0),
                                  commissionPct: String(u.commissionPct ?? 0.0)
                                });
                                setShowUserModal(true);
                              }}
                              title="Editar Dados, Cargo ou Senha"
                              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          {['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR'].includes((user?.role || '').toUpperCase()) && !isProprietaria && (
                            <button
                              onClick={() => handleToggleBlockUser(u)}
                              title={u.isBlocked ? 'Liberar Acesso' : 'Suspender Acesso'}
                              className={`p-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors ${
                                u.isBlocked
                                  ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300'
                                  : 'bg-amber-900/60 hover:bg-amber-800 text-amber-300'
                              }`}
                            >
                              {u.isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
                            </button>
                          )}

                          {['PROPRIETARIA', 'ADMIN', 'ADMINISTRADOR'].includes((user?.role || '').toUpperCase()) && !isProprietaria && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Excluir Funcionário"
                              className="p-1.5 bg-neutral-800 hover:bg-red-950 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            ABA 6: RELATÓRIOS & CSV
        ======================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white">Relatórios Gerenciais & Exportação</h2>
              <p className="text-xs text-gray-400">Gere planilhas para fechamento contábil e auditoria financeira.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="font-bold text-white text-sm">Exportar Vendas do Sistema</h3>
                <p className="text-xs text-gray-400">Baixa um arquivo .CSV contendo todas as vendas, data/hora, cliente, operador, itens, descontos e métodos de pagamento.</p>
                <button
                  onClick={() => handleExportCsv('sales')}
                  className="w-full sm:w-auto bg-[#942620] hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow"
                >
                  <Download size={16} /> Baixar Vendas (CSV)
                </button>
              </div>

              <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="font-bold text-white text-sm">Exportar Posição de Estoque</h3>
                <p className="text-xs text-gray-400">Baixa um arquivo .CSV com todos os SKUs, preços de custo, preços de venda, saldo físico e valor total do estoque em reais.</p>
                <button
                  onClick={() => handleExportCsv('inventory')}
                  className="w-full sm:w-auto bg-black hover:bg-neutral-800 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow"
                >
                  <Download size={16} /> Baixar Estoque (CSV)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA 7: AUDITORIA
        ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase text-white">Registros Imutáveis de Auditoria</h2>
              <p className="text-xs text-gray-400">Histórico de segurança que registra quem fez cada alteração crítica no sistema.</p>
            </div>

            <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-black text-gray-400 uppercase font-bold border-b border-white/10">
                    <tr>
                      <th className="p-3">Data/Hora</th>
                      <th className="p-3">Usuário Responsável</th>
                      <th className="p-3">Ação Executada</th>
                      <th className="p-3">Módulo/Entidade</th>
                      <th className="p-3">Detalhes / Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-800/40">
                        <td className="p-3 text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                        <td className="p-3 font-bold text-white">{log.user ? log.user.name : 'Sistema'}</td>
                        <td className="p-3 text-emerald-400 font-bold">{log.action}</td>
                        <td className="p-3 text-gray-300">{log.entity}</td>
                        <td className="p-3 text-gray-400">{log.reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ABA: DESCONTOS & CUPONS PROMOCIONAIS
        ======================================================== */}
        {activeTab === 'coupons' && (
          <div className="space-y-6 w-full animate-fade-in">
            {/* Header */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-black uppercase text-white flex items-center gap-2">
                    <Tag size={20} className="text-[#942620]" />
                    Gestão de Descontos & Códigos Promocionais
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Crie códigos de desconto com porcentagens personalizadas para seus clientes aplicarem no carrinho e acompanhe as vendas realizadas com cada cupom.
                  </p>
                </div>

                <button
                  onClick={fetchCoupons}
                  className="self-start sm:self-auto bg-neutral-900 hover:bg-neutral-800 text-gray-300 hover:text-white border border-white/10 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} className={loadingCoupons ? 'animate-spin' : ''} />
                  <span>Atualizar</span>
                </button>
              </div>

              {/* Info Banner */}
              <div className="bg-neutral-900/80 border border-white/10 rounded-2xl p-4 mt-3 flex items-start gap-3">
                <Info size={18} className="text-[#dfa666] shrink-0 mt-0.5" />
                <div className="text-xs text-gray-300 space-y-1">
                  <p className="font-bold text-white">Como funcionam os Cupons Litran?</p>
                  <p>
                    Qualquer código criado nesta aba fica disponível imediatamente para os clientes inserirem no carrinho de compras. O pedido via WhatsApp já menciona o código utilizado e o desconto percentual e monetário aplicado. Você pode registrar aqui cada venda realizada e visualizar o número total de vendas de cada cupom.
                  </p>
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl">
                <span className="text-xs text-gray-400 font-bold block uppercase">Total de Cupons Criados</span>
                <span className="text-2xl sm:text-3xl font-black text-white block mt-1">
                  {coupons.length}
                </span>
                <p className="text-[11px] text-gray-500 mt-1">Códigos promocionais configurados</p>
              </div>

              <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl">
                <span className="text-xs text-gray-400 font-bold block uppercase">Cupons Ativos</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 block mt-1">
                  {coupons.filter(c => c.isActive).length}
                </span>
                <p className="text-[11px] text-emerald-400/80 mt-1">Habilitados para uso no carrinho</p>
              </div>

              <div className="p-4 bg-neutral-900 border border-[#dfa666]/30 rounded-2xl bg-gradient-to-br from-neutral-900 to-[#dfa666]/5">
                <span className="text-xs text-[#dfa666] font-bold block uppercase">Total de Vendas Realizadas</span>
                <span className="text-2xl sm:text-3xl font-black text-[#dfa666] block mt-1">
                  {coupons.reduce((acc, c) => acc + (c.salesCount || 0), 0)}
                </span>
                <p className="text-[11px] text-gray-400 mt-1">Vendas informadas com cupons</p>
              </div>
            </div>

            {/* Form: Criar Novo Cupom de Desconto */}
            <div className="bg-neutral-900 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-[#dfa666]" />
                    Criar Novo Código de Desconto
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Defina o código (ex: LITRAN20) e a porcentagem de desconto equivalente que será aplicada.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  
                  {/* Código do Cupom */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase text-gray-300 mb-1.5">
                      Código do Cupom *
                    </label>
                    <div className="flex items-center bg-black border border-white/15 rounded-xl px-3 py-2.5 focus-within:border-[#942620]">
                      <Tag size={16} className="text-[#942620] mr-2 shrink-0" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: LITRAN20, VERAO15..."
                        value={couponForm.code}
                        onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                        className="bg-transparent text-white text-xs font-black uppercase tracking-wider w-full focus:outline-none placeholder-gray-600"
                      />
                    </div>
                  </div>

                  {/* Porcentagem de Desconto */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase text-gray-300">
                        Porcentagem de Desconto *
                      </label>
                      <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        {couponForm.discountPercent || 0}% OFF
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-black border border-white/15 rounded-xl px-3 py-1.5">
                      <Percent size={15} className="text-emerald-400 shrink-0" />
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="1"
                        value={couponForm.discountPercent || '20'}
                        onChange={(e) => setCouponForm({ ...couponForm, discountPercent: e.target.value })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        required
                        value={couponForm.discountPercent}
                        onChange={(e) => setCouponForm({ ...couponForm, discountPercent: e.target.value })}
                        className="w-14 bg-neutral-900 border border-white/10 rounded-lg text-center text-xs font-black text-white p-1 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Descrição / Campanha */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase text-gray-300 mb-1.5">
                      Descrição / Finalidade (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Campanha de Redes Sociais, Clientes VIP..."
                      value={couponForm.description}
                      onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                      className="bg-black border border-white/15 text-white text-xs px-3 py-2.5 rounded-xl w-full focus:outline-none focus:border-[#942620] placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* Botões de Atalho Rápido de Porcentagem */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-gray-400 font-bold mr-1">Atalhos rápidos:</span>
                  {['5', '10', '15', '20', '25', '30', '50'].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setCouponForm({ ...couponForm, discountPercent: pct })}
                      className={`text-xs px-2.5 py-1 rounded-lg font-extrabold transition-all ${
                        String(couponForm.discountPercent) === pct
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-black text-gray-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={creatingCoupon}
                    className="bg-[#942620] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>{creatingCoupon ? 'Criando Cupom...' : 'Criar Código de Desconto'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Códigos de Desconto Criados */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black uppercase text-white">
                    Códigos de Desconto Criados ({filteredCoupons.length})
                  </h3>
                </div>

                {/* Campo de Busca */}
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar código ou descrição..."
                    value={couponSearch}
                    onChange={(e) => setCouponSearch(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#942620]"
                  />
                </div>
              </div>

              {filteredCoupons.length === 0 ? (
                <div className="bg-neutral-900 border border-white/10 rounded-2xl p-10 text-center space-y-2">
                  <Tag size={36} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">Nenhum cupom encontrado</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    {couponSearch
                      ? 'Nenhum cupom corresponde à sua busca. Tente outro termo.'
                      : 'Cadastre seu primeiro código de desconto no formulário acima.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCoupons.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                        item.isActive
                          ? 'bg-neutral-900/90 border-white/15 hover:border-white/30'
                          : 'bg-neutral-950/80 border-white/5 opacity-70'
                      }`}
                    >
                      {/* Top Bar do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          {/* Código Estilizado */}
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black uppercase tracking-wider text-white bg-black px-3 py-1 rounded-xl border border-white/20 shadow-inner flex items-center gap-1.5">
                              <Tag size={13} className="text-[#942620]" />
                              {item.code}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.code);
                                setCopiedCouponCode(item.code);
                                setTimeout(() => setCopiedCouponCode(null), 1500);
                              }}
                              title="Copiar código"
                              className="text-gray-400 hover:text-white p-1 rounded-lg bg-white/5 transition-colors"
                            >
                              {copiedCouponCode === item.code ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-gray-400 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Badge de Porcentagem */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-xl shadow inline-block">
                            {item.discountPercent}% OFF
                          </span>
                        </div>
                      </div>

                      {/* Contador de Vendas Realizadas (Destaque Principal) */}
                      <div className="bg-black/60 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">
                            Vendas Realizadas
                          </span>
                          <span className="text-lg font-black text-[#dfa666] flex items-center gap-1 mt-0.5">
                            🔥 {item.salesCount || 0} {item.salesCount === 1 ? 'venda' : 'vendas'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Botão + 1 Venda Rápida */}
                          <button
                            onClick={() => handleQuickAddSale(item)}
                            title="Adicionar +1 venda realizada instantaneamente"
                            className="bg-emerald-700/80 hover:bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow"
                          >
                            <Plus size={12} /> 1 Venda
                          </button>

                          {/* Botão Informar Venda com Detalhes */}
                          <button
                            onClick={() => {
                              setSelectedCouponForSale(item);
                              setSaleRecordForm({
                                saleCode: '',
                                customerName: '',
                                amount: '',
                                discountValue: '',
                                notes: ''
                              });
                              setShowRecordSaleModal(true);
                            }}
                            title="Informar detalhes da venda realizada (comanda, cliente, valor)"
                            className="bg-[#942620] hover:bg-red-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow"
                          >
                            + Informar
                          </button>
                        </div>
                      </div>

                      {/* Botões de Ações e Status */}
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs gap-2">
                        {/* Toggle Status Ativo / Inativo */}
                        <button
                          onClick={() => handleToggleCoupon(item)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
                            item.isActive
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                              : 'bg-neutral-800 text-gray-400 border border-white/10'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                          <span>{item.isActive ? 'Ativo' : 'Inativo'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Ver Histórico de Vendas */}
                          <button
                            onClick={() => {
                              setSelectedCouponForHistory(item);
                              setShowHistoryModal(true);
                            }}
                            className="text-xs text-gray-300 hover:text-white underline font-semibold flex items-center gap-1"
                          >
                            <FileText size={13} />
                            <span>Vendas ({item.sales?.length || item.salesCount || 0})</span>
                          </button>

                          {/* Excluir Cupom */}
                          <button
                            onClick={() => handleDeleteCoupon(item)}
                            title="Excluir Cupom"
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          MODAL: CADASTRO / EDIÇÃO DE PRODUTO
      ======================================================== */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <form
            onSubmit={handleSaveProduct}
            className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-2xl w-full space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-white flex items-center gap-2">
                  <Package size={18} className="text-[#942620]" />
                  {editingProduct ? 'Editar Peça / Produto' : 'Cadastrar Nova Peça no Estoque'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Configure fotos, preços de venda, custo e a grade de tamanhos e cores com seus respectivos estoques.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1.5 text-gray-400 hover:text-white bg-black/50 hover:bg-neutral-800 rounded-lg text-xs"
              >
                <X size={16} />
              </button>
            </div>

            {modalErrorMsg && (
              <div className="bg-red-950/90 border border-red-500/50 p-3 rounded-xl text-red-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{modalErrorMsg}</span>
                </div>
                {(modalErrorMsg.toLowerCase().includes('token') || modalErrorMsg.toLowerCase().includes('sessão') || modalErrorMsg.toLowerCase().includes('login')) && (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      window.location.reload();
                    }}
                    className="bg-red-900/80 hover:bg-red-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                  >
                    Fazer Login Novamente
                  </button>
                )}
              </div>
            )}

            {/* SEÇÃO 1: DADOS PRINCIPAIS */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Legging Suplex Power Alta Compressão"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">SKU Principal (Código Único / Barra) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                    placeholder="Ex: LEG-SUPL-01"
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none disabled:opacity-50 font-mono font-bold"
                  />
                  {editingProduct && (
                    <span className="text-[10px] text-gray-500 mt-0.5 block">O SKU principal não pode ser alterado após criação.</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Categoria *</label>
                  <select
                    required
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-[#942620]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Preço Promocional (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={productForm.promoPrice}
                    onChange={(e) => setProductForm({ ...productForm, promoPrice: e.target.value })}
                    placeholder="Opcional"
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Custo da Peça (R$)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: UPLOAD DIRETO DE FOTO DO PRODUTO */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#dfa666] flex items-center gap-1.5">
                <ImageIcon size={14} /> Foto do Produto (Upload Direto)
              </label>

              <input
                type="file"
                id="product-photo-upload"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />

              {productForm.image ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-neutral-900 border border-white/10 rounded-xl p-3">
                  <div className="w-20 h-20 bg-black rounded-lg border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={productForm.image}
                      alt="Preview do Produto"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      <Check size={12} /> Foto Selecionada
                    </span>
                    <p className="text-[11px] text-gray-400 truncate">
                      {editingProduct && !productForm.image.startsWith('data:')
                        ? 'Imagem atual mantida. Você pode substituí-la fazendo novo upload.'
                        : 'Nova imagem pronta para ser gravada ao salvar.'}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                      <label
                        htmlFor="product-photo-upload"
                        className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Upload size={12} /> Trocar Foto
                      </label>
                      <button
                        type="button"
                        onClick={() => setProductForm(p => ({ ...p, image: '' }))}
                        className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Trash2 size={12} /> Remover
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="product-photo-upload"
                  className="cursor-pointer border-2 border-dashed border-white/20 hover:border-[#942620] bg-neutral-900/50 hover:bg-neutral-900 rounded-xl p-5 flex flex-col items-center justify-center gap-2 transition-all text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-[#dfa666]">
                    <Upload size={20} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Clique aqui para selecionar uma foto do seu dispositivo
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      Formatos aceitos: JPG, PNG, WEBP (tamanho máximo 15MB)
                    </span>
                  </div>
                </label>
              )}
            </div>

            {/* SEÇÃO 3: GRADE DE VARIAÇÕES (CORES, TAMANHOS & UNIDADES DE ESTOQUE) */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#dfa666] flex items-center gap-1.5">
                    <Layers size={14} /> Grade de Variações (Cores, Tamanhos & Estoque)
                  </label>
                  <p className="text-[11px] text-gray-400">
                    Defina as variações de tamanho e cor com suas respectivas quantidades de estoque.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddVariant('M', '')}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus size={13} /> + 1 Variação
                  </button>
                </div>
              </div>

              {/* Botões de Adição Rápida de Grade */}
              <div className="flex flex-wrap items-center gap-1.5 bg-neutral-900/80 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold uppercase text-gray-400 mr-1 flex items-center gap-1">
                  <Sparkles size={11} className="text-[#dfa666]" /> Inserir Grade Rápida:
                </span>
                {[
                  { label: 'P', size: 'P' },
                  { label: 'M', size: 'M' },
                  { label: 'G', size: 'G' },
                  { label: 'GG', size: 'GG' },
                  { label: 'Único', size: 'ÚNICO' }
                ].map(b => (
                  <button
                    key={b.size}
                    type="button"
                    onClick={() => handleAddVariant(b.size, '')}
                    className="bg-black hover:bg-neutral-800 border border-white/10 text-[10px] font-bold text-gray-300 hover:text-white px-2 py-1 rounded transition-colors"
                  >
                    + {b.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickAddGrid(['P', 'M', 'G', 'GG'])}
                  className="bg-[#942620]/80 hover:bg-[#942620] text-white text-[10px] font-bold px-2.5 py-1 rounded transition-colors"
                >
                  + Grade Completa (P, M, G, GG)
                </button>
              </div>

              {/* Tabela de Variações Cadastradas */}
              {productForm.variants && productForm.variants.length > 0 ? (
                <div className="space-y-2">
                  <div className="overflow-x-auto max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="bg-neutral-950 text-gray-400 font-bold uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2">Cor / Estampa</th>
                          <th className="p-2 w-28">Tamanho *</th>
                          <th className="p-2 w-28 text-center">Qtd Estoque *</th>
                          <th className="p-2 w-12 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {productForm.variants.map((v, idx) => (
                          <tr key={idx} className="hover:bg-neutral-900/60">
                            <td className="p-2">
                              <div className="flex items-center gap-1.5">
                                {v.color && productForm.colorImages && productForm.colorImages[v.color.trim()] && (
                                  <div className="w-7 h-7 rounded-md overflow-hidden bg-black border border-white/20 shrink-0 shadow-sm" title={`Foto cadastrada para ${v.color}`}>
                                    <img
                                      src={productForm.colorImages[v.color.trim()]}
                                      alt={v.color}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <input
                                  type="text"
                                  value={v.color || ''}
                                  onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                                  placeholder="Ex: Preto, Bordô, Terra..."
                                  className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#942620]"
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                required
                                value={v.size || ''}
                                onChange={(e) => handleUpdateVariant(idx, 'size', e.target.value.toUpperCase())}
                                placeholder="P, M, G..."
                                className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs font-bold text-center focus:outline-none focus:border-[#942620]"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0"
                                required
                                value={v.stockQty ?? '0'}
                                onChange={(e) => handleUpdateVariant(idx, 'stockQty', e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-emerald-400 font-black text-xs text-center focus:outline-none focus:border-[#942620]"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(idx)}
                                title="Remover Variação"
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumo Totalizador da Grade */}
                  <div className="bg-neutral-900 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-bold">
                      {productForm.variants.length} {productForm.variants.length === 1 ? 'variação configurada' : 'variações configuradas'}
                    </span>
                    <span className="font-bold text-white">
                      Estoque Total na Grade:{' '}
                      <strong className="text-emerald-400 text-sm font-black">
                        {productForm.variants.reduce((acc, v) => acc + (parseInt(v.stockQty || 0) || 0), 0)} peças
                      </strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900/50 border border-dashed border-white/10 rounded-xl p-3.5 space-y-2 text-center">
                  <p className="text-xs text-gray-400">
                    Nenhuma variação adicionada. Este produto será tratado como <strong>peça única sem grade</strong>.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1">
                      Quantidade em Estoque Inicial (Peça Única):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stockQty}
                      onChange={(e) => setProductForm({ ...productForm, stockQty: e.target.value })}
                      className="max-w-[160px] mx-auto bg-black border border-white/15 rounded-xl px-3 py-1.5 text-white font-black text-center text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO 3.1: FOTOS POR VARIAÇÃO DE COR */}
            {(() => {
              const detectedColors = Array.from(new Set([
                ...Object.keys(productForm.colorImages || {}),
                ...(productForm.variants || []).map(v => (v.color || '').trim()).filter(Boolean)
              ]));

              return (
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#dfa666] flex items-center gap-1.5">
                        <Camera size={14} /> Fotos das Variações de Cor
                      </label>
                      <p className="text-[11px] text-gray-400">
                        Cadastre a foto específica de cada cor. Na loja, ao clicar na cor, o cliente verá a foto correspondente instantaneamente!
                      </p>
                    </div>
                  </div>

                  {/* Campo para adicionar nova cor manualmente */}
                  <div className="flex items-center gap-2 bg-neutral-900/80 p-2.5 rounded-xl border border-white/5">
                    <Palette size={14} className="text-[#dfa666] shrink-0" />
                    <input
                      type="text"
                      value={newColorInput}
                      onChange={(e) => setNewColorInput(e.target.value)}
                      placeholder="Adicionar foto para outra cor (ex: Rosa Pink, Azul Royal, Cinza Mescla)..."
                      className="bg-black border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs flex-1 focus:outline-none focus:border-[#dfa666]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomColor(newColorInput);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomColor(newColorInput)}
                      disabled={!newColorInput.trim()}
                      className="bg-[#dfa666] hover:bg-[#c99557] disabled:opacity-40 text-black font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Adicionar Cor
                    </button>
                  </div>

                  {detectedColors.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {detectedColors.map((colName, cIdx) => {
                        const imgUrl = (productForm.colorImages || {})[colName];
                        const inputId = `color-img-file-${cIdx}`;

                        return (
                          <div
                            key={colName}
                            className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                              imgUrl
                                ? 'bg-neutral-900/90 border-emerald-500/40 shadow-sm'
                                : 'bg-neutral-900/40 border-white/10'
                            }`}
                          >
                            {/* Preview ou Dropzone */}
                            <div className="w-16 h-16 rounded-xl bg-black border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative group">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={colName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-gray-500 flex flex-col items-center justify-center text-[10px]">
                                  <Camera size={18} className="opacity-50" />
                                  <span className="text-[9px] mt-0.5">Sem foto</span>
                                </div>
                              )}
                            </div>

                            {/* Detalhes da Cor e Ações */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-black text-white uppercase truncate flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#dfa666] inline-block shrink-0" />
                                  {colName}
                                </span>
                                {imgUrl && (
                                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800 shrink-0">
                                    ✓ Foto Vinculada
                                  </span>
                                )}
                              </div>

                              <input
                                type="file"
                                id={inputId}
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={(e) => handleColorImageUpload(colName, e.target.files?.[0])}
                                className="hidden"
                              />

                              <div className="flex items-center gap-1.5 pt-1">
                                <label
                                  htmlFor={inputId}
                                  className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                >
                                  <Upload size={11} /> {imgUrl ? 'Trocar Foto' : 'Upload Foto'}
                                </label>

                                {imgUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColorImage(colName)}
                                    className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] font-bold px-1.5 py-1 rounded flex items-center gap-0.5 transition-colors"
                                    title="Remover foto desta cor"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-neutral-900/30 rounded-xl border border-dashed border-white/10 text-xs text-gray-400">
                      Nenhuma cor informada na grade de variações acima. Digite as cores na grade ou use o campo acima para vincular fotos de cores.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SEÇÃO 4: DESCRIÇÃO COMERCIAL */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Descrição Comercial & Detalhes do Tecido</label>
              <textarea
                rows={2}
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Detalhes de tecido, acabamento, compressão, modelagem..."
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingProduct}
                className="flex-1 py-2.5 bg-[#942620] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-colors flex items-center justify-center gap-1.5"
              >
                {isSavingProduct ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    {editingProduct ? 'Salvar Alterações' : 'Salvar no Estoque'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL: IMPORTAÇÃO INTELIGENTE DE PLANILHA (.XLSX / .CSV)
      ======================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl space-y-4">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-400" size={22} />
                  Importador de Planilha de Estoque (.xlsx)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Envie a planilha do seu fornecedor ou loja para cadastrar modelos, cores, tamanhos e quantidades automaticamente.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedProducts([]);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {parsedProducts.length === 0 ? (
                /* ÁREA DE DROPZONE / UPLOAD */
                <div className="space-y-4">
                  <label
                    htmlFor="spreadsheet-file-upload"
                    className="cursor-pointer border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/30 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center gap-3 transition-all text-center group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Upload size={30} />
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-black text-white block">
                        Clique aqui ou arraste sua planilha de estoque
                      </span>
                      <span className="text-xs text-emerald-300 font-bold mt-1 block">
                        Formatos suportados: .XLSX, .XLS ou .CSV
                      </span>
                      <span className="text-[11px] text-gray-400 mt-2 block">
                        Exemplo compatível: Planilha_Estoque.xlsx (com colunas Compra, Produto, Cor, Tamanho, Qtd, Custo)
                      </span>
                    </div>
                    <input
                      id="spreadsheet-file-upload"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleSpreadsheetFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Card Informativo das Colunas */}
                  <div className="bg-black/60 border border-white/10 rounded-xl p-4 text-xs text-gray-300 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#dfa666]">
                      <Sparkles size={16} />
                      <span>Como o robô inteligente lê sua planilha:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-400">
                      <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-white/5">
                        <strong className="text-white block mb-0.5">1. Agrupamento Automático</strong>
                        Linhas com o mesmo nome de produto são agrupadas num único item com múltiplas variações de cor e tamanho.
                      </div>
                      <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-white/5">
                        <strong className="text-white block mb-0.5">2. Cálculo de Margem</strong>
                        Se a planilha não tiver preço de venda, aplicamos automaticamente a margem sugerida (ex: 2.2x o custo).
                      </div>
                      <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-white/5">
                        <strong className="text-white block mb-0.5">3. SKUs Únicos</strong>
                        Geramos códigos SKU organizados para cada variação e controlamos o saldo inicial de estoque.
                      </div>
                      <div className="bg-neutral-900/80 p-2.5 rounded-lg border border-white/5">
                        <strong className="text-white block mb-0.5">4. Edição Posterior Livre</strong>
                        Após o lançamento, você pode adicionar fotos, alterar textos ou ajustar preços a qualquer momento.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* PRÉ-VISUALIZAÇÃO DOS PRODUTOS RECONHECIDOS */
                <div className="space-y-4">
                  {/* Barra de Resumo das Peças */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Modelos Únicos</span>
                      <strong className="text-lg font-black text-white">{parsedProducts.length}</strong>
                    </div>
                    <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Total de Peças</span>
                      <strong className="text-lg font-black text-emerald-400">
                        {parsedProducts.reduce((acc, p) => acc + (p.totalQty || 0), 0)} un
                      </strong>
                    </div>
                    <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Custo Total Estoque</span>
                      <strong className="text-lg font-black text-white">
                        R$ {parsedProducts.reduce((acc, p) => acc + (p.costPrice * (p.totalQty || 0)), 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-300 block">Previsão de Faturamento</span>
                      <strong className="text-lg font-black text-emerald-300">
                        R$ {parsedProducts.reduce((acc, p) => acc + (p.price * (p.totalQty || 0)), 0).toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Configurações Globais de Importação */}
                  <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-[#dfa666]" /> Multiplicador de Preço de Venda (Markup)
                      </label>
                      <p className="text-[11px] text-gray-400">
                        Ajuste rápido para calcular o preço de venda com base no custo:
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '1.8x', val: 1.8 },
                        { label: '2.0x (100%)', val: 2.0 },
                        { label: '2.2x (Sugerido)', val: 2.2 },
                        { label: '2.5x', val: 2.5 },
                        { label: '3.0x', val: 3.0 }
                      ].map(m => (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => handleUpdateMarginMultiplier(m.val)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            defaultMarginMultiplier === m.val
                              ? 'bg-[#dfa666] text-black shadow font-black'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-gray-300'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categoria Padrão dos Itens Importados */}
                  <div className="flex items-center gap-2 bg-neutral-900/60 p-2.5 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-gray-300 shrink-0">Categoria padrão para os itens:</span>
                    <input
                      type="text"
                      value={defaultImportCategory}
                      onChange={(e) => {
                        setDefaultImportCategory(e.target.value);
                        setParsedProducts(prev => prev.map(p => ({ ...p, categoryName: e.target.value })));
                      }}
                      placeholder="Ex: Fitness, Casual, Moda Praia..."
                      className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#942620] flex-1 max-w-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setParsedProducts([]);
                        setDefaultMarginMultiplier(2.2);
                      }}
                      className="text-xs font-bold text-gray-400 hover:text-red-400 ml-auto transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Trocar Planilha
                    </button>
                  </div>

                  {/* Tabela dos Itens Prontos para Cadastrar */}
                  <div className="bg-black border border-white/10 rounded-xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[700px]">
                        <thead className="bg-neutral-950 text-gray-400 uppercase font-bold text-[10px] sticky top-0 border-b border-white/10">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Nome do Modelo & Marca</th>
                            <th className="p-3">Grade de Variações Reconhecidas</th>
                            <th className="p-3 text-right">Custo Un.</th>
                            <th className="p-3 text-right">Preço Venda</th>
                            <th className="p-3 text-center">Total Peças</th>
                            <th className="p-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsedProducts.map((p, idx) => (
                            <tr key={idx} className="hover:bg-neutral-900/50 transition-colors">
                              <td className="p-3 text-gray-500 font-mono">{idx + 1}</td>
                              <td className="p-3 max-w-[220px]">
                                <div className="font-bold text-white truncate" title={p.name}>{p.name}</div>
                                <span className="text-[10px] text-[#dfa666] font-mono">{p.brand}</span>
                              </td>
                              <td className="p-3 max-w-[280px]">
                                <div className="flex flex-wrap gap-1">
                                  {p.variants.map((v, vIdx) => (
                                    <span
                                      key={vIdx}
                                      className="bg-neutral-800 border border-white/10 text-[10px] px-1.5 py-0.5 rounded text-gray-300 font-mono"
                                    >
                                      {v.color ? <span className="text-[#dfa666] mr-1">{v.color}</span> : null}
                                      <strong className="text-white">{v.size}</strong>
                                      <span className="text-emerald-400 font-bold ml-1">({v.stockQty})</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-right text-gray-300 font-mono">
                                R$ {p.costPrice.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-mono">
                                <div className="inline-flex items-center gap-1">
                                  <span className="text-gray-400 text-[10px]">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={p.price}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setParsedProducts(prev => prev.map((item, i) => i === idx ? { ...item, price: val } : item));
                                    }}
                                    className="w-20 bg-neutral-900 border border-white/15 rounded px-1.5 py-0.5 text-right text-emerald-400 font-bold text-xs focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full text-xs">
                                  {p.totalQty} un
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setParsedProducts(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  title="Remover produto da lista de importação"
                                  className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-neutral-800 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedProducts([]);
                }}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>

              {parsedProducts.length > 0 && (
                <button
                  type="button"
                  disabled={importingBatch}
                  onClick={handleExecuteBatchImport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
                >
                  {importingBatch ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Lançando no Estoque...
                    </>
                  ) : (
                    <>
                      <CheckCheck size={16} /> Lançar Todos os {parsedProducts.length} Produtos no Estoque
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CADASTRO / EDIÇÃO DE FUNCIONÁRIO
      ======================================================== */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <form onSubmit={handleSaveUser} className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-3.5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm sm:text-base font-black uppercase text-white">
              {editingUser ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Ex: Amanda Silva"
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">E-mail de Login *</label>
              <input
                type="email"
                required
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="amanda@empresa.com"
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">
                {editingUser ? 'Nova Senha (opcional)' : 'Senha de Acesso *'}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder={editingUser ? '••••••' : 'Defina a senha inicial'}
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Cargo / Função *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    const defaultPct = newRole === 'VENDEDOR' ? '5.0' : newRole === 'GERENTE' ? '20.0' : newRole === 'PROPRIETARIA' ? '100.0' : '0.0';
                    const defaultComm = newRole === 'VENDEDOR' ? '3.0' : newRole === 'GERENTE' ? '1.5' : '0.0';
                    setUserForm({ ...userForm, role: newRole, discountLimitPct: defaultPct, commissionPct: defaultComm });
                  }}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="OPERADOR_CAIXA">Operador de Caixa</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="PROPRIETARIA">Proprietária</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Comissão (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={userForm.commissionPct}
                  onChange={(e) => setUserForm({ ...userForm, commissionPct: e.target.value })}
                  placeholder="Ex: 3.0"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Desc. Max (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={userForm.discountLimitPct}
                  onChange={(e) => setUserForm({ ...userForm, discountLimitPct: e.target.value })}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#942620] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow"
              >
                {editingUser ? 'Salvar Alterações' : 'Criar Funcionário'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL: RELATÓRIO INDIVIDUAL DE VENDAS DO FUNCIONÁRIO
      ======================================================== */}
      {selectedUserReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-black uppercase text-white">
                  Desempenho Individual de Vendas
                </h3>
                <p className="text-xs text-[#dfa666] font-bold mt-0.5 truncate">
                  {selectedUserReport.employee?.name} • <span className="uppercase">{selectedUserReport.employee?.role}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedUserReport(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Cards de Métricas do Funcionário */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
              <div className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs">
                <span className="text-gray-400 block font-bold">Vendas</span>
                <strong className="text-base sm:text-lg font-black text-white">{selectedUserReport.metrics?.totalSalesCount}</strong>
              </div>
              <div className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs">
                <span className="text-gray-400 block font-bold">Faturamento</span>
                <strong className="text-base sm:text-lg font-black text-emerald-400">R$ {selectedUserReport.metrics?.totalRevenue?.toFixed(2)}</strong>
              </div>
              <div className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs">
                <span className="text-gray-400 block font-bold">Taxa Comissão</span>
                <strong className="text-base sm:text-lg font-black text-[#dfa666]">{selectedUserReport.metrics?.commissionPct ?? 0}%</strong>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs">
                <span className="text-emerald-400 block font-bold">Total Comissão</span>
                <strong className="text-base sm:text-lg font-black text-emerald-300">R$ {(selectedUserReport.metrics?.totalCommission ?? 0).toFixed(2)}</strong>
              </div>
              <div className="bg-black/60 border border-white/5 rounded-xl p-3 text-xs col-span-2 sm:col-span-1">
                <span className="text-gray-400 block font-bold">Ticket Médio</span>
                <strong className="text-base sm:text-lg font-black text-white">R$ {selectedUserReport.metrics?.avgTicket?.toFixed(2)}</strong>
              </div>
            </div>

            {/* Tabela de Vendas do Funcionário */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-white">Histórico de Vendas Concluídas pelo Operador</h4>
              <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto w-full">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-black text-gray-400 text-[10px] uppercase font-bold border-b border-white/10">
                      <tr>
                        <th className="p-2.5">Código</th>
                        <th className="p-2.5">Data/Hora</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5 text-right">Valor Total</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedUserReport.sales?.map((s) => (
                        <tr key={s.id} className="hover:bg-neutral-800/30">
                          <td className="p-2 font-bold text-[#dfa666]">{s.code}</td>
                          <td className="p-2 text-gray-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleString('pt-BR')}</td>
                          <td className="p-2 text-white">{s.customer?.name || 'Cliente Balcão'}</td>
                          <td className="p-2 text-right font-bold text-white whitespace-nowrap">R$ {s.total.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              s.status === 'CONCLUIDA' ? 'text-emerald-400 bg-emerald-950' : 'text-red-400 bg-red-950'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedUserReport(null)}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CLIENTE */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <form onSubmit={handleSaveCustomer} className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm sm:text-base font-black uppercase text-white">
              {editingCustomer ? 'Editar Cliente & Crediário' : 'Novo Cadastro de Cliente'}
            </h3>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                placeholder="Ex: Carlos Eduardo Silva"
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
                  placeholder="(66) 99999-0000"
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Endereço Residencial</label>
              <input
                type="text"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                placeholder="Rua, Número, Bairro, Cidade"
                className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Limite Máximo de Crediário Próprio (R$)</label>
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

      {/* MODAL DE AJUSTE MANUAL DE ESTOQUE */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm sm:text-base font-black uppercase text-white">Ajuste Manual de Estoque (Auditoria)</h3>
            
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full bg-black border border-white/15 text-white text-xs p-3 rounded-xl focus:outline-none"
            >
              <option value="">Selecione o produto...</option>
              {inventoryBalances.map((b) => (
                <option key={b.product.id} value={b.product.id}>
                  {b.product.name} (Atual: {b.physicalQty} un)
                </option>
              ))}
            </select>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setAdjustIsPositive(true)}
                className={`flex-1 py-2 font-bold text-xs rounded-xl transition-all ${adjustIsPositive ? 'bg-emerald-600 text-white' : 'bg-black text-gray-400'}`}
              >
                + Entrada (Acrescentar)
              </button>
              <button
                onClick={() => setAdjustIsPositive(false)}
                className={`flex-1 py-2 font-bold text-xs rounded-xl transition-all ${!adjustIsPositive ? 'bg-red-600 text-white' : 'bg-black text-gray-400'}`}
              >
                - Baixa (Subtrair/Perda)
              </button>
            </div>

            <input
              type="number"
              placeholder="Quantidade de peças"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full bg-black border border-white/15 text-white text-xs p-3 rounded-xl focus:outline-none"
            />

            <textarea
              placeholder="Motivo obrigatório (ex: Contagem física anual, defeito de fabricação)..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full bg-black border border-white/15 text-white text-xs p-3 rounded-xl focus:outline-none"
            />

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowAdjustModal(false)} className="flex-1 py-2.5 bg-neutral-800 text-xs font-bold rounded-xl text-white">
                Cancelar
              </button>
              <button onClick={handleStockAdjust} className="flex-1 py-2.5 bg-[#942620] hover:bg-red-700 font-bold text-xs rounded-xl text-white shadow">
                Gravar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: INFORMAR VENDA REALIZADA COM CUPOM
      ======================================================== */}
      {showRecordSaleModal && selectedCouponForSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <form
            onSubmit={handleRecordSale}
            className="bg-neutral-900 border border-white/20 rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-white flex items-center gap-2">
                  <Tag size={16} className="text-[#942620]" />
                  Informar Venda Realizada
                </h3>
                <p className="text-[11px] text-gray-400">
                  Cupom: <strong className="text-white font-mono">{selectedCouponForSale.code}</strong> ({selectedCouponForSale.discountPercent}% OFF)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordSaleModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Código da Venda / Comanda (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: VND-104, Comanda 12, Pedido WhatsApp..."
                  value={saleRecordForm.saleCode}
                  onChange={(e) => setSaleRecordForm({ ...saleRecordForm, saleCode: e.target.value })}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Nome do Cliente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nome do cliente que utilizou o cupom"
                  value={saleRecordForm.customerName}
                  onChange={(e) => setSaleRecordForm({ ...saleRecordForm, customerName: e.target.value })}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Valor da Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={saleRecordForm.amount}
                    onChange={(e) => setSaleRecordForm({ ...saleRecordForm, amount: e.target.value })}
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Desconto Aplicado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={saleRecordForm.discountValue}
                    onChange={(e) => setSaleRecordForm({ ...saleRecordForm, discountValue: e.target.value })}
                    className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-emerald-400 font-bold text-xs focus:outline-none focus:border-[#942620]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações sobre a venda ou itens comprados..."
                  value={saleRecordForm.notes}
                  onChange={(e) => setSaleRecordForm({ ...saleRecordForm, notes: e.target.value })}
                  className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#942620]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRecordSaleModal(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={recordingSale}
                className="flex-1 py-2.5 bg-[#942620] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow flex items-center justify-center gap-1 cursor-pointer"
              >
                {recordingSale ? 'Gravando...' : 'Salvar Venda Realizada'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL: HISTÓRICO DE VENDAS REALIZADAS DO CUPOM
      ======================================================== */}
      {showHistoryModal && selectedCouponForHistory && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-white/20 rounded-2xl p-5 sm:p-6 max-w-2xl w-full space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#dfa666]" />
                  Histórico de Vendas com o Cupom {selectedCouponForHistory.code}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Total de {selectedCouponForHistory.salesCount || 0} vendas realizadas informadas para este cupom ({selectedCouponForHistory.discountPercent}% OFF).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {(!selectedCouponForHistory.sales || selectedCouponForHistory.sales.length === 0) ? (
              <div className="py-10 text-center space-y-2">
                <Tag size={32} className="text-gray-600 mx-auto" />
                <p className="text-xs text-gray-300 font-bold">Nenhum detalhe de venda registrado ainda.</p>
                <p className="text-[11px] text-gray-500">
                  Clique em "+ Informar" ou "+ 1 Venda" no card do cupom para registrar as compras realizadas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-black text-gray-400 uppercase font-bold border-b border-white/10">
                    <tr>
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Código / Comanda</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Valor Venda</th>
                      <th className="p-2.5">Informado por</th>
                      <th className="p-2.5">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedCouponForHistory.sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-neutral-800/40">
                        <td className="p-2.5 text-gray-400 whitespace-nowrap">
                          {new Date(sale.date).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2.5 font-bold text-white whitespace-nowrap">
                          {sale.saleCode}
                        </td>
                        <td className="p-2.5 text-gray-300">
                          {sale.customerName}
                        </td>
                        <td className="p-2.5 font-black text-emerald-400">
                          {sale.amount > 0 ? `R$ ${sale.amount.toFixed(2)}` : '-'}
                        </td>
                        <td className="p-2.5 text-gray-400">
                          {sale.reportedBy}
                        </td>
                        <td className="p-2.5 text-gray-400 max-w-[150px] truncate">
                          {sale.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="py-2 px-5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold cursor-pointer"
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
