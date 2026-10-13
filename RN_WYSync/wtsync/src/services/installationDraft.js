// A tiny in-memory "draft" of the installation wizard.
//
// Every screen saves what the user typed with updateDraft({...}).
// The Review screen reads everything with getDraft() and sends it to the backend.
// This is more reliable than passing everything through navigation params,
// because params get lost when a screen navigates without passing them on.

let draft = {};

export const getDraft = () => draft;

export const updateDraft = (patch) => {
  draft = { ...draft, ...patch };
  return draft;
};

export const resetDraft = () => {
  draft = {};
};

const num = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return NaN;
  return Number(String(value).trim());
};

const DEFAULT_ALERT_FORM = {
  highLimit: '65',
  lowEnabled: false,
  lowLimit: '15',
  persistence: '1',
  resetMargin: '3.0',
  repeatEvery: '30',
};

// Builds the alert rule object used by the Review screen and the API call.
//   high.all        -> group high limit
//   high.overrides  -> { T4: 60 }  (probes that use their own limit)
export const buildAlertConfig = (source = draft) => {
  const form = { ...DEFAULT_ALERT_FORM, ...(source.alertForm || {}) };

  const overrides = {};
  Object.entries(source.overrides || {}).forEach(([probe, value]) => {
    const n = num(value);
    if (!Number.isNaN(n)) overrides[probe] = n;
  });

  return {
    mode: 'group',
    high: { all: num(form.highLimit), overrides },
    low: form.lowEnabled
      ? { enabled: true, limit: num(form.lowLimit) }
      : { enabled: false },
    behaviour: {
      persistence: num(form.persistence),
      resetMargin: num(form.resetMargin),
      repeatEveryMinutes: num(form.repeatEvery),
    },
  };
};
