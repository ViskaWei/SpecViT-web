#!/usr/bin/env python3
"""
Extract data from SpecViT results for interactive web demos.

Extracts:
1. Example spectra (20 diverse examples)
2. Prediction results (SpecViT vs baselines)
3. Per-stellar-type performance metrics
"""

import json
import numpy as np
import pandas as pd
import h5py
from pathlib import Path
from typing import Dict, List

# Paths
BASE_DIR = Path("/home/swei20/SpecViT")
WEB_DIR = Path("/home/swei20/SpecViT-web")
DATA_DIR = BASE_DIR / "data/bosz/z0_mag205/test_10k"
RESULTS_DIR = BASE_DIR / "results"
OUTPUT_DIR = WEB_DIR / "public/data"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def extract_logg_from_h5(h5_path: Path) -> np.ndarray:
    """Extract log g values from HDF5 params table."""
    with h5py.File(h5_path, 'r') as f:
        params_table = f['dataset/params/table'][:]
        # Extract logg from values_block_0
        # Based on typical BOSZ structure, logg is usually one of the first few parameters
        logg = params_table['values_block_0'][:, 1]  # Index 1 is typically logg
    return logg


def load_spectra_sample(h5_path: Path, indices: List[int], limit: int = 20) -> Dict:
    """Load a sample of spectra from HDF5 file."""
    # Sort indices for HDF5 indexing requirement
    indices_sorted = sorted(indices[:limit])
    idx_to_position = {idx: i for i, idx in enumerate(indices_sorted)}

    with h5py.File(h5_path, 'r') as f:
        wavelengths = f['spectrumdataset/wave'][:]
        flux = f['dataset/arrays/flux/value'][indices_sorted]
        params_table = f['dataset/params/table'][:]
        logg = params_table['values_block_0'][indices_sorted, 1]  # log g

    return {
        'wavelengths': wavelengths.tolist(),
        'spectra': [
            {
                'idx': int(idx),
                'flux': flux[idx_to_position[idx]].tolist(),
                'true_logg': float(logg[idx_to_position[idx]])
            }
            for idx in indices[:limit]
        ]
    }


def extract_predictions() -> Dict:
    """Extract prediction results for SpecViT and baselines."""
    # Load SpecViT predictions (has SNR column)
    vit_df = pd.read_csv(RESULTS_DIR / "scaling/vit_1m_predictions_test10k.csv")

    # Load LightGBM predictions (no SNR column)
    lgbm_df = pd.read_csv(RESULTS_DIR / "scaling/lgbm_1m_predictions_test10k.csv")

    # Add SNR from SpecViT to LightGBM (same test set)
    lgbm_df['snr'] = vit_df['snr']

    # Compute R² and MAE
    def compute_metrics(df):
        y_true = df['y_true'].values
        y_pred = df['y_pred'].values
        r2 = 1 - np.sum((y_true - y_pred)**2) / np.sum((y_true - y_true.mean())**2)
        mae = np.mean(np.abs(y_true - y_pred))
        return {'r2': float(r2), 'mae': float(mae)}

    return {
        'specvit': {
            **compute_metrics(vit_df),
            'predictions': vit_df[['y_true', 'y_pred', 'snr']].to_dict(orient='records')[:1000]  # First 1000 for scatter plot
        },
        'lightgbm': {
            **compute_metrics(lgbm_df),
            'predictions': lgbm_df[['y_true', 'y_pred', 'snr']].to_dict(orient='records')[:1000]
        }
    }


