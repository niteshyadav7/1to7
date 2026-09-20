import React from 'react'
import { Package, Plus, MapPin, Home, Briefcase, Star, FileText, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ShippingAddress } from '@/types/user'

interface Step2ShippingAddressesProps {
  shippingAddresses: ShippingAddress[]
  isSuperAdmin: boolean
  maxAddresses?: number
  openAddAddressModal: () => void
  openEditAddressModal: (addr: ShippingAddress) => void
  handleDeleteAddress: (addrId: string) => void
  handleSetDefaultAddress: (addrId: string) => void
}

export const Step2ShippingAddresses: React.FC<Step2ShippingAddressesProps> = ({
  shippingAddresses = [],
  isSuperAdmin,
  maxAddresses = 6,
  openAddAddressModal,
  openEditAddressModal,
  handleDeleteAddress,
  handleSetDefaultAddress,
}) => {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Informational Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-200/80 rounded-2xl p-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30 shrink-0">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Product Shipping & Delivery Addresses
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Brands ship products and PR packages to these addresses. Admin can edit, add, or designate primary shipping destinations.
            </p>
          </div>
        </div>

        {shippingAddresses.length < maxAddresses ? (
          isSuperAdmin ? (
            <Button
              type="button"
              onClick={openAddAddressModal}
              className="h-8 px-3.5 bg-[#f50057] hover:bg-[#d8004c] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Address
            </Button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl shrink-0">
              Read-Only
            </span>
          )
        ) : (
          <span className="text-[11px] font-extrabold text-amber-700 bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl shrink-0">
            Max {maxAddresses} Saved
          </span>
        )}
      </div>

      {/* Saved Addresses List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#f50057]" />
            Saved Delivery Locations ({shippingAddresses.length}/{maxAddresses})
          </h3>
        </div>

        {shippingAddresses.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No delivery address added yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add a delivery address for physical brand campaigns.
            </p>
            {isSuperAdmin ? (
              <Button
                type="button"
                onClick={openAddAddressModal}
                className="mt-4 h-9 px-4 bg-[#f50057] hover:bg-[#d8004c] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Primary Address
              </Button>
            ) : (
              <p className="mt-3 text-xs text-slate-400 italic">No addresses available to view</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {shippingAddresses.map((addr) => (
              <div
                key={addr.id}
                className={`relative rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  addr.is_default
                    ? 'bg-gradient-to-br from-pink-50/70 via-white to-orange-50/40 border-[#f50057]/40 shadow-md shadow-pink-500/5 ring-1 ring-[#f50057]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        {addr.title.toLowerCase().includes('home') ? (
                          <Home className="h-3.5 w-3.5 text-blue-600" />
                        ) : addr.title.toLowerCase().includes('studio') || addr.title.toLowerCase().includes('work') ? (
                          <Briefcase className="h-3.5 w-3.5 text-purple-600" />
                        ) : (
                          <Package className="h-3.5 w-3.5 text-amber-600" />
                        )}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{addr.title}</span>
                    </div>

                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#f50057]/15 text-[#f50057] border border-[#f50057]/30">
                        <Star className="h-3 w-3 fill-[#f50057]" /> Primary
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-800 font-semibold mb-1 flex items-center justify-between">
                    <span>{addr.recipient_name}</span>
                    <span className="text-slate-500 font-normal text-[11px]">{addr.mobile}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                  </p>
                  {addr.landmark && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                      Landmark: {addr.landmark}
                    </p>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{addr.city}, {addr.state}</span>
                    <span className="font-mono font-bold text-[#f50057] bg-pink-50 px-2 py-0.5 rounded border border-pink-100 text-[11px]">
                      PIN: {addr.pincode || 'N/A'}
                    </span>
                  </div>

                  {addr.delivery_remarks && (
                    <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5">
                      <FileText className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-tight"><strong className="font-semibold">Note:</strong> {addr.delivery_remarks}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                  {!addr.is_default ? (
                    isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-[#f50057] transition-colors cursor-pointer"
                      >
                        Make Primary
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">Secondary Address</span>
                    )
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Selected for orders
                    </span>
                  )}

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => openEditAddressModal(addr)}
                        className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Edit Address"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {shippingAddresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Address"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
