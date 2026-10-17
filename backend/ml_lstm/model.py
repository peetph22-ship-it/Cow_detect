import torch
import torch.nn as nn
import torch.nn.functional as F

class TemporalAttention(nn.Module):
    def __init__(self, hidden_dim: int):
        super(TemporalAttention, self).__init__()
        self.attn = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.Tanh(),
            nn.Linear(hidden_dim // 2, 1)
        )

    def forward(self, lstm_out: torch.Tensor):
        # lstm_out shape: [batch, seq_len (72), hidden_dim (256)]
        scores = self.attn(lstm_out) # [batch, 72, 1]
        weights = F.softmax(scores, dim=1) # [batch, 72, 1]
        context = torch.sum(weights * lstm_out, dim=1) # [batch, hidden_dim]
        # Squeeze weights to [batch, 72] for interpretability
        weights_squeezed = weights.squeeze(-1)
        return context, weights_squeezed

class FarmHeatStressLSTM(nn.Module):
    def __init__(
        self,
        time_feature_dim: int = 11,
        static_feature_dim: int = 3,
        hidden_dim: int = 128,
        num_layers: int = 2,
        dropout: float = 0.2
    ):
        super(FarmHeatStressLSTM, self).__init__()
        
        # 1. Temporal Input Normalization
        self.temporal_norm = nn.LayerNorm(time_feature_dim)
        
        # 2. Bi-directional LSTM for 72-hour Sequence
        self.lstm = nn.LSTM(
            input_size=time_feature_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        
        # 3. Temporal Attention Mechanism
        self.attention = TemporalAttention(hidden_dim * 2)
        
        # 4. Static Farm Metadata Processing (barn_height_m, roof_type_id, cooling_type_id)
        self.static_dense = nn.Sequential(
            nn.Linear(static_feature_dim, 32),
            nn.LayerNorm(32),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # 5. Multimodal Feature Fusion (256 BiLSTM + 32 Static = 288)
        fusion_dim = (hidden_dim * 2) + 32
        self.shared_fc = nn.Sequential(
            nn.Linear(fusion_dim, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(dropout)
        )
        
        # 6. Multi-Output Heads for Day +1, Day +2, Day +3
        # Head 1: Predicted THI for 3 days
        self.thi_head = nn.Linear(128, 3)
        
        # Head 2: Theoretical Milk Yield Loss Proxy (kg/cow/day) for 3 days
        self.milk_loss_head = nn.Linear(128, 3)
        
        # Head 3: Thai Risk Classification (3 days x 4 classes: Normal, Mild, Moderate, Severe)
        self.risk_head = nn.Linear(128, 3 * 4)

    def forward(self, x_temporal: torch.Tensor, x_static: torch.Tensor):
        # x_temporal: [batch, 72, 10]
        # x_static:   [batch, 3]
        
        norm_temporal = self.temporal_norm(x_temporal)
        lstm_out, _ = self.lstm(norm_temporal) # [batch, 72, 256]
        
        context, attn_weights = self.attention(lstm_out) # context: [batch, 256], attn: [batch, 72]
        static_feat = self.static_dense(x_static) # [batch, 32]
        
        fused = torch.cat([context, static_feat], dim=-1) # [batch, 288]
        shared = self.shared_fc(fused) # [batch, 128]
        
        pred_thi = self.thi_head(shared) # [batch, 3]
        pred_milk_loss = F.relu(self.milk_loss_head(shared)) # [batch, 3] (loss >= 0)
        
        risk_raw = self.risk_head(shared) # [batch, 12]
        risk_logits = risk_raw.view(-1, 3, 4) # [batch, 3, 4]
        
        # Return strict tuple for ONNX compatibility
        return pred_thi, pred_milk_loss, risk_logits, attn_weights
