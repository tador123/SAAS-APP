import { useState, useCallback } from 'react';

/**
 * Validation rule builders — each returns { valid, message }.
 */
export const validators = {
  required: (label = 'This field') => (v) =>
    v != null && String(v).trim() !== '' ? null : `${label} is required`,

  email: () => (v) => {
    if (!v) return null; // use required() separately for mandatory checks
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Invalid email address';
  },

  minLength: (min, label = 'Value') => (v) =>
    !v || v.length >= min ? null : `${label} must be at least ${min} characters`,

  maxLength: (max, label = 'Value') => (v) =>
    !v || v.length <= max ? null : `${label} must be at most ${max} characters`,

  min: (minVal, label = 'Value') => (v) => {
    if (v === '' || v == null) return null;
    return Number(v) >= minVal ? null : `${label} must be at least ${minVal}`;
  },

  positiveNumber: (label = 'Value') => (v) => {
    if (v === '' || v == null) return null;
    return Number(v) > 0 ? null : `${label} must be greater than 0`;
  },

  phone: () => (v) => {
    if (!v) return null;
    return /^[+]?[\d\s()-]{7,20}$/.test(v) ? null : 'Invalid phone number';
  },

  dateAfter: (getOtherDate, label = 'Date') => (v) => {
    if (!v) return null;
    const other = typeof getOtherDate === 'function' ? getOtherDate() : getOtherDate;
    if (!other) return null;
    return new Date(v) > new Date(other) ? null : `${label} must be after the start date`;
  },

  dateFuture: (label = 'Date') => (v) => {
    if (!v) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(v) >= today ? null : `${label} cannot be in the past`;
  },

  pattern: (regex, message) => (v) => {
    if (!v) return null;
    return regex.test(v) ? null : message;
  },

  passwordStrength: () => (v) => {
    if (!v) return null;
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(v)) return 'Must contain an uppercase letter';
    if (!/[0-9]/.test(v)) return 'Must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(v)) return 'Must contain a special character';
    return null;
  },

  match: (getOther, message = 'Values do not match') => (v) => {
    const other = typeof getOther === 'function' ? getOther() : getOther;
    return v === other ? null : message;
  },
};

/**
 * useFormValidation hook
 *
 * @param {Object} schema - { fieldName: [validatorFn, validatorFn, ...] }
 * @returns {{ errors, validate, validateField, clearErrors, isValid }}
 *
 * Usage:
 *   const { errors, validate, validateField } = useFormValidation({
 *     email: [validators.required('Email'), validators.email()],
 *     price: [validators.required('Price'), validators.positiveNumber('Price')],
 *   });
 *
 *   // In input: onBlur={() => validateField('email', form.email)}
 *   // In submit: if (!validate(form)) return;
 */
export function useFormValidation(schema) {
  const [errors, setErrors] = useState({});

  const validateField = useCallback((field, value) => {
    const rules = schema[field];
    if (!rules) return true;

    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    return true;
  }, [schema]);

  const validate = useCallback((formData) => {
    const newErrors = {};
    let valid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = formData[field];
      for (const rule of rules) {
        const error = rule(value);
        if (error) {
          newErrors[field] = error;
          valid = false;
          break;
        }
      }
    }

    setErrors(newErrors);
    return valid;
  }, [schema]);

  const clearErrors = useCallback(() => setErrors({}), []);

  const isValid = Object.keys(errors).length === 0;

  return { errors, validate, validateField, clearErrors, isValid };
}

/**
 * Inline error display component
 */
export function FieldError({ error }) {
  if (!error) return null;
  return <p className="mt-1 text-xs text-red-500">{error}</p>;
}
