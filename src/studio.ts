export type Mode = "A" | "B" | "C" | "D";

export interface Studio {
  mode: Mode;
  spin: number;
  close: number;
  flip: number;
  rings: boolean;
}

const MODES: Array<{ id: Mode; title: string; hint: string }> = [
  { id: "A", title: "太极浑仪", hint: "八卦罗盘" },
  { id: "B", title: "五瓣罗盘", hint: "正面开合" },
  { id: "C", title: "五瓣翻面", hint: "闭合反面" },
  { id: "D", title: "自动演出", hint: "交接动画" },
];

export function createStudio(onChange: (studio: Studio, reason: "mode" | "param") => void) {
  const state: Studio = {
    mode: "A",
    spin: 1,
    close: 0,
    flip: 0,
    rings: true,
  };

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
      <span>花瓣闭合</span>
      <input id="studio-close" type="range" min="0" max="100" value="0" />
    </label>
    <label class="studio-row">
      <span>翻面</span>
      <input id="studio-flip" type="range" min="0" max="100" value="0" />
    </label>
    <label class="studio-check">
      <input id="studio-rings" type="checkbox" checked />
      <span>浑仪环</span>
    </label>
    <div class="studio-help">按 1–4 或 A–D 切换 · 空格暂停</div>
  `;
  document.body.appendChild(el);

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
  const closeEl = el.querySelector<HTMLInputElement>("#studio-close")!;
  const flipEl = el.querySelector<HTMLInputElement>("#studio-flip")!;
  const ringsEl = el.querySelector<HTMLInputElement>("#studio-rings")!;

  const paint = () => {
    buttons.forEach((btn, id) => {
      btn.classList.toggle("is-on", id === state.mode);
    });
    const inspect = state.mode === "B" || state.mode === "C";
    closeEl.disabled = !inspect;
    flipEl.disabled = !inspect;
    el.classList.toggle("is-show", state.mode === "D");
  };

  const emit = (reason: "mode" | "param") => {
    paint();
    onChange({ ...state }, reason);
  };

  const applyPreset = (mode: Mode) => {
    if (mode === "B") {
      state.close = 0;
      state.flip = 0;
    }
    if (mode === "C") {
      state.close = 1;
      state.flip = 1;
    }
    closeEl.value = String(Math.round(state.close * 100));
    flipEl.value = String(Math.round(state.flip * 100));
  };

  const setMode = (mode: Mode) => {
    if (state.mode === mode) {
      applyPreset(mode);
      emit("mode");
      return;
    }
    state.mode = mode;
    applyPreset(mode);
    emit("mode");
  };

  spinEl.addEventListener("input", () => {
    state.spin = Number(spinEl.value) / 100;
    emit("param");
  });
  closeEl.addEventListener("input", () => {
    state.close = Number(closeEl.value) / 100;
    emit("param");
  });
  flipEl.addEventListener("input", () => {
    state.flip = Number(flipEl.value) / 100;
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
      "4": "D",
      A: "A",
      B: "B",
      C: "C",
      D: "D",
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
  };
}
