"""
AeroSentinal — Environment Setup Script
=========================================
Installs missing dependencies and configures MLflow experiments.

Usage:
  python scripts/setup_env.py
"""

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def check_and_install_deps():
    """Install missing Python packages."""
    print("=" * 60)
    print("  Checking Python dependencies...")
    print("=" * 60)
    
    requirements_file = PROJECT_ROOT / "requirements.txt"
    
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
        capture_output=True,
        text=True,
    )
    
    if result.returncode == 0:
        print("  ✓ All dependencies installed successfully")
    else:
        print(f"  ⚠ Some installations may have failed:")
        print(result.stderr[-500:] if len(result.stderr) > 500 else result.stderr)
    
    return result.returncode == 0


def setup_mlflow():
    """Create MLflow experiments for each subsystem."""
    print("\n" + "=" * 60)
    print("  Setting up MLflow experiments...")
    print("=" * 60)
    
    try:
        import mlflow
        
        mlflow.set_tracking_uri(str(PROJECT_ROOT / "mlruns"))
        
        experiments = [
            ("engine-bilstm", "BiLSTM+Attention on NASA C-MAPSS for turbofan RUL prediction"),
            ("hydraulics-autoencoder", "1D Conv Autoencoder on UCI Hydraulics for anomaly detection"),
            ("landing-gear-xgboost", "XGBoost classifier for brake wear severity classification"),
            ("apu-random-forest", "Random Forest for APU health scoring vs fleet baseline"),
            ("ecs-attribution", "ECS cross-domain coupling analysis and fault attribution"),
        ]
        
        for name, description in experiments:
            exp = mlflow.get_experiment_by_name(name)
            if exp is None:
                exp_id = mlflow.create_experiment(
                    name,
                    tags={"project": "AeroSentinal", "phase": "prototype"},
                )
                print(f"  ✓ Created experiment: {name} (ID: {exp_id})")
            else:
                print(f"  ✓ Experiment exists: {name} (ID: {exp.experiment_id})")
        
        print(f"\n  MLflow tracking URI: {mlflow.get_tracking_uri()}")
        print(f"  View UI: mlflow ui --port 5000 --backend-store-uri {PROJECT_ROOT / 'mlruns'}")
        return True
        
    except ImportError:
        print("  ⚠ MLflow not installed. Run: pip install mlflow")
        return False
    except Exception as e:
        print(f"  ⚠ MLflow setup error: {e}")
        return False


def verify_environment():
    """Verify all critical packages are importable."""
    print("\n" + "=" * 60)
    print("  Verifying environment...")
    print("=" * 60)
    
    packages = {
        "torch": "PyTorch",
        "sklearn": "scikit-learn",
        "xgboost": "XGBoost",
        "imblearn": "imbalanced-learn",
        "shap": "SHAP",
        "numpy": "NumPy",
        "pandas": "Pandas",
        "scipy": "SciPy",
        "matplotlib": "Matplotlib",
        "seaborn": "Seaborn",
        "onnx": "ONNX",
        "onnxruntime": "ONNX Runtime",
        "fastapi": "FastAPI",
        "uvicorn": "Uvicorn",
        "mlflow": "MLflow",
        "nltk": "NLTK",
        "pytest": "pytest",
    }
    
    all_ok = True
    for module, name in packages.items():
        try:
            mod = __import__(module)
            version = getattr(mod, "__version__", "?")
            print(f"  ✓ {name:20s} {version}")
        except ImportError:
            print(f"  ✗ {name:20s} NOT INSTALLED")
            all_ok = False
    
    # Check CUDA
    try:
        import torch
        cuda = torch.cuda.is_available()
        device = f"CUDA ({torch.cuda.get_device_name(0)})" if cuda else "CPU only"
        print(f"\n  Compute device: {device}")
    except Exception:
        print(f"\n  Compute device: Unknown")
    
    return all_ok


def main():
    print("=" * 60)
    print("  AeroSentinal — Environment Setup")
    print("=" * 60)
    
    # Step 1: Install dependencies
    deps_ok = check_and_install_deps()
    
    # Step 2: Setup MLflow
    mlflow_ok = setup_mlflow()
    
    # Step 3: Verify
    env_ok = verify_environment()
    
    # Summary
    print(f"\n{'='*60}")
    print("  Setup Summary")
    print(f"{'='*60}")
    print(f"  Dependencies: {'✓' if deps_ok else '⚠'}")
    print(f"  MLflow:       {'✓' if mlflow_ok else '⚠'}")
    print(f"  Environment:  {'✓' if env_ok else '⚠'}")
    
    if deps_ok and env_ok:
        print(f"\n  ✓ Environment ready! Next steps:")
        print(f"    1. python scripts/download_data.py")
        print(f"    2. python scripts/generate_synthetic.py")
    else:
        print(f"\n  ⚠ Some components need attention. See errors above.")
    
    return 0 if (deps_ok and env_ok) else 1


if __name__ == "__main__":
    sys.exit(main())
