import numpy as np 
import matplotlib.pyplot as plt 

# this is where you can play around with parametere 
T = 1.0
N = 1000
dt = T/N

t = np.linspace(0, T, N+1)

dW = np.sqrt(dt)*np.random.randn(N)

W = np.zeros(N+1)
W[1:] = np.cumsum(dW)


plt.plot(t, W)
plt.xlabel("Time")
plt.ylabel("W(t)")
plt.title("1D Brownian Motion")
plt.show()


#this still is the most basic 1D BM so in the actual project it is going to be bit more complicated than this but the actual python we can run it on the severe so people can play around with the parametere
#So I am thinking of 2 diffrent type of interaction 1, being where they can drag and drop to interact with the physical phenomina and 2 being where they can actually change parametere to simulate it.

