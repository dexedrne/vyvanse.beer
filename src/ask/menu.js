import { h } from '../dom.js';
import { BY_ID, CHIPS, LINES, runAction } from './actions.js';
import { requestAsk } from './client.js';

export function createAsk({ shell, pad }) {
  const field = h('input', { id: 'ask-input', name: 'text', type: 'text', maxlength: 200,
    placeholder: 'zombies as 85…', autocomplete: 'off', enterkeyhint: 'go', 'aria-describedby': 'ask-status' });
  const form = h('form', { class: 'ask-form' }, h('label', { for: 'ask-input' }, 'what would you like?'),
    h('div', { class: 'ask-field' }, field, h('button', { type: 'submit', class: 'play' }, 'ask')));
  const status = h('p', { id: 'ask-status', class: 'ask__text', role: 'status', 'aria-live': 'polite' });
  const choices = h('div', { class: 'ask-choices', role: 'group', 'aria-label': 'Suggestions' });
  const dismiss = h('button', { type: 'button', class: 'play play--ghost', onclick: () => close() }, 'back');
  const el = h('dialog', { class: 'ask-dialog', 'aria-labelledby': 'ask-heading' },
    h('p', { id: 'ask-heading', class: 'ask__title' }, 'ask'), form, status, choices,
    h('p', { class: 'ask__phone-help' }, 'touchpad · ask · Options · music'), dismiss);
  document.body.append(el);
  let controller, version = 0;

  function renderChoices(list = CHIPS) {
    choices.replaceChildren(...list.map(c => h('button', { type: 'button', class: 'ask-chip',
      'data-action': c.action, onclick: () => choose(c.action) }, c.label || BY_ID.get(c.action).label)));
  }
  function choose(id) {
    const action = BY_ID.get(id);
    if (!action) return;
    controller?.abort(); version++;
    form.removeAttribute('aria-busy');
    if (action.kind !== 'music' && action.kind !== 'none') close();
    status.textContent = action.line;
    runAction(id, shell);
  }
  function close() {
    controller?.abort(); version++;
    form.removeAttribute('aria-busy');
    if (el.open) el.close();
  }
  el.addEventListener('close', () => {
    controller?.abort(); version++;
    form.removeAttribute('aria-busy');
  });
  el.addEventListener('cancel', () => { controller?.abort(); version++; });
  el.addEventListener('click', e => { if (e.target === el) {
    const box = el.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) close();
  } });
  form.addEventListener('submit', e => { e.preventDefault(); submit(field.value); });
  function setPad(on) {
    el.classList.toggle('is-pad', on);
    if (on && el.open && form.contains(document.activeElement)) choices.querySelector('button')?.focus();
  }
  function open({ text = '', typing = true, from } = {}) {
    field.value = text;
    status.textContent = navigator.onLine === false ? LINES.offline : 'type it, use your keyboard’s mic, or pick a choice.';
    renderChoices();
    const usingPad = from === 'pad' || pad();
    setPad(usingPad);
    if (!el.open) el.showModal();
    if (usingPad || !typing) choices.querySelector('button').focus();
    else field.focus();
  }
  async function submit(text) {
    controller?.abort(); controller = new AbortController();
    const current = ++version;
    status.textContent = 'one moment…';
    form.setAttribute('aria-busy', 'true');
    try {
      const result = await requestAsk(text, { signal: controller.signal });
      if (current !== version || !el.open) return;
      status.textContent = result.line;
      if (result.suggestions) renderChoices(result.suggestions);
      if (result.action && result.action !== 'none') choose(result.action);
      else if (pad()) choices.querySelector('button')?.focus();
    } catch { /* Closing the dialog cancels its pending action. */ }
    finally { if (current === version) form.removeAttribute('aria-busy'); }
  }
  renderChoices();
  return { el, open, close, submit, setPad };
}
