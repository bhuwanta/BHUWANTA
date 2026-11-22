import json,sys,numpy as np,cv2,math
D=json.load(open(sys.argv[1])); Z=float(sys.argv[3]); x0,y0,x1,y1=map(float,sys.argv[4].split(','))
W,H=int((x1-x0)*Z),int((y1-y0)*Z)
im=np.full((H,W,3),(232,252,255),np.uint8)
def P(a): a=np.array(a).reshape(-1,2); return ((a-[x0,y0])*Z*8).astype(np.int32)
def fill(sh,col):
    cv2.fillPoly(im,[P(sh['o'])]+[P(h) for h in sh['h']],col,lineType=cv2.LINE_AA,shift=3)
for g in D['greens']: fill(g,(70,170,40))
for r in D['roads']: fill(r,(80,76,76))
for w in D['water']: fill(w,(240,175,0))
for m in D['marks']: cv2.fillPoly(im,[P(m)],(255,255,255),cv2.LINE_AA,3)
C={'eastNorth':(102,191,230),'corner':(13,110,156),'mortgage':(214,173,186),'road60':(28,158,235),'road100':(69,214,252),'standard':(255,255,255)}
for p in D['plots']:
    cv2.fillPoly(im,[P(p['p'])],C[p['cat']],cv2.LINE_AA,3); cv2.polylines(im,[P(p['p'])],True,(0,0,0),1,cv2.LINE_AA,3)
for p in D['plots']:
    for d,x,y,s,th in p['g']:
        c,sn=math.cos(th),math.sin(th)
        for sh in D['digits'][d]:
            def T(a):
                a=np.array(a).reshape(-1,2); return np.stack([x+s*(c*a[:,0]-sn*a[:,1]), y+s*(sn*a[:,0]+c*a[:,1])],1)
            cv2.fillPoly(im,[P(T(sh['o']))]+[P(T(h)) for h in sh['h']],(40,40,40),cv2.LINE_AA,3)
for t in D['trees']:
    cv2.circle(im,(int((t[0]-x0)*Z),int((t[1]-y0)*Z)),int(t[3]*Z/(4 if t[2]==0 else 6)),(40,120,30),-1,cv2.LINE_AA)
cv2.imwrite(sys.argv[2],im)
