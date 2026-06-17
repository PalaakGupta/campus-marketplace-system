import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiArrowRight, FiCamera, FiX,
  FiZap, FiCheckCircle,
} from 'react-icons/fi';
import SecurityCard from '../../components/ui/SecurityCard/SecurityCard';
import CategoryChips from '../../components/ui/CategoryChips/CategoryChips';
import { createItem } from '../../services/itemService';
import API from '../../services/api';
import './ListItem.css';

const TOTAL_STEPS = 4;

const CATEGORIES = [
  { id: 'Electronics', label: 'Electronics' },
  { id: 'Books', label: 'Books' },
  { id: 'Lab Equipment', label: 'Lab Equipment' },
  { id: 'Furniture', label: 'Furniture' },
  { id: 'Clothing', label: 'Clothing' },
  { id: 'Sports', label: 'Sports' },
  { id: 'Other', label: 'Other' },
];

const CONDITIONS = [
  { id: 'New', label: 'New' },
  { id: 'Like New', label: 'Like New' },
  { id: 'Good', label: 'Good' },
  { id: 'Fair', label: 'Fair' },
  { id: 'Poor', label: 'Poor' },
];

const STEP_LABELS = ['Photos', 'Details', 'Pricing', 'Preview'];

const INITIAL_FORM = {
  title: '',
  category: '',
  condition: '',
  channel: 'marketplace',
  description: '',
  price: '',
  images: [],
};

const INITIAL_ERRORS = {
  title: '',
  category: '',
  condition: '',
  price: '',
  images: '',
};

function validate(step, form) {
  const errors = { ...INITIAL_ERRORS };
  if (step === 1 && form.images.length === 0) {
    errors.images = 'Please add at least one photo.';
  }
  if (step === 2) {
    if (!form.title.trim()) errors.title = 'Title is required.';
    if (!form.category) errors.category = 'Please select a category.';
    if (!form.condition) errors.condition = 'Please select a condition.';
  }
  if (step === 3) {
    const p = parseFloat(form.price);
    if (!form.price || isNaN(p) || p <= 0) errors.price = 'Please enter a valid price.';
  }
  return errors;
}

function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

