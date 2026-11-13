// Original player sprites. Integer raster shapes keep every native pixel crisp.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  const choices = (ids, colors) => ids.split('|').map((id,i) => ({id, label:id, ...(colors ? {value:colors[i]} : {})}));
  const options = window.CHARACTER_LOOK_OPTIONS = {
    skin:choices('porcelain|light|medium|tan|brown|deep',['#f2d3bd','#e3b896','#c8946c','#a8744d','#835536','#5c3a26']),
    hair:choices('black|dark-brown|brown|auburn|blond|gray',['#1f1b26','#3d2a22','#6e4630','#8c3d26','#d2ac63','#9c9ca8']),
    hairStyle:choices('short|swept|curly|buzz|long-tied'), glasses:choices('none|round|rect'), beard:choices('none|stubble|full'),
    accent:choices('sys|gold|crimson|violet|mint|cyan',['#4da3ff','#d9b45b','#ff5d6c','#b48cff','#5fd38d','#4dd8e0'])
  };
  const defaults = {skin:'medium',hair:'brown',hairStyle:'swept',glasses:'none',beard:'none',accent:'sys'};
  const names=['Engineer','Agent Orchestrator','Systemize Artificer','NikAtNight Rogue','Terminal Mage'];
  const ink='#101322', dark='#20273d', steel='#8ca8bf', light='#e8eef7', gold='#d9b45b';
  const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
  function poly(g,points,c) {
    const ys=points.map(p=>p[1]);
    for(let y=Math.min(...ys);y<=Math.max(...ys);y++) {
      const xs=[];
      points.forEach((a,i)=>{const b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));});
      xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)rect(g,Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,c);
    }
  }
  function line(g,x,y,X,Y,c,w=1) { let dx=Math.abs(X-x),sx=x<X?1:-1,dy=-Math.abs(Y-y),sy=y<Y?1:-1,e=dx+dy;for(;;){rect(g,x,y,w,w,c);if(x===X&&y===Y)break;const q=2*e;if(q>=dy){e+=dy;x+=sx;}if(q<=dx){e+=dx;y+=sy;}} }
  function limb(g,a,b,c,w=5) {line(g,...a,...b,ink,w+2);line(g,a[0]+1,a[1],b[0]+1,b[1],c,w);line(g,a[0]+1,a[1],b[0]+1,b[1],mix(c,light,.3),1);}
  function head(g,x,y,L,expression='neutral',back=false) {
    const s=L.skin,h=L.hair;
    poly(g,[[x+3,y],[x+12,y],[x+15,y+4],[x+15,y+9],[x+17,y+11],[x+15,y+13],[x+14,y+17],[x+7,y+18],[x+3,y+14],[x+1,y+6]],ink);
    poly(g,[[x+4,y+2],[x+12,y+2],[x+14,y+5],[x+14,y+10],[x+16,y+11],[x+14,y+12],[x+13,y+16],[x+8,y+17],[x+4,y+13]],mix(s,'#492c52',.35));
    poly(g,[[x+7,y+3],[x+12,y+3],[x+13,y+6],[x+13,y+10],[x+15,y+11],[x+13,y+12],[x+13,y+14],[x+9,y+15],[x+7,y+12]],s);
    rect(g,x+8,y+5,4,3,mix(s,'#fff0cc',.35));rect(g,x+3,y+10,3,4,s);
    const buzz=L.hairStyle==='buzz';
    poly(g,[[x+2,y+3],[x+5,y],[x+12,y],[x+15,y+3],[x+14,y+(buzz?5:7)],[x+8,y+(buzz?4:5)],[x+6,y+10],[x+3,y+11]],h);
    line(g,x+5,y+2,x+11,y+2,mix(h,'#d6b98c',.35),2);
    if(L.hairStyle==='swept')poly(g,[[x,y+4],[x+4,y-2],[x+11,y-1],[x+15,y+2],[x+10,y+3],[x+7,y+7],[x+5,y+4]],h);
    if(L.hairStyle==='swept'){line(g,x+5,y,x+10,y,mix(h,gold,.3),2);rect(g,x+3,y+2,3,1,mix(h,gold,.2));}
    if(L.hairStyle==='curly')for(const [a,b] of [[2,2],[5,-1],[9,-1],[12,1],[1,6]]) {rect(g,x+a,y+b,4,4,h);rect(g,x+a+1,y+b,2,1,mix(h,gold,.35));}
    if(L.hairStyle==='long-tied'){poly(g,[[x+2,y+5],[x-2,y+8],[x-3,y+19],[x+1,y+16],[x+3,y+9]],h);rect(g,x-1,y+9,3,2,L.accent);}
    if(back){poly(g,[[x+3,y+5],[x+13,y+4],[x+14,y+13],[x+10,y+17],[x+4,y+14]],h);return;}
    if(expression==='hurt'||expression==='blink') {line(g,x+8,y+10,x+10,y+11,ink);line(g,x+13,y+10,x+14,y+9,ink);}
    else {rect(g,x+8,y+9,3,2,light);rect(g,x+10,y+9,1,2,ink);rect(g,x+13,y+9,2,2,ink);if(expression==='determined')line(g,x+8,y+7,x+10,y+8,ink);}
    rect(g,x+12,y+14,2,1,mix(s,'#4b2337',.65));
    if(L.beard!=='none'){poly(g,[[x+6,y+13],[x+9,y+15],[x+14,y+14],[x+13,y+(L.beard==='full'?19:16)],[x+8,y+17]],L.beard==='full'?h:mix(h,s,.5));rect(g,x+11,y+14,3,1,s);}
    if(L.glasses!=='none'){for(const a of [7,12]){rect(g,x+a,y+8,L.glasses==='rect'?4:3,4,ink);rect(g,x+a+1,y+9,2,2,mix(L.accent,light,.7));}line(g,x+5,y+9,x+14,y+9,steel);}
  }
  function familiar(g,x,y,L,n=0) {
    poly(g,[[x+3,y],[x+7,y+2],[x+8,y+6],[x+4,y+10],[x,y+6],[x,y+2]],ink);
    poly(g,[[x+3,y+1],[x+6,y+3],[x+6,y+6],[x+4,y+8],[x+1,y+5],[x+1,y+3]],n===1?gold:L.accent);
    rect(g,x+2,y+4,5,2,dark);rect(g,x+3,y+4,1,1,light);rect(g,x+6,y+4,1,1,light);
  }
  function tome(g,x,y,L,open=0) {
    poly(g,[[x,y+2],[x+9,y],[x+17,y+3],[x+17,y+17],[x+9,y+15],[x,y+18]],ink);
    poly(g,[[x+1,y+3],[x+8,y+2],[x+8,y+14],[x+1,y+16]],'#243f56');
    poly(g,[[x+10,y+2],[x+16,y+4],[x+16,y+15],[x+10,y+13]],'#142b39');
    line(g,x+9,y+1,x+9,y+15,gold);line(g,x+2,y+5,x+4,y+7,L.accent);line(g,x+4,y+7,x+2,y+9,L.accent);
    rect(g,x+5,y+10,2+open%3,1,light);rect(g,x+11,y+6,4,1,L.accent);rect(g,x+11,y+9,3,1,L.accent);rect(g,x+11,y+12,4,1,L.accent);
  }
  // Joint coordinates are keyed poses, shared only for anatomy. Props and cloth follow with a delay.
  const poses={idle:[[0,0,0,0],[0,-1,0,-1],[0,-1,0,0],[0,0,0,1]],attack:[[-2,1,-7,-5],[-4,2,-12,-12],[2,-1,9,-12],[7,1,18,-1],[4,2,12,4],[0,1,2,1]],special:[[0,1,-3,1],[-2,2,-7,-3],[0,-1,-3,-14],[1,-2,8,-20],[2,-1,13,-16],[1,0,9,-10],[0,1,4,-3],[0,0,0,0]],hurt:[[-5,3,-8,4],[-3,2,-5,2]],victory:[[0,0,0,-3],[0,-2,-3,-18],[0,-3,0,-24],[0,-1,3,-22]]};
  function battle(k,L,action,f) {
    const c=canvas(96,80),g=c.getContext('2d'),p=poses[action][f].slice();
    if(k===3&&action==='special'&&f>1&&f<7){p[0]+=[0,0,-2,5,11,7,2,0][f];p[1]+=5;p[2]+=2;p[3]+=9;}
    const [dx,dy,ax,ay]=p;
    const x=31+dx,y=11+dy,accent=L.accent, cloth=[ '#365269','#253557','#79513c','#343453','#293f53'][k];
    const casting=action==='special', strike=action==='attack', hurt=action==='hurt';
    rect(g,25,70,36,2,'#101c2b');rect(g,30,72,26,1,'#101c2b');
    if(k===3&&casting&&f>1&&f<7){const echo=battle(k,L,'idle',0);g.globalAlpha=.18;g.drawImage(echo,-19,1);g.globalAlpha=.32;g.drawImage(echo,-10,2);g.globalAlpha=1;}
    if(k===1||k===3||k===4){const trail=[0,2,4,2,0,-2,-1,0][f];poly(g,[[x+3,y+17],[x+16,y+20],[x+16,y+39],[x+9,y+54],[x-(k===1?10:3)-trail,y+49],[x+2,y+31]],ink);poly(g,[[x+4,y+19],[x+12,y+22],[x+10,y+40],[x-(k===1?8:1)-trail,y+47],[x+4,y+30]],cloth);line(g,x-1-trail,y+47,x+8,y+43,accent);}
    const spread=strike?Math.max(0,dx):hurt?-3:0;
    limb(g,[x+6,y+35],[x+1-spread,y+51],dark,6);limb(g,[x+15,y+36],[x+19+spread,y+51],cloth,6);
    rect(g,x-1-spread,y+52,11,5,ink);rect(g,x+18+spread,y+52,12,5,ink);rect(g,x+19+spread,y+52,8,2,steel);rect(g,x-spread,y+52,7,1,steel);
    if(k===4){poly(g,[[x+3,y+28],[x+21,y+28],[x+27,y+54],[x+11,y+56],[x-3,y+52]],ink);poly(g,[[x+4,y+29],[x+19,y+29],[x+23,y+52],[x+12,y+53],[x+1,y+50]],cloth);line(g,x+7,y+32,x+10,y+50,steel);line(g,x+17,y+31,x+21,y+51,accent);poly(g,[[x+5,y+34],[x+8,y+37],[x+8,y+48],[x+4,y+48]],mix(cloth,steel,.2));}
    limb(g,[x+2,y+21],[x-3,y+34],mix(cloth,ink,.2),5);rect(g,x-3,y+35,5,4,L.skin);
    poly(g,[[x+4,y+17],[x+16,y+17],[x+23,y+23],[x+21,y+36],[x+7,y+40],[x,y+34],[x,y+23]],ink);
    poly(g,[[x+4,y+19],[x+15,y+19],[x+21,y+24],[x+18,y+35],[x+8,y+37],[x+2,y+32],[x+2,y+23]],cloth);
    poly(g,[[x+5,y+19],[x+12,y+20],[x+11,y+34],[x+6,y+34],[x+3,y+26]],mix(cloth,steel,.35));
    line(g,x+7,y+20,x+11,y+26,gold);line(g,x+17,y+20,x+12,y+27,accent,2);
    rect(g,x+4,y+35,16,3,'#47333b');rect(g,x+12,y+35,4,3,gold);
    if(k===0){rect(g,x+1,y+27,20,7,ink);
      const patch=['1.1001..00..1001.1','1.1101.1010.1101.1','1.1011.1110.1011.1','1.1001.1010.1001.1','1.1001.1010.1001.1'];
      patch.forEach((r,j)=>[...r].forEach((v,i)=>{if(v==='1')rect(g,x+2+i,y+28+j,1,1,steel);}));rect(g,x+18,y+34,5,7,'#805d43');}
    if(k===1){line(g,x+3,y+23,x+18,y+30,gold);rect(g,x+4,y+22,3,3,gold);}
    if(k===2){rect(g,x-6,y+20,7,12,'#3a4856');rect(g,x-5,y+21,4,2,gold);line(g,x+4,y+20,x+17,y+35,'#c29158',2);rect(g,x+6,y+32,3,9,gold);rect(g,x+7,y+31,1,4,ink);}
    if(k===3){poly(g,[[x+1,y+17],[x+18,y+18],[x+19,y+23],[x+4,y+24],[x-10-f%3,y+30],[x-7,y+23]],accent);rect(g,x+5,y+21,3,4,gold);rect(g,x+6,y+21,3,3,cloth);}
    if(k===4){poly(g,[[x,y+19],[x+3,y+14],[x+11,y+21],[x+18,y+16],[x+22,y+20],[x+13,y+30]],accent);line(g,x+4,y+17,x+11,y+25,light);}
    rect(g,x+12,y+15,6,5,mix(L.skin,'#493253',.35));
    head(g,x+4+(hurt?-3:0),y-1+(hurt?3:0),L,hurt?'hurt':strike?'determined':'neutral');
    if(k===2){rect(g,x+6,y+3,13,3,'#4b3b32');for(const a of [6,14]){rect(g,x+a,y+2,5,4,gold);rect(g,x+a+1,y+3,3,2,'#77d4de');}}
    const hand=[x+22+ax,y+31+ay];
    limb(g,[x+17,y+21],[x+20+Math.round(ax/2),y+27+Math.round(ay/2)],cloth,5);limb(g,[x+20+Math.round(ax/2),y+27+Math.round(ay/2)],hand,cloth,4);rect(g,hand[0]+1,hand[1]+1,5,4,L.skin);
    if(k===0){const h=[hand[0],Math.max(29,hand[1])]; if(strike&&f>=2&&f<=4){poly(g,[[h[0],h[1]],[h[0]+26,h[1]-5],[h[0]+29,h[1]-2],[h[0]+5,h[1]+4]],steel);line(g,h[0]+5,h[1]+1,h[0]+25,h[1]-3,light);rect(g,h[0]+7,h[1],6,1,dark);}else {poly(g,[[h[0]+3,h[1]-24],[h[0]+7,h[1]-27],[h[0]+10,h[1]-23],[h[0]+7,h[1]],[h[0]+3,h[1]]],steel);line(g,h[0]+5,h[1]-23,h[0]+5,h[1]-4,light);rect(g,h[0]+5,h[1]-16,3,2,dark);}rect(g,h[0],h[1]-1,11,2,gold);}
    if(k===1){line(g,hand[0]+3,hand[1],hand[0]+13,hand[1]-17,light);for(let j=0;j<3;j++){const xx=casting&&f>2?65+j*8:9+j*27,yy=casting&&f>2?12+j*13:1+(j===1?0:4)+(f+j)%3;familiar(g,xx,yy,L,j);if(casting&&f>2&&f<6)line(g,hand[0]+12,hand[1]-15,xx+3,yy+8,mix(accent,ink,.55));}}
    if(k===2){poly(g,[[hand[0]-1,hand[1]-4],[hand[0]+8,hand[1]-4],[hand[0]+12,hand[1]+1],[hand[0]+9,hand[1]+9],[hand[0],hand[1]+8],[hand[0]-4,hand[1]+3]],ink);rect(g,hand[0]-1,hand[1]-2,10,9,gold);rect(g,hand[0]+1,hand[1],6,5,'#65474b');rect(g,hand[0]+3,hand[1]+1,3,3,accent);for(const [a,b] of [[-2,-4],[6,-4],[-4,2],[9,2],[0,7],[6,7]])rect(g,hand[0]+a,hand[1]+b,3,3,steel);
      if(casting&&f>1){const tx=73,ty=52;limb(g,[tx+4,ty+9],[tx-1,ty+17],steel,2);limb(g,[tx+8,ty+9],[tx+14,ty+17],steel,2);rect(g,tx,ty,13,10,ink);rect(g,tx+1,ty+1,11,6,'#86603e');rect(g,tx+3,ty+2,4,3,accent);rect(g,tx+9,ty+3,10,3,steel);if(f===4||f===5)poly(g,[[tx+19,ty+1],[tx+23,ty-2],[tx+21,ty+5],[tx+19,ty+6]],'#ffe0a0');}}
    if(k===3){line(g,hand[0]+3,hand[1],hand[0]+15,hand[1]-10,steel,2);line(g,x-2,y+37,x-10,y+45,light,2);}
    if(k===4)tome(g,68,28-(f%3),L,f);
    if(strike&&f===3&&(k===0||k===3)){poly(g,[[60,14],[76,20],[89,34],[91,45],[82,40],[76,29]],mix(accent,light,.6));line(g,76,21,89,35,light,2);}
    if(strike&&f===3&&(k===1||k===4)){for(let j=0;j<3;j++)poly(g,[[70+j*5,22+j*9],[81+j*3,25+j*9],[74+j*5,28+j*9]],j===1?light:accent);}
    if(strike&&f===3&&k===2){for(const [a,b] of [[76,28],[85,34],[80,44]]){line(g,a,b,a+5,b-3,gold,2);}}
    if(casting&&k===0&&f>2&&f<7){for(let j=0;j<3;j++){rect(g,68+j*5,38-j*8,14,2,accent);rect(g,68+j*5,40-j*8,2,6,accent);} }
    if(casting&&k===4&&f>2&&f<7){for(let j=0;j<3;j++){line(g,69,12+j*6,74,15+j*6,accent);line(g,74,15+j*6,69,18+j*6,accent);rect(g,78,17+j*6,10,1,light);}}
    return c;
  }
  function overworld(k,L,dir,f,idle) {
    const c=canvas(24,28),g=c.getContext('2d');if(dir==='left'){g.translate(24,0);g.scale(-1,1);}const side=dir==='left'||dir==='right',back=dir==='up',b=idle?f:([0,-1,0,-1][f]),step=idle?0:[-1,0,1,0][f];
    rect(g,6,26,13,1,'#101c2b');rect(g,7,21+b+step,4,4,ink);rect(g,14,21+b-step,4,4,ink);
    const col=['#426078','#35486b','#886043','#454266','#365569'][k];
    poly(g,[[7,11+b],[16,11+b],[19,16+b],[18,22+b],[7,23+b],[5,17+b]],ink);
    rect(g,7,13+b,10,8,col);rect(g,8,13+b,3,7,mix(col,steel,.35));rect(g,7,20+b,10,2,gold);
    if(k===1||k===4){poly(g,[[7,13+b],[16,13+b],[20,24],[12,23],[5,24]],col);line(g,7,22,10,22,L.accent);line(g,15,22,18,23,L.accent);}
    rect(g,5,15+b-step,3,5,col);rect(g,5,19+b-step,3,2,L.skin);rect(g,17,15+b+step,3,5,col);rect(g,17,19+b+step,3,2,L.skin);
    if(side){rect(g,6,13+b,3,8,ink);rect(g,8,14+b,3,6,col);}
    // Small head is authored separately, not a resampled battle face.
    poly(g,[[8,2+b],[15,2+b],[18,5+b],[18,10+b],[15,13+b],[9,12+b],[6,8+b],[6,5+b]],ink);
    rect(g,8,4+b,9,6,L.skin);rect(g,10,10+b,6,2,L.skin);rect(g,8,8+b,2,3,mix(L.skin,'#493253',.35));
    const h=L.hair;rect(g,7,3+b,10,L.hairStyle==='buzz'?2:4,h);rect(g,7,6+b,2,3,h);rect(g,9,3+b,5,1,mix(h,gold,.35));
    if(L.hairStyle==='swept'){poly(g,[[6,4+b],[9,1+b],[15,2+b],[17,4+b],[12,6+b]],h);}
    if(L.hairStyle==='curly'){rect(g,7,2+b,3,3,h);rect(g,11,1+b,3,3,h);rect(g,15,2+b,3,3,h);}
    if(L.hairStyle==='long-tied'){rect(g,5,6+b,3,9,h);rect(g,5,9+b,3,1,L.accent);}
    if(back){rect(g,8,5+b,9,6,h);rect(g,10,10+b,5,2,h);rect(g,8,4+b,2,4,mix(h,gold,.25));}else {
      if(side){rect(g,8,6+b,4,5,h);rect(g,17,8+b,2,2,L.skin);}
      rect(g,side?13:10,7+b,1,2,ink);rect(g,16,7+b,1,2,ink);rect(g,14,10+b,2,1,mix(L.skin,'#492435',.6));
      if(L.beard!=='none'){rect(g,10,10+b,6,L.beard==='full'?3:1,L.beard==='full'?h:mix(h,L.skin,.5));}
      if(L.glasses!=='none'){rect(g,9,7+b,8,1,steel);for(const a of [10,15]){rect(g,a,7+b,2,L.glasses==='round'?3:2,ink);rect(g,a,8+b,1,1,light);}}
    }
    if(k===0){rect(g,19,12+b,2,11,steel);rect(g,18,20+b,4,1,gold);if(!back){rect(g,8,15+b,7,3,ink);rect(g,9,16+b,1,1,light);rect(g,11,16+b,1,1,light);rect(g,13,16+b,1,1,light);}}
    if(k===1){for(const [a,z] of [[1,8],[20,5],[19,0]]){rect(g,a,z+(f%2),3,3,L.accent);rect(g,a+1,z+1+(f%2),1,1,light);}rect(g,20,14+b,1,5,light);}
    if(k===2){rect(g,6,3+b,12,2,gold);rect(g,8,3+b,2,2,steel);rect(g,14,3+b,2,2,steel);rect(g,17,16+b,5,6,gold);rect(g,18,18+b,3,2,ink);rect(g,19,18+b,1,1,L.accent);rect(g,4,12+b,3,6,'#596675');}
    if(k===3){rect(g,7,12+b,11,2,L.accent);poly(g,[[7,13+b],[7,17+b],[1,20-step],[3,16+b]],L.accent);rect(g,13,14+b,2,3,gold);rect(g,14,14+b,2,2,col);line(g,4,20+b,2,23,steel);line(g,20,20+b,22,16+b,steel);}
    if(k===4){rect(g,19,11+b,5,7,ink);rect(g,20,12+b,3,5,'#36556b');rect(g,20,13+b,2,1,L.accent);rect(g,21,15+b,2,1,light);}
    rect(g,11,13+b,2,2,L.accent);
    return c;
  }
  function portrait(k,L,e) {
    const c=canvas(32,32),g=c.getContext('2d');poly(g,[[3,32],[5,24],[13,20],[21,20],[29,25],[32,32]],ink);poly(g,[[5,31],[7,25],[14,22],[21,22],[28,26],[30,31]],['#426078','#35486b','#886043','#454266','#365569'][k]);
    line(g,9,24,15,29,L.accent,2);line(g,24,24,19,29,gold,2);head(g,8,4,L,e);
    if(k===2){rect(g,9,7,15,3,gold);rect(g,10,7,4,2,'#9ce3e8');rect(g,19,7,4,2,'#9ce3e8');}
    if(k===3){rect(g,9,24,15,3,L.accent);rect(g,25,27,3,4,gold);rect(g,26,27,3,3,ink);}
    if(k===4){line(g,4,23,9,29,L.accent,2);rect(g,26,15,3,1,L.accent);rect(g,27,18,4,1,L.accent);}
    return c;
  }
  window.buildCharacters=function(look={}) {
    const L={};for(const key of Object.keys(options)){const o=options[key].find(o=>o.id===(look[key]??defaults[key]))||options[key].find(o=>o.id===defaults[key]);L[key]=o.value||o.id;}
    names.forEach((name,k)=>{const group='Characters (GPT) · '+name;const add=(n,frames,fps,note='')=>window.SpriteSheet.add(group,n,frames,{fps,note});
      for(const dir of ['down','left','right','up']){add('Overworld walk '+dir,Array.from({length:4},(_,f)=>overworld(k,L,dir,f,false)),8);add('Overworld idle '+dir,Array.from({length:2},(_,f)=>overworld(k,L,dir,f,true)),2);}
      for(const action of Object.keys(poses))add('Battle '+action,poses[action].map((_,f)=>battle(k,L,action,f)),action==='attack'?10:action==='hurt'?5:6,action==='special'?['Compile a staircase of keycaps.','Dispatch three autonomous familiars.','Deploy a clockwork sentry.','Dash through two fading echoes.','Execute a terminal invocation.'][k]:'');
      add('Portrait',['neutral','determined','hurt','blink'].map(e=>portrait(k,L,e)),2,'Neutral, determined, hurt, blink.');
    });
  };
  window.buildCharacters();
})();
