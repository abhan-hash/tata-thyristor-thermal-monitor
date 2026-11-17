import numpy as np
import matplotlib.pyplot as plt

# ---------------- constants ----------------
VT0 = 0.85
RT = 0.0004
I_RATED = 1500.0
r = np.array([0.0035, 0.0070, 0.0070, 0.0035])
tau = np.array([0.02, 0.15, 0.8, 3.0])
R_cs = 0.006
R_sa = 0.045
C_hs = 2500.0
T_amb = 40.0
dt = 0.1


# ---------------- function 1: fake mill current ----------------
def make_load(minutes, dt, seed=7):
    rng = np.random.default_rng(seed)
    n = int(minutes * 60 / dt)
    pu = np.zeros(n)
    k = 0
    while k < n:
        gap = int(rng.uniform(12, 25) / dt)
        pu[k:k + gap] = 0.12
        k += gap

        roll = int(rng.uniform(70, 100) / dt)
        level = rng.uniform(0.80, 1.00)
        seg = np.full(roll, level)
        seg[:int(2.5 / dt)] = level * rng.uniform(1.35, 1.55)
        end = min(k + roll, n)
        pu[k:end] = seg[:end - k]
        k += roll

    pu = pu * (1 + rng.normal(0, 0.015, n))
    return pu * I_RATED


# ---------------- function 2: current -> heat ----------------
def thyristor_loss(Id):
    return VT0 * Id / 3 + RT * Id**2 / 3


# ---------------- function 3: heat -> temperatures ----------------
def thermal_model(P, dt):
    a = np.exp(-dt / tau)
    a_hs = np.exp(-dt / (R_sa * C_hs))
    P0 = P.mean()
    x = r * P0
    Ts = np.zeros(len(P))
    Tj = np.zeros(len(P))
    Ts[0] = T_amb + R_sa * P0
    Tj[0] = Ts[0] + R_cs * P[0] + x.sum()
    for k in range(1, len(P)):
        x = a * x + r * (1 - a) * P[k - 1]
        target = T_amb + R_sa * P[k - 1]
        Ts[k] = target + (Ts[k - 1] - target) * a_hs
        Tj[k] = Ts[k] + R_cs * P[k] + x.sum()
    return Tj, Ts


# ---------------- main ----------------
Id = make_load(20, dt)
P = thyristor_loss(Id)
Tj, Ts = thermal_model(P, dt)
t = np.arange(len(Id)) * dt

print("Average current :", round(Id.mean()), "A   peak:", round(Id.max()), "A")
print("Time above rated:", round(100 * (Id > I_RATED).mean(), 1), "%")
print("Average loss    :", round(P.mean()), "W   peak:", round(P.max()), "W")
print("Heatsink  avg/max:", round(Ts.mean(), 1), "/", round(Ts.max(), 1), "C")
print("Junction  avg/max:", round(Tj.mean(), 1), "/", round(Tj.max(), 1), "C")
print("Average gap Tj - heatsink:", round((Tj - Ts).mean(), 1), "K")

show = t < 600
tm = t[show] / 60
fig, ax = plt.subplots(3, 1, figsize=(10, 9), sharex=True)
ax[0].plot(tm, Id[show]); ax[0].axhline(I_RATED, color="grey", linestyle="--")
ax[0].set_ylabel("Current (A)"); ax[0].set_title("Mill drive current")
ax[1].plot(tm, P[show], color="darkorange")
ax[1].set_ylabel("Heat in one thyristor (W)")
ax[2].plot(tm, Tj[show], label="Junction", color="red")
ax[2].plot(tm, Ts[show], label="Heatsink", color="grey")
ax[2].axhline(125, color="k", linestyle="--"); ax[2].legend()
ax[2].set_ylabel("Temperature (C)"); ax[2].set_xlabel("Time (min)")
for a_ in ax: a_.grid(alpha=0.3)
plt.tight_layout()
plt.show()