import os
import math
import random
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
from model import FarmHeatStressLSTM

# Set random seeds for reproducibility
torch.manual_seed(42)
np.random.seed(42)
random.seed(42)

def calculate_thi(temp, hum):
    return (1.8 * temp + 32) - (0.55 - 0.0055 * hum) * (1.8 * temp - 26)

def classify_thai_risk(thi):
    if thi < 76.0:
        return 0 # Normal
    elif thi < 80.0:
        return 1 # Mild
    elif thi < 84.0:
        return 2 # Moderate
    else:
        return 3 # Severe

def generate_thai_farm_sequence(num_hours=144): # 72h lookback + 72h target (3 days forward)
    # Randomize seasonal archetype
    # 0: Summer (Hot & Dry/Moderate), 1: Rainy (Moderate temp & Extreme humidity - Maejo context), 2: Winter
    season_type = random.choice([0, 1, 1, 2]) # Weight rainy season higher for tropical testing
    
    # Static farm parameters
    barn_height = random.uniform(2.4, 4.5)
    roof_type = random.choice([0, 1, 2]) # 0: Tile, 1: Zinc, 2: Metal Sheet
    cooling_type = random.choice([0, 1, 2]) # 0: None, 1: Fan, 2: Fan+Mist
    
    # Base diurnal cycle
    start_hour = random.randint(0, 23)
    
    temps = []
    hums = []
    this = []
    standing_ratios = []
    panting_rates = []
    
    for h in range(num_hours):
        hour_of_day = (start_hour + h) % 24
        # Solar thermal peak at 14:00 (hour 14), lowest at 05:00 (hour 5)
        diurnal_factor = math.cos((hour_of_day - 14) * 2 * math.pi / 24)
        
        if season_type == 0: # Summer
            base_temp = random.uniform(27.0, 31.0)
            amp_temp = random.uniform(6.0, 9.0)
            base_hum = random.uniform(55.0, 65.0)
            amp_hum = random.uniform(15.0, 25.0)
        elif season_type == 1: # Rainy Season (High RH)
            base_temp = random.uniform(25.0, 28.5)
            amp_temp = random.uniform(3.5, 6.0)
            base_hum = random.uniform(75.0, 88.0)
            amp_hum = random.uniform(10.0, 15.0)
        else: # Winter
            base_temp = random.uniform(21.0, 25.0)
            amp_temp = random.uniform(6.0, 8.0)
            base_hum = random.uniform(50.0, 60.0)
            amp_hum = random.uniform(15.0, 20.0)
            
        # Barn structure physics modification (Tikul & Prachum, 2019)
        temp_val = base_temp + (amp_temp * diurnal_factor) + random.gauss(0, 0.4)
        if roof_type == 1 and diurnal_factor > 0: # Zinc roof heats up in afternoon
            temp_val += 1.0 * diurnal_factor
        if barn_height < 3.0: # Poor ventilation
            temp_val += 0.4
        if cooling_type >= 1 and diurnal_factor > 0: # Fans reduce effective heat
            temp_val -= 0.8
            
        hum_val = base_hum - (amp_hum * diurnal_factor) + random.gauss(0, 1.2)
        hum_val = max(35.0, min(98.0, hum_val))
        
        thi_val = calculate_thi(temp_val, hum_val)
        
        # Ethological cow behavior synthesis (Papo et al., 2026; Mylostyvyi, 2026)
        if thi_val < 76.0:
            std_ratio = random.uniform(0.40, 0.52)
            pnt_rate = 0.0
        elif thi_val < 80.0:
            std_ratio = random.uniform(0.50, 0.65)
            pnt_rate = random.uniform(0.0, 0.08)
        elif thi_val < 84.0:
            std_ratio = random.uniform(0.65, 0.82)
            pnt_rate = random.uniform(0.08, 0.25)
        else:
            std_ratio = random.uniform(0.80, 0.95)
            pnt_rate = random.uniform(0.25, 0.60)
            
        temps.append(temp_val)
        hums.append(hum_val)
        this.append(thi_val)
        standing_ratios.append(std_ratio)
        panting_rates.append(pnt_rate)
        
    # Construct 72h Lookback features
    lookback_features = []
    for i in range(72):
        t = temps[i]
        rh = hums[i]
        thi = this[i]
        d_thi = thi - this[i-1] if i > 0 else 0.0
        
        # Accumulated heat hours in rolling 24h
        start_w = max(0, i - 23)
        acc_heat = sum(1.0 for x in this[start_w:i+1] if x >= 76.0)
        
        # Night recovery proxy (hours 0-5)
        night_hours = [this[k] for k in range(max(0, i - 23), i + 1) if (start_hour + k) % 24 < 6]
        night_rec = np.mean(night_hours) if night_hours else thi
        
        curr_h = (start_hour + i) % 24
        h_sin = math.sin(curr_h * 2 * math.pi / 24)
        h_cos = math.cos(curr_h * 2 * math.pi / 24)
        
        lookback_features.append([
            t, rh, thi, d_thi, acc_heat, night_rec, h_sin, h_cos,
            standing_ratios[i], panting_rates[i]
        ])
        
    # Construct 3-day target values (Day +1: 72-96h, Day +2: 96-120h, Day +3: 120-144h)
    targets_thi = []
    targets_milk_loss = []
    targets_risk = []
    
    for day in range(3):
        day_slice = this[72 + day * 24 : 72 + (day + 1) * 24]
        avg_thi = float(np.mean(day_slice))
        # Thai calibrated milk loss (starts at THI > 76.0)
        milk_loss = max(0.0, (avg_thi - 76.0) * 0.45)
        risk_class = classify_thai_risk(avg_thi)
        
        targets_thi.append(avg_thi)
        targets_milk_loss.append(milk_loss)
        targets_risk.append(risk_class)
        
    x_temporal = np.array(lookback_features, dtype=np.float32) # [72, 10]
    x_static = np.array([barn_height, float(roof_type), float(cooling_type)], dtype=np.float32) # [3]
    y_thi = np.array(targets_thi, dtype=np.float32) # [3]
    y_milk = np.array(targets_milk_loss, dtype=np.float32) # [3]
    y_risk = np.array(targets_risk, dtype=np.int64) # [3]
    
    return x_temporal, x_static, y_thi, y_milk, y_risk

