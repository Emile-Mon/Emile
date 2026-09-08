import math
import numpy as np
from sklearn.metrics import roc_auc_score

def calculate_epsilon_vc(n: int, d: int = 28, delta: float = 0.05) -> float:
    """
    Calculates the Vapnik-Chervonenkis (VC) capacity penalty:
    epsilon = sqrt((d * (ln(2n/d) + 1) + ln(4/delta)) / n)
    """
    if n <= d or n <= 0:
        return 1.0
    
    term1 = d * (math.log(2.0 * n / d) + 1.0)
    term2 = math.log(4.0 / delta)
    val = (term1 + term2) / n
    return math.sqrt(val) if val > 0 else 0.0

def compute_bootstrap_auc_lower(y_true: np.ndarray, y_pred_proba: np.ndarray, n_bootstraps: int = 2000, alpha_percentile: float = 2.5) -> float:
    """
    Computes the 2.5th percentile lower bound of ROC-AUC using 2000 bootstrap resamples.
    """
    n_samples = len(y_true)
    if n_samples < 10:
        return 0.5

    rng = np.random.RandomState(42)
    bootstrapped_scores = []
    
    for _ in range(n_bootstraps):
        indices = rng.randint(0, n_samples, n_samples)
        if len(np.unique(y_true[indices])) < 2:
            continue
        score = roc_auc_score(y_true[indices], y_pred_proba[indices])
        bootstrapped_scores.append(score)
        
    if not bootstrapped_scores:
        return 0.5
        
    return float(np.percentile(bootstrapped_scores, alpha_percentile))

def evaluate_jar_level(
    auc_mean: float,
    auc_std: float,
    n_samples: int,
    n_positive: int,
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    time_split_gap: float,
    d: int = 28,
    target_auc: float = 0.60,
    floor_auc: float = 0.50
) -> dict:
    """
    Evaluates the model performance, VC bound, bootstrap bound, gates, and jar level.
    
    Returns dict with keys:
    - eps_vc: VC capacity penalty
    - floor_vc: auc_mean - eps_vc
    - floor_boot: 2.5th percentile bootstrap lower bound
    - proven_floor: min(floor_vc, floor_boot)
    - raw_jar_level: clamped 0..1 based on proven_floor
    - jar_level: final capped jar level (0.95 if any gate fails)
    - gates: dict of bool gate checks
    - blocked_by: first failing gate name or None
    """
    eps_vc = calculate_epsilon_vc(n_samples, d)
    floor_vc = auc_mean - eps_vc
    floor_boot = compute_bootstrap_auc_lower(y_true, y_pred_proba, n_bootstraps=2000)
    
    proven_floor = min(floor_vc, floor_boot)
    
    # Calculate raw jar level scaled between floor_auc (0.50) and target_auc (0.60)
    raw_jar_level = float(np.clip((proven_floor - floor_auc) / (target_auc - floor_auc), 0.0, 1.0))
    
    # Hard Gates Evaluation
    gates = {
        "n_samples": n_samples >= 2000,
        "n_positive": n_positive >= 200,
        "auc_std": auc_std < 0.05,
        "time_split": time_split_gap <= 0.04
    }
    
    all_passed = all(gates.values())
    blocked_by = None if all_passed else next(k for k, v in gates.items() if not v)
    
    # Cap jar level at 0.95 if any gate fails
    jar_level = raw_jar_level if all_passed else min(raw_jar_level, 0.95)
    
    return {
        "auc_mean": round(float(auc_mean), 4),
        "auc_std": round(float(auc_std), 4),
        "n_samples": n_samples,
        "n_positive": n_positive,
        "capacity_d": d,
        "epsilon_vc": round(float(eps_vc), 4),
        "floor_vc": round(float(floor_vc), 4),
        "auc_boot_lower": round(float(floor_boot), 4),
        "proven_floor": round(float(proven_floor), 4),
        "raw_jar_level": round(float(raw_jar_level), 4),
        "jar_level": round(float(jar_level), 4),
        "gates": gates,
        "blocked_by": blocked_by
    }
