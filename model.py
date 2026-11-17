import numpy as np

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


def thyristor_loss(Id):
    return VT0 * Id / 3 + RT * Id**2 / 3


def foster_rise(P, dt, P0):
    """Temperature rise across the four junction-to-case RC stages."""
    a = np.exp(-dt / tau)
    x = r * P0
    rise = np.zeros(len(P))
    rise[0] = x.sum()
    for k in range(1, len(P)):
        x = a * x + r * (1 - a) * P[k - 1]
        rise[k] = x.sum()
    return rise


def heatsink_temp(P, dt, P0):
    """Heatsink temperature for a given heat trace."""
    a_hs = np.exp(-dt / (R_sa * C_hs))
    Ts = np.zeros(len(P))
    Ts[0] = T_amb + R_sa * P0
    for k in range(1, len(P)):
        target = T_amb + R_sa * P[k - 1]
        Ts[k] = target + (Ts[k - 1] - target) * a_hs
    return Ts


def thermal_model(P, dt):
    """The 'real device': returns true junction and heatsink temperatures."""
    P0 = P.mean()
    Ts = heatsink_temp(P, dt, P0)
    Tj = Ts + R_cs * P + foster_rise(P, dt, P0)
    return Tj, Ts