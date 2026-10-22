// Sound is off until the visitor asks for it. Nothing is created, and no audio file is fetched, before the
// first click: the hum and the ticks are made here from oscillators.

export interface Sound {
  /** A neuron firing. Silent while sound is off. */
  tick(): void;
  readonly on: boolean;
}

export function setupSound(): Sound {
  const button = document.getElementById("sound") as HTMLButtonElement | null;
  const label = document.getElementById("sound-label");

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let on = false;

  const build = () => {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // The hum: three low voices a little out of tune with each other, softened, breathing slowly.
    const soft = ctx.createBiquadFilter();
    soft.type = "lowpass";
    soft.frequency.value = 420;
    soft.connect(master);

    const voices: Array<[number, number]> = [[55, 0.5], [82.6, 0.3], [110.4, 0.16]];
    for (const [freq, level] of voices) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = level;
      osc.connect(gain).connect(soft);
      osc.start();
    }

    const breath = ctx.createOscillator();
    const depth = ctx.createGain();
    breath.frequency.value = 0.08;
    depth.gain.value = 110;
    breath.connect(depth).connect(soft.frequency);
    breath.start();
  };

  const fade = (to: number, seconds: number) => {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(to, now + seconds);
  };

  const show = () => {
    button?.setAttribute("aria-pressed", String(on));
    if (label) label.textContent = on ? "Sound on" : "Enable sound";
  };

  button?.addEventListener("click", () => {
    on = !on;
    if (on) {
      if (!ctx) build();
      void ctx?.resume();
      fade(0.12, 1.2);
    } else {
      fade(0, 0.4);
    }
    show();
  });

  // A hidden tab makes no sound.
  document.addEventListener("visibilitychange", () => {
    if (!ctx || !on) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });

  return {
    get on() { return on; },
    tick() {
      if (!on || !ctx || !master || ctx.state !== "running") return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100 + Math.random() * 900, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.5, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + 0.2);
    },
  };
}
