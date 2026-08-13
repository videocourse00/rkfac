import React, { useState } from 'react';
import { db } from '../../db/dexie';
import { BentoCard } from '../bento/BentoCard';
import { translations } from '../../core/i18n/translations';
import { Category, CategoryType, Language } from '../../types';
import { CATEGORY_ICON_LIST, CategoryIcon } from '../../lib/categoryIcons';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Power,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  X,
  ChevronRight,
  AlertCircle,
  Tag,
} from 'lucide-react';

interface CategoriesViewProps {
  categories: Category[];
  familyId: string;
  lang: Language;
  onRefresh: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  familyId,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];

  // Selected Category Type Tab: INCOME, EXPENSE, ASSET, LIABILITY
  const [activeTypeTab, setActiveTypeTab] = useState<CategoryType>('EXPENSE');

  // Form State
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [icon, setIcon] = useState('Wallet');
  const [isActive, setIsActive] = useState(true);

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Icon Selector Modal State in Form
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Safety Warning Modal
  const [safetyNotice, setSafetyNotice] = useState<{
    category: Category;
    txCount: number;
  } | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;

    const now = new Date().toISOString();
    await db.categories.put({
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      family_id: familyId,
      type: activeTypeTab,
      name_en: nameEn.trim(),
      name_bn: nameBn.trim() || nameEn.trim(),
      code: code.trim() || undefined,
      parent_id: parentId || undefined,
      icon: icon || 'Tag',
      is_active: isActive,
      created_at: now,
      updated_at: now,
    });

    // Reset Form
    setNameEn('');
    setNameBn('');
    setCode('');
    setParentId('');
    setIcon('Wallet');
    setIsActive(true);
    onRefresh();
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name_en.trim()) return;

    await db.categories.put({
      ...editingCategory,
      updated_at: new Date().toISOString(),
    });

    setEditingCategory(null);
    onRefresh();
  };

  const handleToggleActivate = async (cat: Category) => {
    await db.categories.put({
      ...cat,
      is_active: !cat.is_active,
      updated_at: new Date().toISOString(),
    });
    onRefresh();
  };

  const handleSafeRemoveCategory = async (cat: Category) => {
    // Check if category is referenced in transactions or rules
    const txCount = await db.transactions.where('category_id').equals(cat.id).count();
    const childCats = await db.categories.where('parent_id').equals(cat.id).count();

    if (txCount > 0 || childCats > 0) {
      setSafetyNotice({ category: cat, txCount });
    } else {
      if (confirm(`Are you sure you want to delete category "${cat.name_en}"?`)) {
        await db.categories.delete(cat.id);
        onRefresh();
      }
    }
  };

  const handleDeactivateCategory = async () => {
    if (!safetyNotice) return;
    await db.categories.put({
      ...safetyNotice.category,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    setSafetyNotice(null);
    onRefresh();
  };

  // Filter categories by type tab
  const currentCategories = categories.filter((c) => c.type === activeTypeTab);
  const parentCategories = currentCategories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-6">
      {/* Category Type Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            { id: 'INCOME', label: 'Income Categories', icon: TrendingUp, color: 'emerald' },
            { id: 'EXPENSE', label: 'Expense Categories', icon: TrendingDown, color: 'rose' },
            { id: 'ASSET', label: 'Asset Categories', icon: ShieldCheck, color: 'indigo' },
            { id: 'LIABILITY', label: 'Liability Categories', icon: CreditCard, color: 'amber' },
          ] as const
        ).map((tab) => {
          const count = categories.filter((c) => c.type === tab.id).length;
          const isActiveTab = activeTypeTab === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTypeTab(tab.id);
                setParentId('');
              }}
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                isActiveTab
                  ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    tab.id === 'INCOME'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'
                      : tab.id === 'EXPENSE'
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60'
                      : tab.id === 'ASSET'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block font-bold text-xs text-slate-800 dark:text-slate-100">
                    {tab.id}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{count} Items</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Creation Form (Span 4) */}
        <div className="lg:col-span-4">
          <BentoCard
            eyebrow={`${activeTypeTab} CATEGORY SETUP`}
            title={`Add ${activeTypeTab} Category`}
            icon={<FolderTree className="w-4 h-4 text-indigo-500" />}
          >
            <form onSubmit={handleAddCategory} className="space-y-3.5 mt-2">
              {/* Category Icon & Picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Category Icon
                </label>
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                    <CategoryIcon name={icon} className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="flex-1 py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex justify-between items-center"
                  >
                    <span>Icon: {icon}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>

                {/* Inline Icon Selector Grid */}
                {showIconPicker && (
                  <div className="mt-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl grid grid-cols-7 gap-1 max-h-40 overflow-y-auto">
                    {CATEGORY_ICON_LIST.map((item) => {
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setIcon(item.id);
                            setShowIconPicker(false);
                          }}
                          title={item.name}
                          className={`p-2 rounded-lg flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950/60 ${
                            icon === item.id
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  English Category Name
                </label>
                <input
                  type="text"
                  required
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Tuition Fee / House Rent"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Bangla Name (বাংলা নাম)
                </label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="e.g. টিউশন ফি / বাসা ভাড়া"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Subcategory Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Parent Category (Optional Subcategory)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="">None (Top-Level Parent Category)</option>
                  {parentCategories.map((p) => (
                    <option key={p.id} value={p.id}>
                      Parent: {p.name_en} ({p.name_bn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. INC-01"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Initial Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`w-full py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Category</span>
              </button>
            </form>
          </BentoCard>
        </div>

        {/* Category Hierarchical List (Span 8) */}
        <div className="lg:col-span-8">
          <BentoCard
            eyebrow={`${activeTypeTab} CHART OF ACCOUNTS`}
            title={`Configured ${activeTypeTab} Categories & Subcategories`}
            badgeText={`${currentCategories.length} TOTAL`}
            badgeType="indigo"
          >
            {currentCategories.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No {activeTypeTab.toLowerCase()} categories added yet. Create one on the left panel!
              </div>
            ) : (
              <div className="space-y-3 mt-2">
                {parentCategories.map((parent) => {
                  const children = currentCategories.filter((c) => c.parent_id === parent.id);

                  return (
                    <div
                      key={parent.id}
                      className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-800/80 shadow-2xs"
                    >
                      {/* Parent Item Header */}
                      <div className="p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <CategoryIcon name={parent.icon} className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                {parent.name_en}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">
                                ({parent.name_bn})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  parent.is_active
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {parent.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                            {parent.code && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                Code: {parent.code}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActivate(parent)}
                            title={parent.is_active ? 'Deactivate Category' : 'Activate Category'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                              parent.is_active
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCategory({ ...parent })}
                            title="Edit / Rename Category"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSafeRemoveCategory(parent)}
                            title="Remove Category"
                            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subcategories Tree Indentation */}
                      {children.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/40 p-2 space-y-1.5 pl-6">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Subcategories ({children.length})
                          </span>
                          {children.map((child) => (
                            <div
                              key={child.id}
                              className="p-2.5 bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
                                  <CategoryIcon name={child.icon} className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                      {child.name_en}
                                    </span>
                                    <span className="text-xs text-slate-400">({child.name_bn})</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                                        child.is_active
                                          ? 'bg-emerald-50 text-emerald-600'
                                          : 'bg-slate-200 text-slate-500'
                                      }`}
                                    >
                                      {child.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleActivate(child)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingCategory({ ...child })}
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleSafeRemoveCategory(child)}
                                  className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </BentoCard>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" />
                Edit / Rename Category
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Category Icon
                </label>
                <div className="grid grid-cols-8 gap-1 p-2 bg-slate-50 dark:bg-slate-800 border rounded-2xl max-h-32 overflow-y-auto">
                  {CATEGORY_ICON_LIST.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setEditingCategory({ ...editingCategory, icon: item.id })
                        }
                        className={`p-2 rounded-lg flex items-center justify-center ${
                          editingCategory.icon === item.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  English Name
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name_en}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name_en: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Bangla Name (বাংলা নাম)
                </label>
                <input
                  type="text"
                  value={editingCategory.name_bn}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, name_bn: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Parent Category (Optional Subcategory)
                </label>
                <select
                  value={editingCategory.parent_id || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      parent_id: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="">None (Top-Level Parent Category)</option>
                  {categories
                    .filter(
                      (c) =>
                        c.type === editingCategory.type &&
                        c.id !== editingCategory.id &&
                        !c.parent_id
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Parent: {p.name_en} ({p.name_bn})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category Status
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCategory({
                      ...editingCategory,
                      is_active: !editingCategory.is_active,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    editingCategory.is_active
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-300'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{editingCategory.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Protection Warning Modal */}
      {safetyNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold">Historical Transaction Protection</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Category <strong>"{safetyNotice.category.name_en}"</strong> is referenced by{' '}
              <span className="font-mono font-bold text-indigo-600">
                {safetyNotice.txCount} historical transactions or subcategories
              </span>
              .
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              To keep historical statements, double-entry vouchers, and audit logs accurate, this
              category cannot be hard-deleted. You can <strong>Deactivate</strong> it instead, which
              prevents new transactions from using it while keeping historical records intact.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSafetyNotice(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivateCategory}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Deactivate Category</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