class SyntheticFarmDataset(Dataset):
    def __init__(self, size=6000):
        self.data = [generate_thai_farm_sequence() for _ in range(size)]

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        x_temporal, x_static, y_thi, y_milk, y_risk = self.data[idx]
        return (
            torch.tensor(x_temporal),
            torch.tensor(x_static),
            torch.tensor(y_thi),
            torch.tensor(y_milk),
            torch.tensor(y_risk)
        )

def train_and_export():
    print("=" * 65)
    print("🚀 Starting Thai-Calibrated PyTorch Bi-LSTM Pre-training")
    print("=" * 65)
    
    device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"Using device: {device}")
    
    print("Generating synthetic dataset (6,000 samples across Thai weather archetypes)...")
    train_dataset = SyntheticFarmDataset(size=5000)
    val_dataset = SyntheticFarmDataset(size=1000)
    
    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False)
    
    model = FarmHeatStressLSTM(
        time_feature_dim=10,
        static_feature_dim=3,
        hidden_dim=128,
        num_layers=2,
        dropout=0.2
    ).to(device)
    
    huber_loss_fn = nn.SmoothL1Loss()
    ce_loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=15)
    
    num_epochs = 15
    print(f"\nTraining for {num_epochs} epochs...")
    
    for epoch in range(1, num_epochs + 1):
        model.train()
        total_loss = 0.0
        
        for batch in train_loader:
            x_temp, x_stat, y_thi, y_milk, y_risk = [b.to(device) for b in batch]
            
            optimizer.zero_grad()
            pred_thi, pred_milk, risk_logits, _ = model(x_temp, x_stat)
            
            # Multi-Task Loss:
            # 1. THI loss (Huber)
            loss_thi = huber_loss_fn(pred_thi, y_thi)
            # 2. Milk loss (Huber)
            loss_milk = huber_loss_fn(pred_milk, y_milk)
            # 3. Risk Classification Loss (CrossEntropy for 3 days)
            loss_risk = ce_loss_fn(risk_logits.view(-1, 4), y_risk.view(-1))
            
            loss = loss_thi + (loss_milk * 1.5) + (loss_risk * 0.8)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
            total_loss += loss.item()
            
        scheduler.step()
        avg_train_loss = total_loss / len(train_loader)
        
        # Validation
        model.eval()
        val_thi_err = 0.0
        val_milk_err = 0.0
        val_risk_acc = 0.0
        total_val_samples = 0
        
        with torch.no_grad():
            for batch in val_loader:
                x_temp, x_stat, y_thi, y_milk, y_risk = [b.to(device) for b in batch]
                pred_thi, pred_milk, risk_logits, _ = model(x_temp, x_stat)
                
                val_thi_err += torch.sum(torch.abs(pred_thi - y_thi)).item()
                val_milk_err += torch.sum(torch.abs(pred_milk - y_milk)).item()
                
                preds = torch.argmax(risk_logits, dim=-1) # [batch, 3]
                val_risk_acc += torch.sum(preds == y_risk).item()
                total_val_samples += y_thi.numel()
                
        mae_thi = val_thi_err / total_val_samples
        mae_milk = val_milk_err / total_val_samples
        risk_acc = (val_risk_acc / total_val_samples) * 100
        
        if epoch % 3 == 0 or epoch == num_epochs:
            print(f"Epoch [{epoch:2d}/{num_epochs:2d}] - Loss: {avg_train_loss:.4f} | Val MAE THI: {mae_thi:.2f} | Milk MAE: {mae_milk:.2f} kg | Risk Acc: {risk_acc:.1f}%")
            
    print("\n✅ Pre-training completed successfully!")
    
    # Export to ONNX
    weights_dir = Path(__file__).resolve().parents[1] / "app" / "weights"
    weights_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = weights_dir / "farm_lstm.onnx"
    
    print(f"\n📦 Exporting model to ONNX format at: {onnx_path}")
    model.eval()
    model.to("cpu")
    
    dummy_temporal = torch.randn(1, 72, 10, dtype=torch.float32)
    dummy_static = torch.randn(1, 3, dtype=torch.float32)
    
    torch.onnx.export(
        model,
        (dummy_temporal, dummy_static),
        str(onnx_path),
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["x_temporal", "x_static"],
        output_names=["predicted_thi", "predicted_milk_loss", "risk_logits", "attention_weights"],
        dynamic_axes={
            "x_temporal": {0: "batch_size"},
            "x_static": {0: "batch_size"},
            "predicted_thi": {0: "batch_size"},
            "predicted_milk_loss": {0: "batch_size"},
            "risk_logits": {0: "batch_size"},
            "attention_weights": {0: "batch_size"}
        }
    )
    
    file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"🎉 Successfully exported {onnx_path.name} (File size: {file_size_mb:.2f} MB)")
    print("Ready for low-latency inference in Node.js via onnxruntime-node!\n")

if __name__ == "__main__":
    train_and_export()
