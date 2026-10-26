import clsx from 'clsx';
import { Check, Plus, Save, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FieldError, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useCategories, useUpdateShop } from '@/lib/queries';
import { useToasts } from '@/store';
import type { Offer, PriceItem, ShopDetail } from '@/types';

/** Editable row shape. `id` is absent for rows added in this session. */
interface ItemDraft {
  id?: string;
  name: string;
  price: string;
  comparePrice: string;
  unit: string;
  isAvailable: boolean;
}

interface OfferDraft {
  title: string;
  discountType: Offer['discountType'];
  discountValue: string;
  code: string;
  validUntil: string;
}

function toItemDrafts(items: PriceItem[]): ItemDraft[] {
  return items.map((i) => ({
    id: i.id,
    name: i.name,
    price: String(i.price),
    comparePrice: i.comparePrice === undefined ? '' : String(i.comparePrice),
    unit: i.unit ?? '',
    isAvailable: i.isAvailable,
  }));
}

function toOfferDrafts(offers: Offer[]): OfferDraft[] {
  return offers.map((o) => ({
    title: o.title,
    discountType: o.discountType,
    discountValue: String(o.discountValue),
    code: o.code ?? '',
    validUntil: o.validUntil ? o.validUntil.slice(0, 10) : '',
  }));
}

/**
 * Full shop editor. Used by the owner for their own shop and by an admin for
 * any shop — the API applies the same `updateShopSchema` either way and decides
 * authorisation server-side, so this component needs no role logic.
 *
 * Note both `items` and `offers` are whole-array replacements on the API, so
 * every row is always sent, not just the edited one.
 */
