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

    // clean up if it's a PyProxy
    if (result.destroy) result.destroy();

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