export default function ListItem() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const pct = Math.round((step / TOTAL_STEPS) * 100);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - form.images.length;
    const toAdd = files.slice(0, remaining).map((file) => ({
      id: `img-${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setField('images', [...form.images, ...toAdd]);
  };

  const handleRemoveImage = (imgId) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((i) => i.id !== imgId),
    }));
  };

  const handleNext = () => {
    const validationErrors = validate(step, form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigate(-1);
  };

  const handlePublish = async () => {
    try {
      setSubmitting(true);
      setSubmitError("");

      const listingData = await createItem({
        title:           form.title.trim(),
        description:     form.description.trim(),
        price:           parseInt(form.price, 10),
        category:        form.category,
        condition:       form.condition,
        listing_channel:
          form.channel === "Thrift Store"
            ? "thrift_store"
            : "marketplace",
      });

      const listingId = listingData?.data?.id || listingData?.id;

      // Step 2: Upload images if any
      if (form.images.length > 0 && listingId) {
        try {
          const formData = new FormData();
          form.images.forEach((img) => formData.append("images", img.file));
          await API.post(`/items/${listingId}/images`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (imgErr) {
          console.warn("Image upload failed — listing created without images:", imgErr);
        }
      }

      navigate(listingId ? `/item/${listingId}` : "/marketplace");
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail ||
        "Failed to publish listing";
      setSubmitError(typeof msg === "string" ? msg : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="list-item page anim-fade-in">
      {/* ── Sticky Header ── */}
      <div className="list-item__header">
        <div className="list-item__header-row">
          <div className="list-item__header-left">
            <button
              className="btn-ghost btn-icon"
              onClick={handleBack}
              type="button"
              aria-label="Back"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="list-item__header-title">List New Item</h1>
              <p className="list-item__header-sub">Create a marketplace listing</p>
            </div>
          </div>
          <span className="list-item__progress-badge">{pct}% Complete</span>
        </div>

        {/* Progress bar */}
        <div className="list-item__progress-bar">
          <div
            className="list-item__progress-fill"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="list-item__steps">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const done = num < step;
            const active = num === step;
            return (
              <div key={label} className="list-item__step">
                <div className={`list-item__step-dot ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                  {done ? <FiCheckCircle size={11} /> : num}
                </div>
                <span className={`list-item__step-label ${active ? 'active' : ''}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ── */}
      <div className="list-item__body">

        {submitError && (
          <div style={{ background: "var(--color-red-soft)", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "var(--color-red-dark)", fontWeight: 500 }}>
            {submitError}
          </div>
        )}

        {/* STEP 1 — Photos */}
        {step === 1 && (
          <div className="list-item__step-content anim-fade-in">
            <h2 className="list-item__section-title">Add Photos</h2>
            <p className="list-item__section-desc">
              Great photos help your item sell faster. Add up to 5 images.
            </p>

            {/* Image Grid */}
            <div className="list-item__image-grid">
              {form.images.map((img, idx) => (
                <div key={img.id} className="list-item__image-slot list-item__image-slot--filled">
                  <img src={img.url} alt={`Photo ${idx + 1}`} className="list-item__image-preview" />
                  <button
                    className="list-item__image-remove"
                    onClick={() => handleRemoveImage(img.id)}
                    type="button"
                    aria-label="Remove photo"
                  >
                    <FiX size={13} />
                  </button>
                  {idx === 0 && <span className="list-item__cover-badge">Cover</span>}
                </div>
              ))}
              {form.images.length < 5 && (
                <button
                  className="list-item__image-slot list-item__image-slot--add"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <FiCamera size={22} />
                  <span>Add Photo</span>
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddImages}
              style={{ display: 'none' }}
            />

            {errors.images && (
              <p className="field-error">{errors.images}</p>
            )}
          </div>
        )}

        {/* STEP 2 — Details */}
        {step === 2 && (
          <div className="list-item__step-content anim-fade-in">
            <h2 className="list-item__section-title">Item Details</h2>

            <div className="list-item__form">
              {/* Title */}
              <div className="field-group">
                <label className="field-label" htmlFor="item-title">Item Title *</label>
                <input
                  id="item-title"
                  className={`input-field ${errors.title ? 'error' : ''}`}
                  type="text"
                  placeholder=""
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  maxLength={100}
                />
                {errors.title && <p className="field-error">{errors.title}</p>}
              </div>

              {/* Category */}
              <div className="field-group">
                <label className="field-label">Category *</label>
                <div className="list-item__chip-wrap">
                  <CategoryChips
                    categories={CATEGORIES}
                    active={form.category}
                    onSelect={(val) => setField('category', val)}
                    scrollable={false}
                  />
                </div>
                {errors.category && <p className="field-error">{errors.category}</p>}
              </div>

              {/* Condition */}
              <div className="field-group">
                <label className="field-label">Condition *</label>
                <div className="list-item__chip-wrap">
                  <CategoryChips
                    categories={CONDITIONS}
                    active={form.condition}
                    onSelect={(val) => setField('condition', val)}
                    scrollable={false}
                  />
                </div>
                {errors.condition && <p className="field-error">{errors.condition}</p>}
              </div>

              {/* Channel */}
              <div className="field-group">
                <label className="field-label">Listing Channel</label>
                <div className="list-item__channel-grid">
                  {[
                    { id: 'marketplace', emoji: '🏪', desc: 'Standard listings' },
                    { id: 'thrift Store', emoji: '♻️', desc: 'Budget friendly' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      className={`list-item__channel-btn ${form.channel === ch.id ? 'active' : ''}`}
                      onClick={() => setField('channel', ch.id)}
                      type="button"
                    >
                      <span className="list-item__channel-emoji">{ch.emoji}</span>
                      <span className="list-item__channel-label">{ch.id}</span>
                      <span className="list-item__channel-desc">{ch.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="field-group">
                <label className="field-label" htmlFor="item-desc">Description</label>
                <textarea
                  id="item-desc"
                  className="input-field"
                  rows={5}
                  placeholder="Describe your item — condition details, age, included accessories, reason for selling..."
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  maxLength={1000}
                  style={{ resize: 'vertical' }}
                />
                <p className="list-item__char-count">
                  {form.description.length}/1000
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 — Pricing */}
        {step === 3 && (
          <div className="list-item__step-content anim-fade-in">
            <h2 className="list-item__section-title">Set Your Price</h2>
            <p className="list-item__section-desc">
              Price competitively to attract more buyers.
            </p>

            <div className="list-item__price-card card">
              <label className="field-label" htmlFor="item-price">Price (₹)</label>
              <div className="list-item__price-input-wrap">
                <span className="list-item__currency-symbol"></span>
                <input
                  id="item-price"
                  type="number"
                  className="list-item__price-input"
                  value={form.price}
                  onChange={(e) => setField('price', e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
              {errors.price && <p className="field-error" style={{ marginTop: 8 }}>{errors.price}</p>}
            </div>

            <SecurityCard
              title="How payments work"
              message="When a buyer purchases your item, funds are held securely in the campus vault. You receive payment only after the buyer confirms receipt."
              variant="info"
            />
          </div>
        )}

        {/* STEP 4 — Preview */}
        {step === 4 && (
          <div className="list-item__step-content anim-fade-in">
            <h2 className="list-item__section-title">Preview Your Listing</h2>
            <p className="list-item__section-desc">
              Review your listing before publishing.
            </p>

            <div className="list-item__preview-card card">
              <div className="list-item__preview-image-wrap">
                {form.images.length > 0
                  ? <img src={form.images[0].url} alt={form.title} className="list-item__preview-image" />
                  : <div className="list-item__preview-image-placeholder" />
                }
                {form.channel === 'thrift Store' && (
                  <span className="list-item__preview-thrift">THRIFT STORE</span>
                )}
              </div>
              <div className="list-item__preview-body">
                <div className="list-item__preview-title-row">
                  <p className="list-item__preview-title">{form.title || 'Your item title'}</p>
                  <p className="list-item__preview-price">
                    ₹{form.price ? parseInt(form.price).toLocaleString() : '0'}
                  </p>
                </div>
                <div className="list-item__preview-chips">
                  {form.condition && <span className="chip chip-sm">{form.condition}</span>}
                  {form.category && <span className="chip chip-sm">{form.category}</span>}
                </div>
                {form.description && (
                  <p className="list-item__preview-desc">{form.description}</p>
                )}
              </div>
            </div>

            <SecurityCard
              title="Ready to publish"
              message="Your listing will be visible to the entire campus community once published."
              variant="success"
            />
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        <div className="list-item__nav-btns">
          {step > 1 && (
            <button
              className="btn btn-secondary btn-inline list-item__back-btn"
              onClick={handleBack}
              type="button"
            >
              <FiArrowLeft size={16} /> Back
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              className="btn btn-primary btn-inline list-item__next-btn"
              onClick={handleNext}
              type="button"
            >
              Next <FiArrowRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-inline list-item__next-btn"
              onClick={handlePublish}
              disabled={submitting}
              type="button"
            >
              <FiZap size={16} />
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}