export function ShopEditor({ shop }: { shop: ShopDetail }) {
  const { data: categories = [] } = useCategories();
  const updateShop = useUpdateShop(shop.id);
  const push = useToasts((s) => s.push);

  const [basics, setBasics] = useState({
    name: shop.name,
    description: shop.description ?? '',
    category: shop.category,
    phone: shop.contact.phone,
    email: shop.contact.email ?? '',
    website: shop.contact.website ?? '',
    address: shop.location.address,
    landmark: shop.location.landmark ?? '',
    city: shop.location.city,
    state: shop.location.state,
    pincode: shop.location.pincode,
  });
  const [features, setFeatures] = useState<Record<string, boolean>>({ ...shop.features });
  const [items, setItems] = useState<ItemDraft[]>(() => toItemDrafts(shop.pricing.items));
  const [offers, setOffers] = useState<OfferDraft[]>(() => toOfferDrafts(shop.allOffers ?? shop.offers));
  const [activeSaving, setActiveSaving] = useState<'basics' | 'items' | 'offers' | null>(null);
  const [savedSection, setSavedSection] = useState<'basics' | 'items' | 'offers' | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  function save(
    section: 'basics' | 'items' | 'offers',
    payload: Record<string, unknown>,
    successMessage: string,
  ) {
    setError('');
    setSectionErrors((prev) => ({ ...prev, [section]: '' }));
    setActiveSaving(section);

    updateShop.mutate(payload, {
      onSuccess: () => {
        setActiveSaving(null);
        setSavedSection(section);
        push(successMessage, 'success');
        setTimeout(() => {
          setSavedSection((curr) => (curr === section ? null : curr));
        }, 3000);
      },
      onError: (err) => {
        setActiveSaving(null);
        const msg =
          err instanceof ApiError && err.details?.length
            ? err.details.map((d) => d.message).join(' • ')
            : (err as Error).message;
        setError(msg);
        setSectionErrors((prev) => ({ ...prev, [section]: msg }));
      },
    });
  }

  function saveBasics() {
    save(
      'basics',
      {
        ...basics,
        description: basics.description || undefined,
        email: basics.email || undefined,
        website: basics.website || undefined,
        landmark: basics.landmark || undefined,
        features,
      },
      'Shop details saved.',
    );
  }

  function savePriceList() {
    // Blank rows are dropped rather than rejected — an empty trailing row is
    // the normal result of clicking "Add item" and changing your mind.
    const cleaned = items.filter((i) => i.name.trim() !== '');

    const invalid = cleaned.find((i) => i.price === '' || Number.isNaN(Number(i.price)) || Number(i.price) < 0);
    if (invalid) {
      const msg = `"${invalid.name}" needs a valid price.`;
      setError(msg);
      setSectionErrors((prev) => ({ ...prev, items: msg }));
      return;
    }

    save(
      'items',
      {
        items: cleaned.map((i) => ({
          name: i.name.trim(),
          price: Number(i.price),
          comparePrice: i.comparePrice === '' ? undefined : Number(i.comparePrice),
          unit: i.unit || undefined,
          isAvailable: i.isAvailable,
        })),
      },
      `Price list saved — ${cleaned.length} item(s).`,
    );
  }

  function saveOffers() {
    const cleaned = offers.filter((o) => o.title.trim() !== '');

    const invalid = cleaned.find(
      (o) => o.discountValue === '' || Number.isNaN(Number(o.discountValue)) || Number(o.discountValue) < 0,
    );
    if (invalid) {
      const msg = `"${invalid.title}" needs a valid discount value.`;
      setError(msg);
      setSectionErrors((prev) => ({ ...prev, offers: msg }));
      return;
    }
    const overHundred = cleaned.find((o) => o.discountType === 'percentage' && Number(o.discountValue) > 100);
    if (overHundred) {
      const msg = `"${overHundred.title}" — a percentage discount cannot exceed 100.`;
      setError(msg);
      setSectionErrors((prev) => ({ ...prev, offers: msg }));
      return;
    }

    save(
      'offers',
      {
        offers: cleaned.map((o) => ({
          title: o.title.trim(),
          discountType: o.discountType,
          discountValue: Number(o.discountValue),
          code: o.code || undefined,
          validUntil: o.validUntil || undefined,
          isActive: true,
        })),
      },
      `Offers saved — ${cleaned.length} offer(s).`,
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* --- Basics ----------------------------------------------------- */}
      <section className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-ink-900">Shop details</h3>

        <div className="space-y-3">
          <div>
            <label htmlFor="ed-name" className="label">
              Shop name
            </label>
            <input
              id="ed-name"
              className="input"
              value={basics.name}
              onChange={(e) => setBasics((b) => ({ ...b, name: e.target.value }))}
            />
            <p className="mt-1 text-xs text-ink-400">
              Renaming regenerates the URL and re-opens verification.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ed-category" className="label">
                Category
              </label>
              <select
                id="ed-category"
                className="input"
                value={basics.category}
                onChange={(e) => setBasics((b) => ({ ...b, category: e.target.value }))}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ed-phone" className="label">
                Phone
              </label>
              <input
                id="ed-phone"
                inputMode="numeric"
                className="input"
                value={basics.phone}
                onChange={(e) => setBasics((b) => ({ ...b, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ed-description" className="label">
              Description
            </label>
            <textarea
              id="ed-description"
              rows={3}
              className="input"
              value={basics.description}
              onChange={(e) => setBasics((b) => ({ ...b, description: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="ed-email" className="label">
                Email
              </label>
              <input
                id="ed-email"
                type="email"
                className="input"
                value={basics.email}
                onChange={(e) => setBasics((b) => ({ ...b, email: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="ed-website" className="label">
                Website
              </label>
              <input
                id="ed-website"
                className="input"
                placeholder="https://"
                value={basics.website}
                onChange={(e) => setBasics((b) => ({ ...b, website: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="ed-address" className="label">
              Address
            </label>
            <input
              id="ed-address"
              className="input"
              value={basics.address}
              onChange={(e) => setBasics((b) => ({ ...b, address: e.target.value }))}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label htmlFor="ed-landmark" className="label">
                Landmark
              </label>
              <input
                id="ed-landmark"
                className="input"
                value={basics.landmark}
                onChange={(e) => setBasics((b) => ({ ...b, landmark: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="ed-city" className="label">
                City
              </label>
              <input
                id="ed-city"
                className="input"
                value={basics.city}
                onChange={(e) => setBasics((b) => ({ ...b, city: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="ed-state" className="label">
                State
              </label>
              <input
                id="ed-state"
                className="input"
                value={basics.state}
                onChange={(e) => setBasics((b) => ({ ...b, state: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="ed-pincode" className="label">
                Pincode
              </label>
              <input
                id="ed-pincode"
                inputMode="numeric"
                className="input"
                value={basics.pincode}
                onChange={(e) => setBasics((b) => ({ ...b, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              />
            </div>
          </div>

          <fieldset>
            <legend className="label">Features</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['hasDelivery', 'Delivery'],
                  ['hasBooking', 'Booking'],
                  ['hasParking', 'Parking'],
                  ['acceptsUPI', 'UPI'],
                  ['acceptsCard', 'Card'],
                  ['acceptsCash', 'Cash'],
                  ['isWheelchairAccessible', 'Wheelchair access'],
                ] as const
              ).map(([key, label]) => {
                const isChecked = Boolean(features[key]);
                return (
                  <label
                    key={key}
                    className={clsx(
                      'flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors select-none',
                      isChecked
                        ? 'border-brand-500 bg-brand-50/80 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 shadow-xs'
                        : 'border-ink-200 dark:border-slate-700 text-ink-700 dark:text-slate-300 hover:bg-ink-50 dark:hover:bg-slate-800',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded text-brand-600 focus:ring-brand-500"
                      checked={isChecked}
                      onChange={(e) => setFeatures((f) => ({ ...f, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-ink-100 dark:border-slate-800 pt-4">
          <div className="text-xs text-ink-500 dark:text-slate-400">
            {sectionErrors.basics ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">{sectionErrors.basics}</span>
            ) : savedSection === 'basics' ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={15} className="stroke-[2.5]" aria-hidden /> Details saved successfully!
              </span>
            ) : (
              <span>Changes are published instantly to the local search catalog.</span>
            )}
          </div>

          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm active:scale-[0.98]',
              savedSection === 'basics'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              updateShop.isPending && activeSaving === 'basics' && 'opacity-70 cursor-not-allowed',
            )}
            onClick={saveBasics}
            disabled={updateShop.isPending}
          >
            {activeSaving === 'basics' && updateShop.isPending ? (
              <>
                <Spinner className="size-4 animate-spin text-white" />
                <span>Saving details…</span>
              </>
            ) : savedSection === 'basics' ? (
              <>
                <Check size={16} className="stroke-[2.5]" aria-hidden />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save size={16} aria-hidden />
                <span>Save details</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* --- Price list ------------------------------------------------- */}
      <section className="card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Price list ({items.length})</h3>
            <p className="mt-0.5 text-xs text-ink-500">
              Items with the same name across shops make price comparison work.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-700 hover:border-ink-300 shadow-xs transition active:scale-[0.98]"
            onClick={() =>
              setItems((rows) => [...rows, { name: '', price: '', comparePrice: '', unit: '', isAvailable: true }])
            }
          >
            <Plus size={14} className="stroke-[2.5]" aria-hidden />
            <span>Add item</span>
          </button>
        </div>

        {items.length === 0 ? (
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">
            No items yet. A price list is what makes this shop appear in comparisons.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={item.id ?? `new-${idx}`} className="grid gap-2 rounded-xl bg-ink-50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className="label text-[11px]" htmlFor={`item-name-${idx}`}>
                    Item name
                  </label>
                  <input
                    id={`item-name-${idx}`}
                    className="input"
                    value={item.name}
                    onChange={(e) =>
                      setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-[11px]" htmlFor={`item-price-${idx}`}>
                    Price (₹)
                  </label>
                  <input
                    id={`item-price-${idx}`}
                    inputMode="decimal"
                    className="input"
                    value={item.price}
                    onChange={(e) =>
                      setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-[11px]" htmlFor={`item-compare-${idx}`}>
                    Was (₹)
                  </label>
                  <input
                    id={`item-compare-${idx}`}
                    inputMode="decimal"
                    className="input"
                    value={item.comparePrice}
                    onChange={(e) =>
                      setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, comparePrice: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-[11px]" htmlFor={`item-unit-${idx}`}>
                    Unit
                  </label>
                  <input
                    id={`item-unit-${idx}`}
                    className="input"
                    placeholder="kg, hr…"
                    value={item.unit}
                    onChange={(e) =>
                      setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-1.5 pb-2 text-xs font-medium text-ink-600">
                    <input
                      type="checkbox"
                      checked={item.isAvailable}
                      onChange={(e) =>
                        setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, isAvailable: e.target.checked } : r)))
                      }
                    />
                    In stock
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove ${item.name || 'item'}`}
                    className="mb-1 rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    onClick={() => setItems((rows) => rows.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-ink-100 dark:border-slate-800 pt-4">
          <div className="text-xs text-ink-500 dark:text-slate-400">
            {sectionErrors.items ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">{sectionErrors.items}</span>
            ) : savedSection === 'items' ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={15} className="stroke-[2.5]" aria-hidden /> Price list saved ({items.length} items)!
              </span>
            ) : (
              <span>{items.length} item{items.length === 1 ? '' : 's'} in catalog • Transparent prices attract more buyers.</span>
            )}
          </div>

          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm active:scale-[0.98]',
              savedSection === 'items'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              updateShop.isPending && activeSaving === 'items' && 'opacity-70 cursor-not-allowed',
            )}
            onClick={savePriceList}
            disabled={updateShop.isPending}
          >
            {activeSaving === 'items' && updateShop.isPending ? (
              <>
                <Spinner className="size-4 animate-spin text-white" />
                <span>Saving price list…</span>
              </>
            ) : savedSection === 'items' ? (
              <>
                <Check size={16} className="stroke-[2.5]" aria-hidden />
                <span>Price list saved!</span>
              </>
            ) : (
              <>
                <Save size={16} aria-hidden />
                <span>Save price list</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* --- Offers ----------------------------------------------------- */}
      <section className="card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Tag size={15} aria-hidden />
              Offers ({offers.length})
            </h3>
            <p className="mt-0.5 text-xs text-ink-500">
              Discounts and deals visible to nearby shoppers and on your shop page.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-ink-700 dark:text-slate-200 hover:bg-ink-50 dark:hover:bg-slate-700 hover:border-ink-300 shadow-xs transition active:scale-[0.98]"
            onClick={() =>
              setOffers((rows) => [
                ...rows,
                { title: '', discountType: 'percentage', discountValue: '', code: '', validUntil: '' },
              ])
            }
          >
            <Plus size={14} className="stroke-[2.5]" aria-hidden />
            <span>Add offer</span>
          </button>
        </div>

        {offers.length === 0 ? (
          <p className="rounded-xl bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">No offers running.</p>
        ) : (
          <ul className="space-y-2">
            {offers.map((offer, idx) => (
              <li key={idx} className="grid gap-2 rounded-xl bg-ink-50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <label className="label text-[11px]" htmlFor={`offer-title-${idx}`}>
                    Title
                  </label>
                  <input
                    id={`offer-title-${idx}`}
                    className="input"
                    value={offer.title}
                    onChange={(e) =>
                      setOffers((rows) => rows.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="label text-[11px]" htmlFor={`offer-type-${idx}`}>
                    Type
                  </label>
                  <select
                    id={`offer-type-${idx}`}
                    className="input"
                    value={offer.discountType}
                    onChange={(e) =>
                      setOffers((rows) =>
                        rows.map((r, i) =>
                          i === idx ? { ...r, discountType: e.target.value as Offer['discountType'] } : r,
                        ),
                      )
                    }
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Flat amount</option>
                    <option value="buy_one_get_one">Buy one get one</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-[11px]" htmlFor={`offer-value-${idx}`}>
                    {offer.discountType === 'percentage' ? 'Percent' : 'Value (₹)'}
                  </label>
                  <input
                    id={`offer-value-${idx}`}
                    inputMode="decimal"
                    className="input"
                    value={offer.discountValue}
                    onChange={(e) =>
                      setOffers((rows) => rows.map((r, i) => (i === idx ? { ...r, discountValue: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-[11px]" htmlFor={`offer-until-${idx}`}>
                    Valid until
                  </label>
                  <input
                    id={`offer-until-${idx}`}
                    type="date"
                    className="input"
                    value={offer.validUntil}
                    onChange={(e) =>
                      setOffers((rows) => rows.map((r, i) => (i === idx ? { ...r, validUntil: e.target.value } : r)))
                    }
                  />
                </div>
                <div className="flex items-end justify-end sm:col-span-1">
                  <button
                    type="button"
                    aria-label={`Remove ${offer.title || 'offer'}`}
                    className="mb-1 rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    onClick={() => setOffers((rows) => rows.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-ink-100 dark:border-slate-800 pt-4">
          <div className="text-xs text-ink-500 dark:text-slate-400">
            {sectionErrors.offers ? (
              <span className="text-rose-600 dark:text-rose-400 font-medium">{sectionErrors.offers}</span>
            ) : savedSection === 'offers' ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={15} className="stroke-[2.5]" aria-hidden /> Offers saved ({offers.length} active)!
              </span>
            ) : (
              <span>Running special discounts can increase customer discovery by up to 3x.</span>
            )}
          </div>

          <button
            type="button"
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm active:scale-[0.98]',
              savedSection === 'offers'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              updateShop.isPending && activeSaving === 'offers' && 'opacity-70 cursor-not-allowed',
            )}
            onClick={saveOffers}
            disabled={updateShop.isPending}
          >
            {activeSaving === 'offers' && updateShop.isPending ? (
              <>
                <Spinner className="size-4 animate-spin text-white" />
                <span>Saving offers…</span>
              </>
            ) : savedSection === 'offers' ? (
              <>
                <Check size={16} className="stroke-[2.5]" aria-hidden />
                <span>Offers saved!</span>
              </>
            ) : (
              <>
                <Save size={16} aria-hidden />
                <span>Save offers</span>
              </>
            )}
          </button>
        </div>
      </section>

      <FieldError message={updateShop.isError ? (updateShop.error as Error).message : undefined} />
    </div>
  );
}
