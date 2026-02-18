let pyodidePromise = null;

const PY_CODE = `
import numpy as np

def simulate_gbm(S0, mu, sigma, T, steps, paths, seed=0):
    rng = np.random.default_rng(int(seed))
    dt = T / steps

    S = np.empty((paths, steps + 1), dtype=float)
    S[:, 0] = S0

    Z = rng.standard_normal((paths, steps))
    drift = (mu - 0.5 * sigma**2) * dt
    diff  = sigma * np.sqrt(dt) * Z

    S[:, 1:] = S0 * np.exp(np.cumsum(drift + diff, axis=1))
    ST = S[:, -1]
    return S, float(ST.mean()), float(ST.std())
import json

def run(params):
    params = params.to_py()  # JsProxy -> dict

    # ensure ints where needed
    params["steps"] = int(params["steps"])
    params["paths"] = int(params["paths"])
    params["seed"]  = int(params.get("seed", 0))

    S, meanST, stdST = simulate_gbm(**params)
    max_plot_paths = min(params["paths"], 80)

    out = {
        "paths": S[:max_plot_paths, :].tolist(),
        "meanST": meanST,
        "stdST": stdST
    }
    return json.dumps(out)
`.trim();

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      if (typeof loadPyodide === "undefined") {
        throw new Error("loadPyodide is undefined. Check script order: pyodide.js must load before main.js");
      }
      const pyodide = await loadPyodide();

      // This is important: ensure numpy is available before importing it
      await pyodide.loadPackage("numpy");

      await pyodide.runPythonAsync(PY_CODE);
      return pyodide;
    })();
  }
  return pyodidePromise;
}

function getParams() {
  return {
    S0: Number(document.getElementById("S0").value),
    mu: Number(document.getElementById("mu").value),
    sigma: Number(document.getElementById("sigma").value),
    T: Number(document.getElementById("T").value),
    steps: Number(document.getElementById("steps").value),
    paths: Number(document.getElementById("paths").value),
    seed: 0
  };
}

function plotPaths(paths) {
  if (typeof Plotly === "undefined") {
    throw new Error("Plotly is undefined. Check that plotly script tag loads before main.js");
  }

  const traces = paths.map((series) => ({
    y: series,
    mode: "lines",
    hoverinfo: "skip"
  }));

  const layout = {
    title: "Geometric Brownian Motion sample paths",
    xaxis: { title: "Step" },
    yaxis: { title: "Price S(t)" },
    margin: { l: 50, r: 20, t: 50, b: 50 },
    showlegend: false
  };

  Plotly.newPlot("plot", traces, layout, { responsive: true });
}

async function runSimulation() {
  const btn = document.getElementById("runBtn");
  btn.disabled = true;
  btn.textContent = "Running...";

  try {
    const pyodide = await getPyodide();
    const params = getParams();

    pyodide.globals.set("js_params", params);

const jsonStr = await pyodide.runPythonAsync("run(js_params)");
const out = JSON.parse(jsonStr);

document.getElementById("meanST").textContent = Number(out.meanST).toFixed(4);
document.getElementById("stdST").textContent = Number(out.stdST).toFixed(4);
plotPaths(out.paths);

    

    
  } catch (err) {
    console.error("Simulation error:", err);
    alert("Simulation error:\n" + (err?.message || String(err)));
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Simulation";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const codeEl = document.getElementById("pycode");
  if (codeEl) codeEl.textContent = PY_CODE;

  const btn = document.getElementById("runBtn");
  if (btn) btn.addEventListener("click", runSimulation);
});
function randn() {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function simulateGBMPath(S0, mu, sigma, T, steps) {
  const dt = T / steps;
  const path = new Array(steps + 1);
  path[0] = S0;

  for (let i = 1; i <= steps; i++) {
    const z = randn();
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt) * z;
    path[i] = path[i - 1] * Math.exp(drift + diffusion);
  }
  return path;
}

function plotOnePath(elId, path) {
  const trace = { y: path, mode: "lines", hoverinfo: "skip" };
  const layout = {
    title: "One GBM sample path",
    xaxis: { title: "Step" },
    yaxis: { title: "S(t)" },
    margin: { l: 50, r: 20, t: 50, b: 50 },
    showlegend: false
  };
  Plotly.react(elId, [trace], layout, { responsive: true });
}

document.addEventListener("DOMContentLoaded", () => {
  const muSlider = document.getElementById("muSlider");
  const sigmaSlider = document.getElementById("sigmaSlider");
  const stepsSlider = document.getElementById("stepsSlider");

  const muVal = document.getElementById("muVal");
  const sigmaVal = document.getElementById("sigmaVal");
  const stepsVal = document.getElementById("stepsVal");

  const regenBtn = document.getElementById("regenBtn");

  if (!muSlider || !sigmaSlider || !stepsSlider || !regenBtn) return;

  const S0 = 100;
  const T = 1;

  function redraw() {
    const mu = Number(muSlider.value);
    const sigma = Number(sigmaSlider.value);
    const steps = Number(stepsSlider.value);

    muVal.textContent = mu.toFixed(2);
    sigmaVal.textContent = sigma.toFixed(2);
    stepsVal.textContent = steps;

    const path = simulateGBMPath(S0, mu, sigma, T, steps);
    plotOnePath("gbmPlot", path);
  }

  // Update on slider move
  muSlider.addEventListener("input", redraw);
  sigmaSlider.addEventListener("input", redraw);
  stepsSlider.addEventListener("input", redraw);

  // Button just regenerates a new random path with same params
  regenBtn.addEventListener("click", redraw);

  // First render
  redraw();
});
