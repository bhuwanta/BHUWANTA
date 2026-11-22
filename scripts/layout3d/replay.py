import pymupdf as fitz, sys, pickle
src, outpng, zoom = sys.argv[1], sys.argv[2], float(sys.argv[3])
d=fitz.open(src); p=d[0]
paths=p.get_drawings()
pickle.dump(paths, open(outpng+'.paths.pkl','wb'))
def is_text(x):
    r=x['rect']; m=max(r.width,r.height)
    if x['type']!='f': return False
    kinds=[i[0] for i in x['items']]
    return m<5 and ('c' in kinds or len(kinds)>6)
od=fitz.open(); op=od.new_page(width=p.rect.width,height=p.rect.height)
sh=op.new_shape(); n=0
for x in paths:
    if is_text(x): continue
    for it in x['items']:
        if it[0]=='l': sh.draw_line(it[1],it[2])
        elif it[0]=='re': sh.draw_rect(it[1])
        elif it[0]=='qu': sh.draw_quad(it[1])
        elif it[0]=='c': sh.draw_bezier(it[1],it[2],it[3],it[4])
    sh.finish(fill=x.get('fill'), color=x.get('color'), even_odd=x.get('even_odd') or False,
              closePath=bool(x.get('closePath')), width=x.get('width') or 0,
              fill_opacity=x.get('fill_opacity') or 1, stroke_opacity=x.get('stroke_opacity') or 1,
              lineCap=max(x.get('lineCap') or (0,)), lineJoin=int(x.get('lineJoin') or 0), dashes=x.get('dashes'))
    n+=1
sh.commit(); od.save(outpng+'.pdf')
op.get_pixmap(matrix=fitz.Matrix(zoom,zoom), alpha=False).save(outpng)
print('replayed',n,'of',len(paths))
