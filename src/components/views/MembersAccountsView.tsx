import React, { useState } from 'react';
import { db } from '../../db/dexie';
import { BentoCard } from '../bento/BentoCard';
import { translations, formatCurrency } from '../../core/i18n/translations';
import { takaToPaisa } from '../../core/accounting/engine';
import { FamilyMember, Account, AccountType, Language } from '../../types';
import {
  Users,
  Building2,
  Plus,
  Trash2,
  Edit2,
  Power,
  Camera,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  X,
  Upload,
} from 'lucide-react';

interface MembersAccountsViewProps {
  members: FamilyMember[];
  accounts: Account[];
  familyId: string;
  currencySymbol: string;
  lang: Language;
  onRefresh: () => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
];

export const MembersAccountsView: React.FC<MembersAccountsViewProps> = ({
  members,
  accounts,
  familyId,
  currencySymbol,
  lang,
  onRefresh,
}) => {
  const t = translations[lang];

  // Add Member Form State
  const [memberName, setMemberName] = useState('');
  const [relation, setRelation] = useState('Self');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photoUri, setPhotoUri] = useState('');

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Safety Modal State
  const [safetyNotice, setSafetyNotice] = useState<{
    member: FamilyMember;
    linkedCount: number;
  } | null>(null);

  // Account Form State
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [ownerMemberId, setOwnerMemberId] = useState('');
  const [openingTaka, setOpeningTaka] = useState('');

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (uri: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    const now = new Date().toISOString();
    await db.familyMembers.put({
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      family_id: familyId,
      name: memberName.trim(),
      relation,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      photo_uri: photoUri || undefined,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    setMemberName('');
    setPhone('');
    setEmail('');
    setPhotoUri('');
    onRefresh();
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name.trim()) return;

    await db.familyMembers.put({
      ...editingMember,
      updated_at: new Date().toISOString(),
    });

    setEditingMember(null);
    onRefresh();
  };

  const handleToggleActivate = async (member: FamilyMember) => {
    await db.familyMembers.put({
      ...member,
      is_active: !member.is_active,
      updated_at: new Date().toISOString(),
    });
    onRefresh();
  };

  const handleSafeRemoveMember = async (member: FamilyMember) => {
    // Check linked transactions, accounts, journal entries, rules
    const linkedTx = await db.transactions
      .where('created_by_member_id')
      .equals(member.id)
      .count();
    const linkedAcc = await db.accounts.where('owner_member_id').equals(member.id).count();
    const linkedEntries = await db.journalEntries.where('member_id').equals(member.id).count();
    const allRules = await db.allocationRules.toArray();
    const linkedRules = allRules.filter((r) =>
      r.allocations.some((a) => a.target_member_id === member.id)
    ).length;

    const totalLinked = linkedTx + linkedAcc + linkedEntries + linkedRules;

    if (totalLinked > 0) {
      setSafetyNotice({ member, linkedCount: totalLinked });
    } else {
      if (confirm(`Are you sure you want to permanently remove ${member.name}?`)) {
        await db.familyMembers.delete(member.id);
        onRefresh();
      }
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!safetyNotice) return;
    await db.familyMembers.put({
      ...safetyNotice.member,
      is_active: false,
      updated_at: new Date().toISOString(),
    });
    setSafetyNotice(null);
    onRefresh();
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) return;

    const taka = parseFloat(openingTaka) || 0;
    const paisa = takaToPaisa(taka);
    const now = new Date().toISOString();

    await db.accounts.put({
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      family_id: familyId,
      account_name: accountName.trim(),
      account_type: accountType,
      owner_member_id: ownerMemberId || undefined,
      opening_balance_cents: paisa,
      current_balance_cents: paisa,
      created_at: now,
      updated_at: now,
    });

    setAccountName('');
    setOpeningTaka('');
    onRefresh();
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm('Delete this account? Historical transactions referencing this account will be kept.')) {
      await db.accounts.delete(id);
      onRefresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Family Members Section (Span 6) */}
      <div className="lg:col-span-6 space-y-6">
        <BentoCard
          eyebrow="MEMBER DIRECTORY"
          title={t.family_members}
          badgeText={`${members.length} MEMBERS`}
          badgeType="indigo"
          icon={<Users className="w-4 h-4 text-indigo-500" />}
        >
          {/* Add Form */}
          <form
            onSubmit={handleAddMember}
            className="space-y-3 mt-2 mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600">
                {photoUri ? (
                  <img src={photoUri} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
                <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e, setPhotoUri)}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex-1">
                <span className="block text-[11px] font-bold text-slate-500 uppercase">
                  Profile Photo
                </span>
                <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setPhotoUri(p)}
                      className="w-6 h-6 rounded-full overflow-hidden border hover:scale-110 transition-transform shrink-0"
                    >
                      <img src={p} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <label className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer shrink-0">
                    <Upload className="w-3 h-3" /> Custom
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, setPhotoUri)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder={t.member_name}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              />
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="Self">Self (নিজ)</option>
                <option value="Spouse">Spouse (স্বামী/স্ত্রী)</option>
                <option value="Parent">Parent (পিতা/মাতা)</option>
                <option value="Child">Child (সন্তান)</option>
                <option value="Relative">Relative (আত্মীয়)</option>
                <option value="Other">Other (অন্যান্য)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number (e.g. 01700000000)"
                className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address (optional)"
                className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.add_member}</span>
            </button>
          </form>

          {/* Member List */}
          <div className="space-y-2.5">
            {members.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No family members configured yet.
              </div>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 border rounded-2xl flex items-center justify-between transition-all ${
                    m.is_active
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700'
                      : 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200/40 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      {m.photo_uri ? (
                        <img
                          src={m.photo_uri}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        m.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {m.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            m.is_active
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>{m.relation}</span>
                        {m.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" /> {m.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActivate(m)}
                      title={m.is_active ? 'Deactivate Member' : 'Activate Member'}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        m.is_active
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingMember({ ...m })}
                      title="Edit Member"
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSafeRemoveMember(m)}
                      title="Remove Member"
                      className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </BentoCard>
      </div>

      {/* Accounts Section (Span 6) */}
      <div className="lg:col-span-6 space-y-6">
        <BentoCard
          eyebrow="ACCOUNTS & VAULTS"
          title="Bank Accounts & Savings Vaults"
          badgeText={`${accounts.length} ACCOUNTS`}
          badgeType="emerald"
          icon={<Building2 className="w-4 h-4 text-emerald-500" />}
        >
          {/* Add Account Form */}
          <form
            onSubmit={handleAddAccount}
            className="space-y-3 mt-2 mb-6 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={t.account_name}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              />
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
              >
                <option value="CASH">Cash in Hand</option>
                <option value="BANK">Bank Account</option>
                <option value="FAMILY_FUND">Family Fund Reserve</option>
                <option value="PERSONAL_SAVINGS">Personal Member Savings</option>
                <option value="ASSET">Fixed Investment Asset</option>
                <option value="LIABILITY">Loan / Debt Payable</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={ownerMemberId}
                onChange={(e) => setOwnerMemberId(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              >
                <option value="">Shared Family Account (No single owner)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    Owner: {m.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                step="0.01"
                value={openingTaka}
                onChange={(e) => setOpeningTaka(e.target.value)}
                placeholder={`${t.opening_balance} (${currencySymbol})`}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.add_account}</span>
            </button>
          </form>

          {/* Account List */}
          <div className="space-y-3">
            {accounts.map((acc) => {
              const owner = members.find((m) => m.id === acc.owner_member_id);
              return (
                <div
                  key={acc.id}
                  className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                        {acc.account_name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {acc.account_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Owner: {owner ? owner.name : 'Shared Family'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                      {formatCurrency(acc.current_balance_cents, currencySymbol, lang)}
                    </span>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </BentoCard>
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" />
                Edit Member Profile
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-300 dark:border-slate-600">
                  {editingMember.photo_uri ? (
                    <img
                      src={editingMember.photo_uri}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                  <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handlePhotoUpload(e, (uri) =>
                          setEditingMember({ ...editingMember, photo_uri: uri })
                        )
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">
                    Select Avatar Preset
                  </span>
                  <div className="flex gap-1.5 mt-1 overflow-x-auto pb-1">
                    {AVATAR_PRESETS.map((p, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setEditingMember({ ...editingMember, photo_uri: p })}
                        className="w-6 h-6 rounded-full overflow-hidden border hover:scale-110 transition-transform shrink-0"
                      >
                        <img src={p} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.name}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Relation
                  </label>
                  <select
                    value={editingMember.relation}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, relation: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="Self">Self (নিজ)</option>
                    <option value="Spouse">Spouse (স্বামী/স্ত্রী)</option>
                    <option value="Parent">Parent (পিতা/মাতা)</option>
                    <option value="Child">Child (সন্তান)</option>
                    <option value="Relative">Relative (আত্মীয়)</option>
                    <option value="Other">Other (অন্যান্য)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Account Status
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingMember({
                        ...editingMember,
                        is_active: !editingMember.is_active,
                      })
                    }
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      editingMember.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-500'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{editingMember.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editingMember.phone || ''}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editingMember.email || ''}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
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

      {/* Safety Deactivate Notice Modal */}
      {safetyNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold">Historical Record Protection</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>{safetyNotice.member.name}</strong> is currently linked to{' '}
              <span className="font-mono font-bold text-indigo-600">
                {safetyNotice.linkedCount} financial records
              </span>{' '}
              (transactions, accounts, or journal entries).
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              To preserve accurate double-entry accounting audit trails and past reports, this member
              cannot be hard-deleted. You can safely <strong>Deactivate</strong> them instead, which
              hides them from future selections while keeping historical reports intact.
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
                onClick={handleConfirmDeactivate}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Deactivate Member</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
