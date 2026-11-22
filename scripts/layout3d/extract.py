import sys, pickle, json, math
import numpy as np, cv2
from collections import defaultdict, Counter
from shapely.geometry import Polygon
png=sys.argv[1]; Z=float(sys.argv[2]); out=sys.argv[3]
paths=pickle.load(open(png+'.paths.pkl','rb'))
im=cv2.imread(png)[:,:,::-1].astype(np.int16)  # RGB
H,W,_=im.shape
def col(c): return tuple(round(x,2) for x in c) if c else None
SIG={'llclccll':'1','llcccccccclcccccccccl':'2','lccccccclcccccclcccccccccccc':'3','l'*14:'4',
     'lcccccccllllllccccccc':'5','l'+'c'*23:'6','lllccclccl':'7','c'*32:'8','c'*20:'0'}
def pts(x):
    P=[]
    for it in x['items']:
        for q in it[1:]:
            P.append((q.x,q.y))
    return np.array(P)
glyphs=[]
for x in paths:
    if x['type']!='f': continue
    f=col(x['fill']); r=x['rect']; m=max(r.width,r.height)
    if f not in((0.22,0.21,0.21),(1.0,1.0,1.0),(0.0,0.0,0.0)) or not(1.4<=m<=5): continue
    s=''.join(i[0] for i in x['items'])
    if s in SIG: glyphs.append(dict(d=SIG[s],sig=s,P=pts(x),fill=f,items=x['items']))
# templates: upright instances near the 404..413 column
def near(g,x,y): c=g['P'].mean(0); return abs(c[0]-x)<1.6 and abs(c[1]-y)<1.8
anchors={'4':(954.6,653),'0':(956.8,653),'5':(959,659.3),'6':(959,665.4),'7':(959,671.6),'8':(959,680.3),'1':(957.4,710.6),'2':(959.4,723),'3':(959.5,729.2)}
T={}
for dg,(ax,ay) in anchors.items():
    c=[g for g in glyphs if g['d']==dg and near(g,ax,ay)]
    assert c, dg
    T[dg]=c[0]['P']-c[0]['P'].mean(0)
def kabsch(P,Q):  # find s,R,t: P ~ s R Q + t
    pc=P.mean(0); A=P-pc; B=Q
    U,S_,Vt=np.linalg.svd(B.T@A); D=np.diag([1,np.sign(np.linalg.det(U@Vt))])
    R=(U@D@Vt).T; s=S_.sum()/ (B**2).sum()
    res=np.sqrt(((A - s*(B@R.T))**2).sum(1).mean())/ (s*np.sqrt((B**2).sum(1).mean()))
    return s,math.atan2(R[1,0],R[0,0]),pc,res
for g in glyphs:
    g['s'],g['th'],g['c'],g['res']=kabsch(g['P'],T[g['d']])
glyphs=[g for g in glyphs if g['res']<0.08]
print('glyphs',len(glyphs), Counter(g['d'] for g in glyphs))
# segmentation: quantize colors
pal={}
for x in paths:
    if 'f' in x['type'] and x.get('fill'): pal[col(x['fill'])]=1
PAL=np.array([[int(round(v*255)) for v in c] for c in pal])
NONPLOT={(0.3,0.3,0.31),(1.0,0.99,0.91),(0.0,0.0,0.0),(0.22,0.21,0.21),(0.16,0.16,0.16),(0.14,0.12,0.16)}
cls=np.zeros((H,W),np.int16); best=np.full((H,W),10**6,np.int32)
for i,c in enumerate(pal):
    dd=np.abs(im-np.array([int(round(v*255)) for v in c],np.int16)).sum(2)
    m=dd<best; best[m]=dd[m]; cls[m]=i+1
cls[best>18]=0
plist=list(pal)
for i,c in enumerate(plist):
    if c in NONPLOT: cls[cls==i+1]=0
labels=np.zeros((H,W),np.int32); nl=0; lab_cls={}
for i in np.unique(cls):
    if i==0: continue
    n,lb=cv2.connectedComponents((cls==i).astype(np.uint8),connectivity=4)
    m=lb>0; labels[m]=lb[m]+nl
    for k in range(1,n): lab_cls[nl+k]=plist[i-1]
    nl+=n-1
groups=defaultdict(list)
for g in glyphs:
    px,py=int(g['c'][0]*Z),int(g['c'][1]*Z)
    L=labels[py,px]
    if L==0:  # glyph centre may sit on stroke of digit-gap: search small window
        w=labels[py-3:py+4,px-3:px+4]; v=w[w>0]
        L=Counter(v.tolist()).most_common(1)[0][0] if len(v) else 0
    if L: groups[L].append(g)
def wrap(a): return (a+math.pi)%(2*math.pi)-math.pi
plots=[]; amb=[]
for L,gs in groups.items():
    non69=[g['th'] for g in gs if g['d']!='6']
    if non69:
        th=math.atan2(np.mean(np.sin(non69)),np.mean(np.cos(non69)))
    else:
        th=gs[0]['th'] if abs(gs[0]['th'])<math.pi/2 else wrap(gs[0]['th']+math.pi); amb.append(L)
    for g in gs:
        if g['d']=='6' and abs(wrap(g['th']-th))>math.pi/2: g['d']='9'; g['th']=wrap(g['th']+math.pi)
    u=np.array([math.cos(th),math.sin(th)])
    gs.sort(key=lambda g:g['c']@u)
    num=''.join(g['d'] for g in gs)
    mask=(labels==L).astype(np.uint8)
    cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cnt=max(cnts,key=cv2.contourArea)
    ap=cv2.approxPolyDP(cnt,0.35*Z,True)[:,0,:].astype(float)/Z
    poly=Polygon(ap).buffer(0.4,join_style=2).simplify(0.08)
    plots.append(dict(n=num,label=int(L),color=lab_cls[L],poly=[[round(a,2),round(b,2)] for a,b in poly.exterior.coords[:-1]],
                      area=round(poly.area,2),th=round(th,4),glyphs=[dict(d=g['d'],x=round(g['c'][0],3),y=round(g['c'][1],3),s=round(g['s'],4),th=round(g['th'],4)) for g in gs]))
print('plots',len(plots),'ambiguous69',len(amb))
c=Counter(p['n'] for p in plots); print('dups',[(k,v) for k,v in c.items() if v>1][:40])
tmpl={}
for dg,P in T.items():
    tmpl[dg]=P.tolist()
json.dump(dict(plots=plots,templates=tmpl),open(out,'w'))
np.save(out+'.labels.npy',labels)
