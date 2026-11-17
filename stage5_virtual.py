import numpy as np
import matplotlib.pyplot as plt
from model import (make_load, thyristor_loss, foster_rise, thermal_model,
                   R_cs, I_RATED, dt)

rng = np.random.default_rng(1)

# ---- 1. The "real world": we calculate the truth ----
Id = make_load(20, dt)
P = thyristor_loss(Id)
Tj_true, Ts_true = thermal_model(P, dt)

# ---- 2. What the plant can actually measure (with sensor noise) ----
Id_meas = Id + rng.normal(0, 0.01 * I_RATED, len(Id))
Ts_meas = Ts_true + rng.normal(0, 0.3, len(Id))

# ---- 3. The virtual sensor: uses ONLY the measured signals ----
P_est = thyristor_loss(Id_meas)
Tj_est = Ts_meas + R_cs * P_est + foster_rise(P_est, dt, P_est.mean())

# ---- 4. How good is it? ----
err = Tj_est - Tj_true
print("Error mean          :", round(err.mean(), 3), "K")
print("Error std deviation :", round(err.std(), 3), "K")
print("95% of errors below :", round(np.percentile(np.abs(err), 95), 2), "K")
print("Worst error         :", round(np.abs(err).max(), 2), "K")
print("Peak TRUE junction  :", round(Tj_true.max(), 1), "C")
print("Peak ESTIMATED      :", round(Tj_est.max(), 1), "C")
print("Peak heatsink sensor:", round(Ts_meas.max(), 1), "C   <- what a thermostat sees")

# ---- 5. Plots ----
t = np.arange(len(Id)) * dt
z = (t > 300) & (t < 420)
fig, ax = plt.subplots(1, 2, figsize=(12, 4))
ax[0].plot(t[z], Tj_true[z], label="True junction", linewidth=2)
ax[0].plot(t[z], Tj_est[z], label="Virtual sensor", alpha=0.8)
ax[0].plot(t[z], Ts_meas[z], label="Heatsink sensor", color="grey")
ax[0].set_xlabel("Time (s)"); ax[0].set_ylabel("Temperature (C)")
ax[0].legend(); ax[0].grid(alpha=0.3)
ax[1].hist(err, bins=60)
ax[1].set_xlabel("Error: estimate - truth (K)"); ax[1].set_ylabel("Samples")
plt.tight_layout()
plt.show()