def extract_per_stellar_type_metrics() -> Dict:
    """Extract MAE metrics by stellar type (giants, subgiants, dwarfs)."""
    vit_df = pd.read_csv(RESULTS_DIR / "scaling/vit_1m_predictions_test10k.csv")
    lgbm_df = pd.read_csv(RESULTS_DIR / "scaling/lgbm_1m_predictions_test10k.csv")

    def classify_stellar_type(logg):
        if logg < 2.5:
            return 'giants'
        elif logg < 3.5:
            return 'subgiants'
        else:
            return 'dwarfs'

    def compute_mae_by_type(df):
        df['type'] = df['y_true'].apply(classify_stellar_type)
        return {
            stellar_type: float(np.mean(np.abs(group['y_true'] - group['y_pred'])))
            for stellar_type, group in df.groupby('type')
        }

    return {
        'specvit': compute_mae_by_type(vit_df),
        'lightgbm': compute_mae_by_type(lgbm_df)
    }


def select_diverse_examples(h5_path: Path, n_examples: int = 20) -> List[int]:
    """Select diverse examples spanning stellar types."""
    logg = extract_logg_from_h5(h5_path)

    # Stratified sampling: giants, subgiants, dwarfs
    indices = []

    # Giants (log g < 2.5)
    giants = np.where(logg < 2.5)[0]
    if len(giants) > 0:
        indices.extend(np.random.choice(giants, size=min(7, len(giants)), replace=False))

    # Subgiants (2.5 <= log g < 3.5)
    subgiants = np.where((logg >= 2.5) & (logg < 3.5))[0]
    if len(subgiants) > 0:
        indices.extend(np.random.choice(subgiants, size=min(6, len(subgiants)), replace=False))

    # Dwarfs (log g >= 3.5)
    dwarfs = np.where(logg >= 3.5)[0]
    if len(dwarfs) > 0:
        indices.extend(np.random.choice(dwarfs, size=min(7, len(dwarfs)), replace=False))

    return indices[:n_examples]


def main():
    """Extract all data for web demos."""
    print("📊 Extracting data for SpecViT web demos...")

    # 1. Extract diverse spectrum examples
    print("\n1️⃣ Extracting example spectra...")
    h5_path = DATA_DIR / "dataset.h5"
    example_indices = select_diverse_examples(h5_path, n_examples=20)
    spectra_data = load_spectra_sample(h5_path, example_indices)

    # Add predictions to examples
    vit_preds = pd.read_csv(RESULTS_DIR / "scaling/vit_1m_predictions_test10k.csv")
    for i, spectrum in enumerate(spectra_data['spectra']):
        idx = spectrum['idx']
        if idx < len(vit_preds):
            spectrum['pred_logg'] = float(vit_preds.iloc[idx]['y_pred'])
            spectrum['snr'] = float(vit_preds.iloc[idx]['snr'])

    with open(OUTPUT_DIR / "spectra_examples.json", 'w') as f:
        json.dump(spectra_data, f, indent=2)
    print(f"   ✅ Saved {len(spectra_data['spectra'])} examples to spectra_examples.json")

    # 2. Extract prediction comparisons
    print("\n2️⃣ Extracting prediction comparisons...")
    predictions_data = extract_predictions()
    with open(OUTPUT_DIR / "predictions.json", 'w') as f:
        json.dump(predictions_data, f, indent=2)
    print(f"   ✅ SpecViT R²: {predictions_data['specvit']['r2']:.3f}, MAE: {predictions_data['specvit']['mae']:.3f}")
    print(f"   ✅ LightGBM R²: {predictions_data['lightgbm']['r2']:.3f}, MAE: {predictions_data['lightgbm']['mae']:.3f}")

    # 3. Extract per-stellar-type metrics
    print("\n3️⃣ Extracting per-stellar-type metrics...")
    stellar_type_data = extract_per_stellar_type_metrics()
    with open(OUTPUT_DIR / "stellar_type_metrics.json", 'w') as f:
        json.dump(stellar_type_data, f, indent=2)
    print("   ✅ Saved stellar type breakdown:")
    for method in ['specvit', 'lightgbm']:
        print(f"      {method.upper()}:")
        for stype, mae in stellar_type_data[method].items():
            print(f"        - {stype}: MAE = {mae:.3f}")

    print("\n✨ Data extraction complete! Files saved to public/data/")


if __name__ == "__main__":
    np.random.seed(42)  # Reproducible example selection
    main()
