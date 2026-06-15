"""
Shared path constants for benchmarks. Import after adding benchmarks/ and ROOT to sys.path.
Usage in benchmark script:
  _SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
  _BENCHMARKS = os.path.dirname(_SCRIPT_DIR)
  ROOT = os.path.dirname(_BENCHMARKS)
  sys.path.insert(0, ROOT)
  sys.path.insert(0, os.path.join(ROOT, "OSWorld-main"))
  sys.path.insert(0, _BENCHMARKS)
  from benchmarks.paths import get_results_dir
  default_result_dir = get_results_dir("spm")  # or "fib", "apt", etc.
"""
import os

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
BENCHMARKS_DIR = _THIS_DIR
ROOT = os.path.dirname(_THIS_DIR)
OSWORLD_MAIN = os.path.join(ROOT, "OSWorld-main")
RESULTS_ROOT = os.path.join(ROOT, "results")


def get_results_dir(benchmark_short_name: str) -> str:
    """Return results/<benchmark_short_name> under project root (e.g. results/spm, results/fib)."""
    return os.path.join(RESULTS_ROOT, benchmark_short_name)
