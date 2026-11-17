import numpy as np
import matplotlib.pyplot as plt

# ---- 1. Thermal constants (placeholders; later from the datasheet) ----
r = np.array([0.0035, 0.0070, 0.0070, 0.0035])   # K/W : four resistances (sum 0.021)
tau = np.array([0.02, 0.15, 0.8, 3.0])           # s   : their four time constants
R_cs = 0.006                                     # K/W : case -> heatsink contact
R_sa = 0.045                                     # K/W : heatsink -> air
C_hs = 2500.0                                    # J/K : heatsink thermal mass
T_amb = 40.0                                     # C

# ---- 2. Time and heat input ----
dt = 0.1
t = np.arange(0, 300, dt)
P = np.full(len(t), 725.0)                       # steady rolling
P[(t >= 100) & (t < 102.5)] = 1737.0             # 2.5 s bar-entry spike

# ---- 3. Simulation ----
a = np.exp(-dt / tau)                            # one decay factor per RC stage
a_hs = np.exp(-dt / (R_sa * C_hs))               # decay factor for the heatsink

x = r * 725.0                                    # start at steady state
Ts = np.zeros(len(t))
Tj = np.zeros(len(t))
Ts[0] = T_amb + R_sa * 725.0
Tj[0] = Ts[0] + R_cs * P[0] + x.sum()

for k in range(1, len(t)):
    x = a * x + r * (1 - a) * P[k-1]
    target = T_amb + R_sa * P[k-1]
    Ts[k] = target + (Ts[k-1] - target) * a_hs
    Tj[k] = Ts[k] + R_cs * P[k] + x.sum()

# ---- 4. Numbers ----
print("Baseline  Tj =", round(Tj[0], 1), "C   heatsink =", round(Ts[0], 1), "C")
print("Peak      Tj =", round(Tj.max(), 1), "C   at t =", round(t[Tj.argmax()], 1), "s")
print("Tj rise during spike      =", round(Tj.max() - Tj[0], 1), "K")
print("Heatsink rise during spike =", round(Ts.max() - Ts[0], 1), "K")

# ---- 5. Plots ----
fig, ax = plt.subplots(1, 2, figsize=(11, 4))
ax[0].plot(t, Tj, label="Junction")
ax[0].plot(t, Ts, label="Heatsink")
ax[0].set_title("Whole run"); ax[0].legend()
z = (t > 95) & (t < 125)
ax[1].plot(t[z], Tj[z], label="Junction")
ax[1].plot(t[z], Ts[z], label="Heatsink")
ax[1].set_title("Zoom on the 2.5 s spike"); ax[1].legend()
for a_ in ax:
    a_.set_xlabel("Time (s)"); a_.set_ylabel("Temperature (C)"); a_.grid(alpha=0.3)
plt.tight_layout()
plt.show()