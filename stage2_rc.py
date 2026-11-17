import numpy as np
import matplotlib.pyplot as plt

R = 0.045        # K/W  heatsink to air
C = 2500.0       # J/K  heatsink thermal mass
P = 725.0        # W    constant heat from Stage 1 (at 1500 A)
T_amb = 40.0     # °C   room air

dt = 1.0                          # time step: 1 second
t = np.arange(0, 1000, dt)        # 0 to 999 seconds
T = np.zeros(len(t))              # empty list to fill with temperatures
T[0] = T_amb                      # start at room temperature

for k in range(1, len(t)):
    dTdt = (P - (T[k-1] - T_amb) / R) / C   # how fast it is warming right now
    T[k] = T[k-1] + dTdt * dt               # move forward one second

tau = R * C
T_final = T_amb + P * R
print("time constant tau =", tau, "s")
print("predicted final temperature =", T_final, "C")
print("temperature at t = tau:", round(T[int(tau)], 2), "C")
print("63% of the rise would be:", round(T_amb + 0.632 * (T_final - T_amb), 2), "C")
print("temperature at t = 999 s:", round(T[-1], 2), "C")

plt.plot(t, T, label="Simulated")
plt.axhline(T_final, linestyle="--", color="grey", label="Predicted final")
plt.axvline(tau, linestyle=":", color="red", label="One time constant")
plt.xlabel("Time (s)"); plt.ylabel("Heatsink temperature (°C)")
plt.title("Stage 2: heatsink warming up")
plt.legend(); plt.grid(alpha=0.3)
plt.show()