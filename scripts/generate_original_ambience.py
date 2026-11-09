"""Original algorithmic environmental sound design; no field recordings or third-party audio."""
import math, subprocess, numpy as np
from scipy.signal import butter, sosfilt
from pathlib import Path
ROOT=Path(__file__).resolve().parent
if ROOT.name == "scripts": ROOT = ROOT.parent  # source is runnable from either release pack
SR=24000
DUR=20
N=SR*DUR
rng=np.random.default_rng(20261109)
t=np.arange(N,dtype=np.float64)/SR

def filt(noise, low=None, high=None):
    if low and high: sos=butter(3,[low,high],btype='bandpass',fs=SR,output='sos')
    elif low:sos=butter(3,low,btype='highpass',fs=SR,output='sos')
    else:sos=butter(3,high,btype='lowpass',fs=SR,output='sos')
    x=sosfilt(sos,noise)
    return x/(np.std(x)+1e-9)

def add_chirp(buf,start,dur,lo,hi,amp,trill=0.):
    a=int(start*SR);m=min(int(dur*SR),len(buf)-a)
    if m<=0:return
    tau=np.arange(m,dtype=np.float64)/SR
    s=np.minimum(1.0,tau/max(.035,dur*.2))*np.minimum(1.0,(dur-tau)/max(.045,dur*.30))
    s=np.maximum(s,0)**1.4
    curve=(tau/dur)
    freq=lo+(hi-lo)*np.sin(np.pi*curve)*0.92+120*np.sin(2*np.pi*(8+trill)*tau)
    freq+=180*np.sin(2*np.pi*(14+trill)*tau)*(0.25+0.75*np.sin(np.pi*curve))
    phase=2*np.pi*np.cumsum(freq)/SR
    wave=np.sin(phase)+.16*np.sin(2*phase+.2)+.075*np.sin(3*phase)
    buf[a:a+m] += amp*s*wave

def seam(x):
    # 80 ms fade eliminates loop edge clicks and tiny MP3 encoder gaps.
    m=int(.08*SR);f=np.sin(np.linspace(0,math.pi/2,m))**2
    x[:m]*=f; x[-m:]*=f[::-1]
    return x

def output(name,x):
    x=seam(np.asarray(x,dtype=np.float64))
    x-=np.mean(x)
    x/=max(1, np.max(np.abs(x))/.94)
    out=(x*32767).astype('<i2')
    targets=('alex','goce') if (ROOT/'alex').exists() and (ROOT/'goce').exists() else ('.',)
    for game in targets:
        dest=ROOT/game/'assets'/'ambience'
        dest.mkdir(parents=True,exist_ok=True)
        p=dest/(name+'.mp3')
        proc=subprocess.run(['ffmpeg','-v','error','-y','-f','s16le','-ar',str(SR),'-ac','1','-i','pipe:0','-codec:a','libmp3lame','-b:a','48k',str(p)],input=out.tobytes(),capture_output=True)
        if proc.returncode:raise RuntimeError(proc.stderr.decode('utf-8','replace'))
        print(p, p.stat().st_size)

# Songbird calls, fine high twitters and warbles amid faint rustling; not a species recording.
birds=np.zeros(N,dtype=np.float64)
for sec in [0.1, 2.4, 4.0, 6.3, 8.2,10.7,12.6,14.1,16.8,18.1]:
    for j in range(int(rng.integers(3,7))):
        start=sec+j*.14+float(rng.uniform(0,.10));dur=float(rng.uniform(.11,.34))
        add_chirp(birds,start,dur,float(rng.uniform(1100,1900)),float(rng.uniform(2100,3400)),float(rng.uniform(.10,.23)),trill=float(rng.uniform(0,5)))
for i in range(20):
    start=float(rng.uniform(0,DUR-.36))
    add_chirp(birds,start,float(rng.uniform(.085,.24)),float(rng.uniform(1700,2800)),float(rng.uniform(2850,4600)),float(rng.uniform(.05,.10)),trill=float(rng.uniform(1,7)))
rustle=filt(rng.normal(size=N),high=950)*(.008+.005*np.sin(2*np.pi*.15*t))
output('songbirds',birds+rustle)

# Gently burbling small stream, no real-world recording.
noise=rng.normal(size=N)
flow=filt(noise,low=75,high=2600)
stream=(.060+.017*np.sin(2*np.pi*.13*t)+.010*np.sin(2*np.pi*.29*t))*flow
stream+=.014*filt(rng.normal(size=N),low=1250,high=6200)
for _ in range(100):
    start=float(rng.uniform(0,DUR-.15));size=float(rng.uniform(.035,.16))
    a=int(start*SR);m=int(size*SR);tau=np.arange(m)/SR
    f=float(rng.uniform(250,710))
    env=np.sin(np.pi*np.arange(m)/m)**2
    stream[a:a+m]+=(.012+.006*rng.random())*env*np.sin(2*np.pi*(f*tau-100*tau*tau))
output('brook',stream)

# Breezy vegetation / highland air, without heavy wind artifacts.
air=filt(rng.normal(size=N),high=1100)
slow=filt(rng.normal(size=N),high=1.8)
slow=(slow-np.min(slow))/(np.ptp(slow)+1e-8)
wind=(.025+.04*slow)*air+.007*filt(rng.normal(size=N),low=300,high=4800)
output('breeze',wind)

# Quiet dusk insects for night routes (not mosquitoes; audio only).
insects=np.zeros(N,dtype=np.float64)
for i in range(40):
    st=float(rng.uniform(0,DUR-.4));dur=float(rng.uniform(.18,.75))
    a=int(st*SR);m=min(int(dur*SR),N-a)
    z=np.arange(m)/SR; f=float(rng.uniform(2700,4000))
    env=np.sin(np.pi*z/dur)**2
    pulse=(.5+.5*np.sin(2*np.pi*float(rng.uniform(15,30))*z))**3
    insects[a:a+m]+=.010*env*pulse*np.sin(2*np.pi*f*z)
insects+=.003*filt(rng.normal(size=N),low=1100,high=5000)
output('dusk-insects',insects*10)
