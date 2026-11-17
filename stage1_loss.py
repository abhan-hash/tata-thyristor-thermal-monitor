import numpy as np
import matplotlib.pyplot as plt

# ---- 1. Thyristor constants (placeholders from a typical datasheet) ----
VT0 = 0.85     # volts : fixed voltage drop when conducting
RT = 0.0004    # ohms  : small internal resistance

# ---- 2. Drive current (what the DC motor draws) ----
Id = np.linspace(0, 3000, 301)      # 0 to 3000 A in 301 steps

# ---- 3. Current through ONE thyristor ----
I_avg = Id / 3                      # average current
I_rms_sq = Id**2 / 3                # mean-square current

# ---- 4. Heat produced in ONE thyristor ----
P_fixed = VT0 * I_avg               # part from the fixed voltage drop
P_resist = RT * I_rms_sq            # part from the resistance
P = P_fixed + P_resist

# ---- 5. Print a few points to check ----
for current in [500, 1000, 1500, 2000, 2700]:
    k = int(current / 10)
    print(f"Id = {Id[k]:6.0f} A -> loss = {P[k]:7.1f} W")

# ---- 6. Plot ----
plt.plot(Id, P, label="Total loss", linewidth=2)
plt.plot(Id, P_fixed, "--", label="From VT0 (linear)")
plt.plot(Id, P_resist, "--", label="From rT (squared)")
plt.axvline(1500, color="grey", linestyle=":")
plt.xlabel("Drive current Id (A)")
plt.ylabel("Heat in one thyristor (W)")
plt.title("Stage 1: loss vs current")
plt.legend()
plt.grid(alpha=0.3)
plt.show()