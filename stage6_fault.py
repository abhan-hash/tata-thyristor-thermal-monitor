import numpy as np
import matplotlib.pyplot as plt
from model import (make_load, thyristor_loss, foster_rise,
                   I_RATED, R_sa, C_hs, T_amb, dt)

HOURS = 4
T_TRIP = 85.0          # heatsink thermostat setting
WARN, ALARM = 4.0, 8.0 # residual thresholds (K)


def heatsink_general(P, dt, P0, Rsa_t, Ta_t):
    """Heatsink temperature when cooling (Rsa) and ambient can change over time."""
    Ts = np.zeros(len(P))
    Ts[0] = Ta_t[0] + Rsa_t[0] * P0
    for k in range(1, len(P)):
        a = np.exp(-dt / (Rsa_t[k] * C_hs))
        target = Ta_t[k] + Rsa_t[k] * P[k - 1]
        Ts[k] = target + (Ts[k - 1] - target) * a
    return Ts


def smooth(x, dt, tau_f):
    """Exponential smoothing (EWMA): a running average that forgets old values."""
    alpha = 1 - np.exp(-dt / tau_f)
    s = np.zeros(len(x))
    s[0] = x[0]
    for k in range(1, len(x)):
        s[k] = s[k - 1] + alpha * (x[k] - s[k - 1])
    return s


def first_time(t, x, limit):
    idx = np.where(x > limit)[0]
    return None if len(idx) == 0 else t[idx[0]]


def run(Rsa_t, seed):
    rng = np.random.default_rng(seed)
    Id = make_load(HOURS * 60, dt)
    P = thyristor_loss(Id)
    n = len(P)
    Ta = np.full(n, T_amb)

    # real world
    Ts_true = heatsink_general(P, dt, P.mean(), Rsa_t, Ta)
    # what we measure
    Id_meas = Id + rng.normal(0, 0.01 * I_RATED, n)
    Ts_meas = Ts_true + rng.normal(0, 0.3, n)
    Ta_meas = Ta + rng.normal(0, 0.3, n)
    # model of HEALTHY cooling (we deliberately make it 4% off, like real life)
    P_est = thyristor_loss(Id_meas)
    Rsa_pred = np.full(n, R_sa * 0.96)
    Ts_pred = heatsink_general(P_est, dt, P_est.mean(), Rsa_pred, smooth(Ta_meas, dt, 30))
    resid = smooth(Ts_meas - Ts_pred, dt, 60)
    return Ts_true, Ts_meas, Ts_pred, resid


n = int(HOURS * 3600 / dt)
t = np.arange(n) * dt
rsa_healthy = np.full(n, R_sa)
rsa_clog = R_sa + (0.09 - R_sa) * np.clip((t - 3600) / (3 * 3600), 0, 1)   # 1 h -> 4 h

Ts_h, Tm_h, Tp_h, res_h = run(rsa_healthy, 1)
Ts_c, Tm_c, Tp_c, res_c = run(rsa_clog, 2)

skip = int(600 / dt)           # ignore first 10 minutes
print("HEALTHY run: largest residual =", round(res_h[skip:].max(), 2), "K")
print("             false warning?   =", bool((res_h[skip:] > WARN).any()))

tw = first_time(t, res_c, WARN)
ta = first_time(t, res_c, ALARM)
tt = first_time(t, Ts_c, T_TRIP)
print("CLOGGING run:")
print("  warning at   :", None if tw is None else round(tw / 3600, 2), "h")
print("  alarm at     :", None if ta is None else round(ta / 3600, 2), "h")
print("  thermostat trips at:", None if tt is None else round(tt / 3600, 2), "h")
if tw and tt:
    print("  early-warning lead time:", round((tt - tw) / 3600, 2), "h")

fig, ax = plt.subplots(2, 1, figsize=(10, 7), sharex=True)
th = t / 3600
ax[0].plot(th[skip:], Tm_c[skip:], color="grey", linewidth=0.5, label="Measured heatsink")
ax[0].plot(th[skip:], Tp_c[skip:], color="tab:blue", linewidth=0.8, label="Model: healthy prediction")
ax[0].axhline(T_TRIP, color="orange", linestyle="--", label="Thermostat trip")
ax[0].set_ylabel("Heatsink temperature (C)"); ax[0].legend()
ax[1].plot(th[skip:], res_h[skip:], label="Healthy run")
ax[1].plot(th[skip:], res_c[skip:], label="Clogging run")
ax[1].axhline(WARN, color="orange", linestyle="--"); ax[1].axhline(ALARM, color="red", linestyle="--")
ax[1].set_ylabel("Residual (K)"); ax[1].set_xlabel("Time (h)"); ax[1].legend()
for a_ in ax: a_.grid(alpha=0.3)
plt.tight_layout()
plt.show()