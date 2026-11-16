#!/usr/bin/env python3
"""Create Glyphbound's original, pixel-perfect 4-direction / 4-frame traveler sheet.
Source artwork is intentionally reproducible and does not use proprietary sprites."""
from PIL import Image, ImageDraw
from pathlib import Path
S=(24,32)
COL={'outline':'#142328','skin':'#ebbb85','skinshade':'#c98a5c','hair':'#44312e','hairlight':'#76513c',
     'shirt':'#527a75','light':'#82b1a2','shade':'#315b60','cloak':'#be6946','cloakhigh':'#df9063',
     'cloakshade':'#8b4837','belt':'#3a332e','buckle':'#f2d69a','pants':'#484e62','pantslight':'#687486',
     'boot':'#3b2b29','bootlight':'#73513f','eye':'#1c2d37','scarf':'#f1cf91','staff':'#72513b'}
def body(direction,frame):
    pic=Image.new('RGBA',S,(0,0,0,0));d=ImageDraw.Draw(pic)
    def R(a,b,c,d_,k):d.rectangle([a,b,c,d_],fill=COL.get(k,k))
    def P(x,y,k):d.point((x,y),fill=COL.get(k,k))
    swing=[0,1,0,-1][frame]
    bob=0 if frame%2==0 else 1
    # feet/legs
    if direction in (0,1):
        L=0 if swing==0 else swing;R(7,22,10,27+max(0,L),'pants');R(13,22,16,27+max(0,-L),'pants');
        R(7,26+max(0,L),11,29+max(0,L),'boot');R(12,26+max(0,-L),16,29+max(0,-L),'boot')
        R(7,26+max(0,L),10,27+max(0,L),'pantslight');R(13,26+max(0,-L),15,27+max(0,-L),'pantslight')
    else:
        R(8,21,13,28+max(0,swing),'pants');R(11,22,16,27+max(0,-swing),'pantslight');
        R(7,27+max(0,swing),13,30+max(0,swing),'boot');R(11,26+max(0,-swing),17,29+max(0,-swing),'boot')
    # trailing cloak silhouette, sways on stride
    lean=swing if direction in (2,3) else 0
    R(6+lean,13+bob,17+lean,25+bob,'cloakshade');R(7+lean,14+bob,16+lean,23+bob,'cloak');
    R(7+lean,16+bob,8+lean,22+bob,'cloakhigh');R(15+lean,17+bob,16+lean,22+bob,'cloakhigh')
    # sleeves swing opposite feet
    if direction in (0,1):
        R(4,15+max(0,-swing),7,22+max(0,-swing),'cloak');R(17,15+max(0,swing),20,22+max(0,swing),'cloak')
        R(4,20+max(0,-swing),6,22+max(0,-swing),'skin');R(18,20+max(0,swing),20,22+max(0,swing),'skin')
        R(8,14+bob,15,22+bob,'shirt');R(9,15+bob,10,20+bob,'light');R(15,16+bob,16,21+bob,'shade')
    elif direction==2:
        R(7,14+bob,15,22+bob,'shirt');R(10,14+bob,14,19+bob,'light');R(5,16+max(0,swing),8,22+max(0,swing),'cloak');R(5,21+max(0,swing),7,23+max(0,swing),'skin')
    else:
        R(8,14+bob,16,22+bob,'shirt');R(9,14+bob,12,19+bob,'light');R(16,16+max(0,swing),19,22+max(0,swing),'cloak');R(17,21+max(0,swing),19,23+max(0,swing),'skin')
    R(7,21+bob,16,23+bob,'belt');R(11,21+bob,12,22+bob,'buckle')
    # neck and expressive hair silhouette
    R(10,12+bob,13,15+bob,'skinshade')
    if direction==1: # back of head
        R(7,5+bob,16,13+bob,'hair');R(7,6+bob,15,11+bob,'hairlight');R(9,11+bob,15,13+bob,'hair');
    elif direction==0: # front
        R(7,5+bob,16,12+bob,'skin');R(8,5+bob,15,11+bob,'skin');R(7,4+bob,16,7+bob,'hair');
        R(8,3+bob,14,5+bob,'hairlight');R(7,6+bob,8,10+bob,'hair');R(15,6+bob,16,10+bob,'hair')
        P(10,9+bob,'eye');P(14,9+bob,'eye');R(10,12+bob,13,12+bob,'skinshade')
    elif direction==2: # left
        R(9,4+bob,16,13+bob,'skin');R(9,3+bob,16,6+bob,'hair');R(13,3+bob,16,10+bob,'hair');
        R(9,7+bob,10,10+bob,'skinshade');P(11,9+bob,'eye');R(8,11+bob,12,12+bob,'skinshade')
    else: # right
        R(7,4+bob,14,13+bob,'skin');R(7,3+bob,14,6+bob,'hair');R(7,3+bob,10,10+bob,'hair');
        R(13,7+bob,14,10+bob,'skinshade');P(12,9+bob,'eye');R(11,11+bob,15,12+bob,'skinshade')
    # scarf gives a highly readable color separation between face and body
    R(8,13+bob,15,15+bob,'scarf');R(9,15+bob,11,18+bob,'scarf')
    if direction==1: R(8,13+bob,15,14+bob,'cloakshade')
    # 1px dark outline for visibility over dense glyph scenery
    opaque=pic.getchannel('A'); border=Image.new('RGBA',S,(0,0,0,0));bpx=border.load();a=opaque.load()
    for y in range(S[1]):
        for x in range(S[0]):
            if a[x,y]:continue
            if any(0<=x+dx<S[0] and 0<=y+dy<S[1] and a[x+dx,y+dy] for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]):bpx[x,y]=(10,22,25,255)
    border.alpha_composite(pic)
    return border
sheet=Image.new('RGBA',(S[0]*4,S[1]*4),(0,0,0,0))
for direction in range(4):
    for frame in range(4):sheet.alpha_composite(body(direction,frame),(frame*S[0],direction*S[1]))
out=Path(__file__).resolve().parents[1]/'assets'/'traveler.png';sheet.save(out,optimize=True)
print('Created',out,sheet.size,out.stat().st_size,'bytes')