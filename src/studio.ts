import { LAYER_GUIDE, type LayerId } from "./data";

export type Mode = "A" | "B" | "C";

export interface Studio {
  mode: Mode;
  spin: number;
  fold: number;
  counter: boolean;
  rings: boolean;
  zenith: boolean;
}

const MODES: Array<{ id: Mode; title: string; hint: string }> = [
  { id: "A", title: "运转", hint: "斜视对转" },
  { id: "B", title: "俯视", hint: "看盘读向" },
  { id: "C", title: "收环", hint: "浑仪合拢" },
];

export function createStudio(
  onChange: (studio: Studio, reason: "mode" | "param") => void,
  onFocus: (id: LayerId | null, pin: boolean) => void,
) {
  const state: Studio = {
    mode: "A",
    spin: 1,
    fold: 0,
    counter: true,
    rings: true,
    zenith: false,
  };
  let pinned: LayerId | null = null;

  const el = document.createElement("aside");
  el.id = "studio";
  el.innerHTML = `
    <div class="studio-kicker">观器</div>
    <div class="studio-modes" role="tablist"></div>
    <label class="studio-row">
      <span>转速</span>
      <input id="studio-spin" type="range" min="0" max="200" value="100" />
    </label>
    <label class="studio-row">
      <span>收环</span>
      <input id="studio-fold" type="range" min="0" max="100" value="0" />
    </label>
    <label class="studio-check">
      <input id="studio-counter" type="checkbox" checked />
      <span>隔层对转</span>
    </label>
    <label class="studio-check">
      <input id="studio-rings" type="checkbox" checked />
      <span>浑仪环</span>
    </label>
    <div class="studio-help">点击盘层对照 · 1–3 切换 · 空格暂停</div>
  `;
  document.body.appendChild(el);

  const lexicon = document.createElement("aside");
  lexicon.id = "lexicon";
  lexicon.innerHTML = `<div class="studio-kicker">盘层</div><ol class="lexicon-list"></ol>`;
  document.body.appendChild(lexicon);
  const list = lexicon.querySelector(".lexicon-list")!;
  const rows = new Map<string, HTMLElement>();

  LAYER_GUIDE.forEach((layer) => {
    const li = document.createElement("li");
    li.dataset.id = String(layer.id);
    li.innerHTML = `<b>${layer.name}</b><span>${layer.text}</span>`;
    li.addEventListener("pointerenter", () => {
      if (pinned !== null) return;
      paintFocus(layer.id);
      onFocus(layer.id, false);
    });
    li.addEventListener("click", (e) => {
      e.preventDefault();
      if (pinned === layer.id) {
        pinned = null;
        paintFocus(null);
        onFocus(null, true);
      } else {
        pinned = layer.id;
        paintFocus(layer.id);
        onFocus(layer.id, true);
      }
    });
    list.appendChild(li);
    rows.set(String(layer.id), li);
  });

  lexicon.addEventListener("pointerleave", () => {
    if (pinned !== null) {
      paintFocus(pinned);
      return;
    }
    paintFocus(null);
    onFocus(null, false);
  });

  const paintFocus = (id: LayerId | null) => {
    rows.forEach((row, key) => {
      row.classList.toggle("is-on", id !== null && key === String(id));
    });
  };

  const modeBox = el.querySelector(".studio-modes")!;
  const buttons = new Map<Mode, HTMLButtonElement>();
  MODES.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.mode = m.id;
    btn.innerHTML = `<b>${m.id}</b><span>${m.title}</span><small>${m.hint}</small>`;
    btn.addEventListener("click", () => setMode(m.id));
    modeBox.appendChild(btn);
    buttons.set(m.id, btn);
  });

  const spinEl = el.querySelector<HTMLInputElement>("#studio-spin")!;
  const foldEl = el.querySelector<HTMLInputElement>("#studio-fold")!;
  const counterEl = el.querySelector<HTMLInputElement>("#studio-counter")!;
  const ringsEl = el.querySelector<HTMLInputElement>("#studio-rings")!;

  const syncSliders = () => {
    foldEl.value = String(Math.round(state.fold * 100));
    counterEl.checked = state.counter;
    ringsEl.checked = state.rings;
  };

  const paint = () => {
    buttons.forEach((btn, id) => {
      btn.classList.toggle("is-on", id === state.mode);
    });
  };

  const emit = (reason: "mode" | "param") => {
    paint();
    onChange({ ...state }, reason);
  };

  const applyPreset = (mode: Mode) => {
    if (mode === "A") {
      state.fold = 0;
      state.zenith = false;
      state.counter = true;
      state.rings = true;
    }
    if (mode === "B") {
      state.fold = 0;
      state.zenith = true;
      state.rings = false;
    }
    if (mode === "C") {
      state.fold = 1;
      state.zenith = false;
      state.rings = true;
    }
    syncSliders();
  };

  const setMode = (mode: Mode) => {
    state.mode = mode;
    applyPreset(mode);
    emit("mode");
  };

  spinEl.addEventListener("input", () => {
    state.spin = Number(spinEl.value) / 100;
    emit("param");
  });
  foldEl.addEventListener("input", () => {
    state.fold = Number(foldEl.value) / 100;
    emit("param");
  });
  counterEl.addEventListener("change", () => {
    state.counter = counterEl.checked;
    emit("param");
  });
  ringsEl.addEventListener("change", () => {
    state.rings = ringsEl.checked;
    emit("param");
  });

  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const key = e.key.toUpperCase();
    const map: Record<string, Mode> = {
      "1": "A",
      "2": "B",
      "3": "C",
      A: "A",
      B: "B",
      C: "C",
    };
    if (map[key]) {
      e.preventDefault();
      setMode(map[key]);
    }
  });

  paint();
  return {
    el,
    get: () => ({ ...state }),
    setHover: (id: LayerId | null) => {
      if (pinned !== null) return;
      paintFocus(id);
    },
    setPinned: (id: LayerId | null) => {
      pinned = id;
      paintFocus(id);
    },
  };
}
