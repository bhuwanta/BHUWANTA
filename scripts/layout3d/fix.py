import json,sys,math,numpy as np, pymupdf as fitz, cv2
from shapely.geometry import Polygon, LineString
from shapely.ops import split
from collections import Counter,defaultdict
raw,pdf,Z,out=sys.argv[1],sys.argv[2],6,sys.argv[3]
D=json.load(open(raw)); labels=np.load(raw+'.labels.npy')
def venture(c):
    if c[1]>1500: return 'JC'
    if c[0]<790 and c[1]>985: return 'VV2'
    return 'VV1'
import pickle
DIVS=[]
for x in pickle.load(open(sys.argv[4],'rb')):
    if 's' in x['type'] and x.get('color') and max(x['color'])<0.3 and 0.3<(x.get('width') or 0)<1.1:
        for it in x['items']:
            if it[0]=='l': DIVS.append(((it[1].x,it[1].y),(it[2].x,it[2].y)))
plots=[]
for p in D['plots']:
    gs=p['glyphs']
    th=p['th']; u=np.array([math.cos(th),math.sin(th)]); n_=np.array([-u[1],u[0]])
    # cluster glyphs by perpendicular offset (separate text lines)
    off=sorted(gs,key=lambda g:np.dot([g['x'],g['y']],n_))
    lines=[[off[0]]]
    for g in off[1:]:
        if np.dot([g['x'],g['y']],n_)-np.dot([lines[-1][-1]['x'],lines[-1][-1]['y']],n_)>1.5: lines.append([g])
        else: lines[-1].append(g)
    if len(lines)==1:
        plots.append(p); continue
    assert len(lines)==2, p['n']
    poly=Polygon(p['poly']); cs=[]
    for ln in lines:
        ln.sort(key=lambda g:np.dot([g['x'],g['y']],u)); cs.append(np.mean([[g['x'],g['y']] for g in ln],0))
    from shapely.geometry import Point
    def side(a,b,c): return np.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
    best=None
    for seg in DIVS:
        a,b=np.array(seg[0]),np.array(seg[1]); m=(a+b)/2
        if not poly.buffer(0.5).contains(Point(*m)): continue
        if side(a,b,cs[0])==side(a,b,cs[1]): continue
        dist=Point(*m).distance(LineString([cs[0],cs[1]]))
        if best is None or dist<best[0]: best=(dist,a,b)
    assert best, p['n']
    _,a,b=best; dv=(b-a)/np.linalg.norm(b-a)
    cut=LineString([a-dv*40,b+dv*40])
    parts=list(split(poly,cut).geoms)
    parts=[min([pp for pp in parts],key=lambda g:g.distance(Point(*c))) for c in cs]
    assert parts[0]!=parts[1]
    for ln,c in zip(lines,cs):
        part=parts[lines.index(ln)]
        q=dict(p); q['n']=''.join(g['d'] for g in ln); q['glyphs']=ln
        q['poly']=[[round(a,2),round(b,2)] for a,b in part.exterior.coords[:-1]]; q['area']=round(part.area,2); q['split']=True
        plots.append(q); print('split',p['n'],'->',q['n'],q['area'])
# text-number plots
d=fitz.open(pdf); pg=d[0]
byLabel={p['label']:p for p in plots if not p.get('split')}
added=0
for w in pg.get_text('words'):
    if not w[4].isdigit(): continue
    cx,cy=(w[0]+w[2])/2,(w[1]+w[3])/2
    L=int(labels[int(cy*Z),int(cx*Z)])
    if L==0:
        win=labels[int(cy*Z)-6:int(cy*Z)+7,int(cx*Z)-6:int(cx*Z)+7]; v=win[win>0]; L=int(Counter(v.tolist()).most_common(1)[0][0]) if len(v) else 0
    assert L and L not in byLabel, (w, L)
    mask=(labels==L).astype(np.uint8)
    cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cnt=max(cnts,key=cv2.contourArea)
    ap=cv2.approxPolyDP(cnt,0.35*Z,True)[:,0,:].astype(float)/Z
    poly=Polygon(ap).buffer(0.4,join_style=2).simplify(0.08)
    # colour from rendered page
    plots.append(dict(n=str(int(w[4])),label=L,color=None,poly=[[round(a,2),round(b,2)] for a,b in poly.exterior.coords[:-1]],
        area=round(poly.area,2),th=0.0,glyphs=[],text=dict(x=round(cx,2),y=round(cy,2),size=round(w[3]-w[1],2))))
    added+=1
print('text plots added',added)
for p in plots:
    p['c']=np.array(p['poly']).mean(0).round(2).tolist(); p['v']=venture(p['c'])
V=defaultdict(list)
for p in plots: V[p['v']].append(p)
for v,ps in V.items():
    ints=[int(p['n']) for p in ps]; c=Counter(ints); s=set(ints)
    print(v,len(ps),'max',max(ints),'dups',[k for k,n in c.items() if n>1],'missing',[i for i in range(1,max(ints)+1) if i not in s])
json.dump(dict(plots=plots,templates=D['templates']),open(out,'w'))
