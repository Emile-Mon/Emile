// Every equation on the site, as LaTeX. One source so /math and the per-page strips never drift.
// Each one mirrors code in backend/app (see the `source` field).

export interface Equation {
  id: string;
  title: string;
  tex: string;
  note: string;
  source?: string;
  /** Too long for a narrow card: spans a full row in FormulaStrip. */
  wide?: boolean;
}

export const EQ = {
  label: {
    id: '1.1',
    title: 'Survival label',
    tex: String.raw`y_i \;=\; \mathbf{1}\big\{\, \bar P_i \ge 30\text{k} \,\big\}, \qquad \bar P_i \ge 10\text{k}`,
    note: 'P̄ᵢ is the peak market cap. The only question asked; price is never the target.',
    source: 'services/holder_sampler.py',
  },
  features: {
    id: '1.2',
    title: 'Feature map',
    tex: String.raw`\mathbf{x}_i \;=\; \big(\sin\theta_i,\ \cos\theta_i,\ \mathbf{e}_{\mathrm{dow}_i},\ \log(1+H_i),\ W^{\!\top}\phi(\text{lore}_i)\big), \qquad \theta_i = \tfrac{2\pi h_i}{24}`,
    note: 'Launch hour on a circle, day of week one-hot, holders on a log scale, lore embedded by MiniLM φ and projected to 24 dimensions.',
    source: 'ml/features.py',
  },
  model: {
    id: '2.1',
    title: 'Survival probability',
    tex: String.raw`\hat p(\mathbf{x}) \;=\; \sigma\!\Big(\sum_{m=1}^{400} \eta\, h_m(\mathbf{x})\Big), \qquad \eta = 0.03`,
    note: 'Four hundred shallow trees, each correcting the residue of the last.',
    source: 'ml/trainer.py',
  },
  loss: {
    id: '2.2',
    title: 'Objective',
    tex: String.raw`\mathcal{L} \;=\; -\sum_{i} w_{y_i}\Big[\,y_i \log \hat p_i + (1-y_i)\log(1-\hat p_i)\Big], \qquad w_c = \frac{n}{2n_c}`,
    note: 'Balanced weights, so the rare survivor counts as much as the common stall.',
    source: 'ml/trainer.py',
  },
  auc: {
    id: '2.3',
    title: 'Ranking quality',
    tex: String.raw`\mathrm{AUC} \;=\; \Pr\!\big[\,\hat p(\mathbf{x}^{+}) > \hat p(\mathbf{x}^{-})\,\big]`,
    note: 'The chance a random survivor is ranked above a random stall. A coin scores ½.',
    source: 'ml/trainer.py',
  },
  vc: {
    id: '3.1',
    title: 'Capacity penalty',
    tex: String.raw`\varepsilon \;=\; \sqrt{\frac{d\big(\log\frac{2n}{d}+1\big) + \log\frac{4}{\delta}}{n}}, \qquad \delta = 0.05`,
    note: 'Vapnik–Chervonenkis: how far luck can lift the score of a model with capacity d.',
    source: 'ml/jar_math.py',
  },
  boot: {
    id: '3.2',
    title: 'Bootstrap bound',
    tex: String.raw`\underline{\mathrm{AUC}}_{\,\mathrm{boot}} \;=\; Q_{0.025}\Big(\big\{\mathrm{AUC}(\mathcal{D}^{*}_{b})\big\}_{b=1}^{2000}\Big)`,
    note: 'Resample the data two thousand times; keep the score that 97.5% of worlds beat.',
    source: 'ml/jar_math.py',
  },
  floor: {
    id: '3.3',
    title: 'Proven floor',
    tex: String.raw`\underline{\mathrm{AUC}} \;=\; \min\big\{\,\overline{\mathrm{AUC}} - \varepsilon,\ \ \underline{\mathrm{AUC}}_{\,\mathrm{boot}}\big\}`,
    note: 'The more pessimistic bound is the only number the agent believes.',
    source: 'ml/jar_math.py',
  },
  gates: {
    id: '4.1',
    title: 'Gates',
    tex: String.raw`G \;=\; \bigwedge_{k=1}^{4} g_k, \qquad \begin{aligned} g_1 &: n \ge 2000 & g_3 &: \sigma_{\mathrm{AUC}} < 0.05 \\ g_2 &: n_{+} \ge 200 & g_4 &: \big|\mathrm{AUC}_{\mathrm{cv}} - \mathrm{AUC}_{\mathrm{time}}\big| \le 0.04 \end{aligned}`,
    note: 'Enough data, enough survivors, stable folds, no look-ahead.',
    source: 'ml/jar_math.py',
    wide: true,
  },
  level: {
    id: '4.2',
    title: 'Hourglass level',
    tex: String.raw`\ell \;=\; \min\Big\{\, \operatorname{clip}_{[0,1]}\!\frac{\overline{\mathrm{AUC}} - 0.5}{0.1},\ \ 0.95 + 0.05\,\mathbf{1}_{G} \Big\}`,
    note: 'Until every gate holds, the last grains of sand cannot fall.',
    source: 'ml/jar_math.py',
  },
  choice: {
    id: '4.3',
    title: 'Daily choice',
    tex: String.raw`c^{\star}_{t} \;=\; \operatorname*{arg\,max}_{c \,\in\, \mathcal{C}_t} \ \hat p(c), \qquad |\mathcal{C}_t| = 100`,
    note: 'One hundred ideas per cycle; the one most likely to survive is presented.',
    source: 'api/ideas_endpoints.py',
  },
  commit: {
    id: '4.4',
    title: 'Commitment',
    tex: String.raw`h_c \;=\; \mathrm{SHA256}\big(\,\text{name} \,\|\, \text{lore} \,\|\, \text{hour} \,\|\, \text{run}\,\big)`,
    note: 'Each idea is hashed into an append-only log before anyone sees it.',
    source: 'api/ideas_endpoints.py',
  },
  brier: {
    id: '4.5',
    title: 'Calibration',
    tex: String.raw`\mathrm{BS} \;=\; \frac{1}{N}\sum_{k=1}^{N}\big(\hat p_k - y_k\big)^2`,
    note: 'Every launched prediction is scored against what happened. A coin scores 0.25.',
    source: 'api/launches_endpoints.py',
  },

  // ---- Supporting equations used on individual pages ----
  hourRate: {
    id: 'A.1',
    title: 'Survival by launch hour',
    tex: String.raw`r(h) \;=\; \frac{\sum_i \mathbf{1}\{h_i = h\}\, y_i}{\sum_i \mathbf{1}\{h_i = h\}}`,
    note: 'Share of tokens launched in hour h that went on to reach $30K.',
    source: 'ml/trainer.py',
  },
  lift: {
    id: 'A.2',
    title: 'Word lift',
    tex: String.raw`\mathrm{lift}(w) \;=\; \frac{\Pr[\,y = 1 \mid w \in \text{lore}\,]}{\Pr[\,y = 1\,]}`,
    note: 'How much more often lore containing w survives than the base rate. 1× means no signal.',
  },
  ideaScore: {
    id: 'A.3',
    title: 'Scoring an idea',
    tex: String.raw`\hat p(c) \;=\; \hat p\big(\mathbf{x}(\text{name}_c,\ \text{lore}_c,\ h_c,\ \tilde H)\big), \qquad \tilde H = \operatorname{median}_i H_i`,
    note: 'Holders belong to the market, not the agent, so they are held at the dataset median.',
    source: 'api/ideas_endpoints.py',
    wide: true,
  },
  brierSkill: {
    id: 'A.4',
    title: 'Skill over the base rate',
    tex: String.raw`\mathrm{BSS} \;=\; 1 - \frac{\mathrm{BS}}{\mathrm{BS}_{\text{base}}}, \qquad \mathrm{BS}_{\text{base}} = \bar y\,(1-\bar y)`,
    note: 'Above zero means the predictions beat always guessing the base rate.',
  },
  borel: {
    id: 'A.5',
    title: 'Borel’s monkeys',
    tex: String.raw`\Pr\big[\text{hit within } n \text{ tries}\big] \;=\; 1 - (1-p)^{n} \;\xrightarrow[\;n\to\infty\;]{}\; 1`,
    note: 'Any fixed chance p > 0, repeated forever, happens almost surely.',
    wide: true,
  },
  master: {
    id: '0',
    title: 'The agent',
    tex: String.raw`\text{launch}_t \;=\; c^{\star}_{t} \cdot \mathbf{1}\big\{\, \ell = 1 \,\big\} \qquad \text{where} \quad c^{\star}_{t} = \operatorname*{arg\,max}_{c \in \mathcal{C}_t} \hat p(c)`,
    note: 'The whole agent, in one line.',
  },
} satisfies Record<string, Equation>;
