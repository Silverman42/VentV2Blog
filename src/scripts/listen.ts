/**
 * "Listen to this article": reads the post aloud with the browser's built-in
 * text-to-speech (Web Speech API). No audio files, no server.
 *
 * Cross-browser notes baked into the design:
 * - Text is spoken in short chunks (a paragraph, split at sentences when long).
 *   Chrome silently stops long utterances after ~15 s; short chunks avoid that.
 * - Pause is implemented as cancel + remember position, and resume re-speaks the
 *   current chunk. speechSynthesis.pause()/resume() are unreliable on Android
 *   Chrome and some Safari versions.
 * - speak() is always called synchronously inside the click handler, which iOS
 *   Safari requires before it will produce sound.
 * - Voices load asynchronously in Chrome/Firefox (voiceschanged), so the voice is
 *   picked lazily at speak time.
 * - If the browser has no speechSynthesis, the player stays hidden.
 */

const root = document.querySelector<HTMLElement>('[data-listen]');
const synth: SpeechSynthesis | undefined = 'speechSynthesis' in window ? window.speechSynthesis : undefined;

if (root && synth && 'SpeechSynthesisUtterance' in window) {
  const prose = document.querySelector<HTMLElement>('.prose-vent');
  const toggle = root.querySelector<HTMLButtonElement>('[data-listen-toggle]')!;
  const stopBtn = root.querySelector<HTMLButtonElement>('[data-listen-stop]')!;
  const rateBtn = root.querySelector<HTMLButtonElement>('[data-listen-rate]')!;
  const status = root.querySelector<HTMLElement>('[data-listen-status]')!;
  const bar = root.querySelector<HTMLElement>('[data-listen-bar]')!;
  const progress = root.querySelector<HTMLElement>('[data-listen-progress]')!;
  const idleLabel = status.textContent ?? '';

  type Chunk = { text: string; el: HTMLElement | null };
  const RATES = [1, 1.25, 1.5, 2, 0.75];
  const MAX_CHUNK = 220;

  let chunks: Chunk[] = [];
  let totalChars = 0;
  let index = 0;
  let rateIdx = 0;
  let state: 'idle' | 'playing' | 'paused' = 'idle';
  let generation = 0; // bumps on every cancel so late events from old utterances are ignored
  let voice: SpeechSynthesisVoice | null | undefined;

  /** Split long text into sentence-sized pieces no longer than MAX_CHUNK. */
  const split = (text: string): string[] => {
    if (text.length <= MAX_CHUNK) return [text];
    const sentences = text.match(/[^.!?…]+[.!?…]+["”’)]*\s*|[^.!?…]+$/g) ?? [text];
    const out: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if (buf && (buf + s).length > MAX_CHUNK) {
        out.push(buf.trim());
        buf = '';
      }
      if (s.length > MAX_CHUNK) {
        // A single very long sentence: break at commas / spaces.
        let rest = s;
        while (rest.length > MAX_CHUNK) {
          let cut = rest.lastIndexOf(', ', MAX_CHUNK);
          if (cut < 80) cut = rest.lastIndexOf(' ', MAX_CHUNK);
          if (cut < 1) cut = MAX_CHUNK;
          out.push(rest.slice(0, cut + 1).trim());
          rest = rest.slice(cut + 1);
        }
        buf = rest;
      } else buf += s;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  };

  const buildChunks = () => {
    const list: Chunk[] = [];
    const title = root.dataset.listenTitle?.trim();
    if (title) list.push({ text: title + '.', el: null });
    if (prose) {
      const blocks = [...prose.querySelectorAll<HTMLElement>('h2, h3, h4, p, li, figcaption, td, th')].filter(
        // Skip blocks nested inside another readable block (e.g. <li><p>), and anything marked aria-hidden.
        (el) => !el.parentElement?.closest('li, td, th, figcaption') && !el.closest('[aria-hidden="true"]'),
      );
      for (const el of blocks) {
        const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) continue;
        for (const piece of split(text)) list.push({ text: piece, el });
      }
    }
    chunks = list;
    totalChars = list.reduce((n, c) => n + c.text.length, 0) || 1;
  };

  const pickVoice = (): SpeechSynthesisVoice | null => {
    const voices = synth.getVoices();
    if (!voices.length) return null;
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const pool = en.length ? en : voices;
    const quality = /natural|neural|premium|enhanced|google/i;
    const prefs = ['en-ng', 'en-gh', 'en-za', 'en-ke', 'en-gb', 'en-us'];
    const exact = pool.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang);
    for (const group of [exact, ...prefs.map((p) => pool.filter((v) => v.lang.toLowerCase().replace('_', '-') === p))]) {
      if (!group.length) continue;
      return group.find((v) => quality.test(v.name)) ?? group.find((v) => v.localService) ?? group[0];
    }
    return pool.find((v) => v.default) ?? pool[0];
  };
  synth.addEventListener?.('voiceschanged', () => {
    voice = undefined; // re-pick next time we speak
  });

  const setActive = (el: HTMLElement | null) => {
    prose?.querySelectorAll('[data-tts-active]').forEach((n) => n.removeAttribute('data-tts-active'));
    if (el) el.setAttribute('data-tts-active', '');
  };

  const setProgress = (charsDone: number) => {
    const pct = Math.min(100, Math.round((charsDone / totalChars) * 100));
    bar.style.width = `${pct}%`;
    progress.setAttribute('aria-valuenow', String(pct));
  };
  const charsBefore = (i: number) => chunks.slice(0, i).reduce((n, c) => n + c.text.length, 0);

  const render = () => {
    root.dataset.state = state;
    const playing = state === 'playing';
    toggle.setAttribute('aria-label', playing ? 'Pause reading' : state === 'paused' ? 'Resume reading' : 'Listen to this article');
    toggle.setAttribute('aria-pressed', String(playing));
    stopBtn.hidden = state === 'idle';
    status.textContent = state === 'idle' ? idleLabel : playing ? 'Reading aloud…' : 'Paused';
  };

  const speakFrom = (i: number) => {
    const gen = ++generation;
    synth.cancel();
    if (i >= chunks.length) {
      finish();
      return;
    }
    index = i;
    const chunk = chunks[i];
    if (voice === undefined) voice = pickVoice();
    const u = new SpeechSynthesisUtterance(chunk.text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = document.documentElement.lang || 'en';
    u.rate = RATES[rateIdx];
    const base = charsBefore(i);
    u.onboundary = (e) => {
      if (gen === generation) setProgress(base + (e.charIndex ?? 0));
    };
    u.onend = () => {
      if (gen === generation && state === 'playing') speakFrom(i + 1);
    };
    u.onerror = (e) => {
      if (gen !== generation || state !== 'playing') return;
      // 'interrupted'/'canceled' come from our own cancel(); anything else: skip this chunk.
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      speakFrom(i + 1);
    };
    setActive(chunk.el);
    setProgress(base);
    synth.speak(u);
  };

  const finish = () => {
    generation++;
    synth.cancel();
    state = 'idle';
    index = 0;
    setActive(null);
    setProgress(0);
    render();
  };

  toggle.addEventListener('click', () => {
    if (state === 'playing') {
      generation++;
      synth.cancel();
      state = 'paused';
      render();
      return;
    }
    if (!chunks.length) buildChunks();
    state = 'playing';
    render();
    speakFrom(index);
  });

  stopBtn.addEventListener('click', finish);

  rateBtn.addEventListener('click', () => {
    rateIdx = (rateIdx + 1) % RATES.length;
    const label = `${RATES[rateIdx]}×`;
    rateBtn.textContent = label;
    rateBtn.setAttribute('aria-label', `Reading speed ${label}. Change speed`);
    if (state === 'playing') speakFrom(index); // restart the current chunk at the new speed
  });

  // Don't keep talking after the reader leaves the page (Chrome otherwise can).
  window.addEventListener('pagehide', () => synth.cancel());
  // A previous page may have left speech queued.
  synth.cancel();

  root.hidden = false;
  render();
}

export {};
