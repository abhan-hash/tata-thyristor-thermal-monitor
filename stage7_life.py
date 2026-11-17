import numpy as np
import matplotlib.pyplot as plt
import rainflow
from model import make_load, thyristor_loss, thermal_model, dt

# ---------- Part A: a toy example to see what rainflow does ----------
toy = [0, 6, 2, 8, 0]
print("Toy temperature trace:", toy)
for rng_, mean_, count, i0, i1 in rainflow.extract_cycles(toy):
    print(f"  swing = {rng_:4.1f} K   mean = {mean_:4.1f}   count = {count}")

# ---------- Part B: wear model ----------
N_EXP = 5.0                        # Coffin-Manson exponent
A = 1e6 * 50.0 ** N_EXP            # chosen so that a 50 K swing lasts 1,000,000 cycles


def wear(Tj, dt, hours, min_swing=2.0, step=5):
    """Return (damage per hour, cycles per hour, damage share from swings > 20 K)."""
    series = Tj[::step]                                   # one point every 0.5 s
    total, cycles, big = 0.0, 0.0, 0.0
    for swing, mean_, count, i0, i1 in rainflow.extract_cycles(series):
        if swing < min_swing:
            continue
        d = count / (A * swing ** -N_EXP)                 # Miner: damage = n / Nf
        total += d
        cycles += count
        if swing > 20:
            big += d
    return total / hours, cycles / hours, (big / total if total > 0 else 0)


HOURS = 1
Id0 = make_load(HOURS * 60, dt)
results = {}
for factor in [1.0, 1.2, 1.4]:
    P = thyristor_loss(Id0 * factor)
    Tj, Ts = thermal_model(P, dt)
    results[factor] = (wear(Tj, dt, HOURS), Tj.max())

base = results[1.0][0][0]
print()
print("Load   Tj max   cycles/h   damage rate vs healthy   share from swings >20 K")
for factor, ((d, c, share), tjmax) in results.items():
    print(f"{factor:3.1f}x  {tjmax:6.1f} C  {c:8.0f}   {d / base:12.1f} x          {100 * share:5.0f} %")

plt.bar([f"{f}x load" for f in results], [results[f][0][0] / base for f in results],
        color=["tab:green", "tab:orange", "tab:red"])
plt.ylabel("Wear rate relative to healthy")
plt.title("Stage 7: thermal-cycling wear")
plt.grid(alpha=0.3, axis="y")
plt.show()