// Original boss studies. All artwork is rasterized at native resolution.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  const ink = '#101325', ivory = '#fff0cb';
  const P = {
    brass: ['#30233e','#715044','#ab794e','#d9b45b','#ffdf91'],
    ice: ['#182849','#31527a','#508eb0','#8bd1db','#dcf4df'],
    jade: ['#172d3d','#28544d','#438675','#81bb91','#d6e7b2'],
    coral: ['#35223f','#71394f','#b55a67','#ec957e','#ffd9a3'],
    violet: ['#231e43','#4b396b','#7a5c9b','#b18dc5','#edc9dd'],
    red: ['#321a32','#702a40','#b84a4c','#ed8064','#ffc88e'],
    steel: ['#19243c','#354562','#61728e','#9faec0','#e8e5db'],
    paper: ['#292744','#655d72','#a99c9c','#dacdb5','#fff0ce'],
    blue: ['#181f45','#2c477b','#447bb4','#73b7e5','#d5eeef'],
  };
  // Integer scan conversion avoids canvas antialiasing, including diagonals.
  function painter(c) {
    const q = c.getContext('2d');
    const r = (x,y,w,h,col) => { q.fillStyle=col; q.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
    const poly = (pts,col) => {
      const ys=pts.map(p=>p[1]);
      for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++) {
        const hits=[];
        for(let i=0,j=pts.length-1;i<pts.length;j=i++) {
          const a=pts[i],b=pts[j];
          if((a[1]>y+.5)!==(b[1]>y+.5)) hits.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));
        }
        hits.sort((a,b)=>a-b);
        for(let i=0;i+1<hits.length;i+=2) r(Math.ceil(hits[i]),y,Math.ceil(hits[i+1])-Math.ceil(hits[i]),1,col);
      }
    };
    const line=(x,y,xx,yy,col,w=1)=>{
      const n=Math.max(Math.abs(xx-x),Math.abs(yy-y));
      for(let i=0;i<=n;i++) r(x+(xx-x)*i/(n||1)-w/2,y+(yy-y)*i/(n||1)-w/2,w,w,col);
    };
    const oval=(x,y,rx,ry,p)=>{
      for(let yy=-ry;yy<=ry;yy++) for(let xx=-rx;xx<=rx;xx++) {
        const d=xx*xx/(rx*rx)+yy*yy/(ry*ry);
        if(d<=1) {
          const rim=d>.84;
          const v=xx/rx*.65+yy/ry*.8;
          r(x+xx,y+yy,1,1,rim?(v<-.65?p[3]:ink):p[v<-.65?4:v<-.22?3:v<.48?2:v<.85?1:0]);
        }
      }
    };
    const plate=(x,y,w,h,p)=>{
      poly([[x+3,y],[x+w-3,y],[x+w,y+3],[x+w,y+h-3],[x+w-3,y+h],[x+3,y+h],[x,y+h-3],[x,y+3]],ink);
      r(x+2,y+2,w-4,h-4,p[2]); r(x+3,y+2,w-6,2,p[4]);r(x+2,y+4,2,h-8,p[3]);
      r(x+w-5,y+4,3,h-7,p[1]);r(x+4,y+h-4,w-8,2,p[0]);
    };
    const gem=(x,y,s,p)=>{
      poly([[x,y-s],[x+s,y],[x,y+s],[x-s,y]],ink);
      poly([[x,y-s+2],[x,y],[x-s+2,y]],p[4]);poly([[x,y-s+2],[x+s-2,y],[x,y]],p[2]);
      poly([[x-s+2,y],[x,y],[x,y+s-2]],p[2]);poly([[x,y],[x+s-2,y],[x,y+s-2]],p[1]);
    };
    const eye=(x,y,p= P.coral)=>{r(x-4,y-2,9,5,ink);r(x-3,y-1,7,3,p[4]);r(x-1,y-1,2,3,p[1]);r(x-3,y-1,1,1,ivory);};
    const check=(x,y,col)=>{line(x,y,x+3,y+3,col,2);line(x+3,y+3,x+9,y-4,col,2);};
    const cross=(x,y,col)=>{line(x-3,y-3,x+3,y+3,col,2);line(x-3,y+3,x+3,y-3,col,2);};
    const chevron=(x,y,col)=>{line(x-4,y-2,x,y+2,col,2);line(x,y+2,x+4,y-2,col,2);};
    const chain=(x,y,xx,yy,p)=>{line(x,y,xx,yy,ink,4);line(x,y,xx,yy,p[1],2);const n=Math.ceil(Math.hypot(xx-x,yy-y)/6);for(let i=0;i<=n;i++)r(x+(xx-x)*i/n,y+(yy-y)*i/n,2,2,p[3]);};
    return {r,poly,line,oval,plate,gem,eye,check,cross,chevron,chain};
  }
  function frame(draw,t,attack) {
    const c=document.createElement('canvas');c.width=128;c.height=112;
    const d=painter(c), bob=attack?0:[0,-1,-2,-1][t], power=attack?[ -1,1,0 ][t]:0;
    draw(d,{t,attack,bob,power,strike:attack&&t===1,wind:attack&&t===0});
    return c;
  }
  function add(boss,n,name,note,draw) {
    for(const attack of [false,true]) window.SpriteSheet.add(`Boss alts (GPT) · ${boss}`,`Alt ${n} · ${name} · ${attack?'attack':'idle'}`,
      Array.from({length:attack?3:4},(_,t)=>frame(draw,t,attack)),{fps:attack?4:6,note});
  }
  const wraith='Stale Access Wraith', dropdown='Three-Life Dropdown', gate='Gate Without Guards';

  add(wraith,1,'Cache Cicada','A fresh cicada emerges while its empty shell still grants access on the other host.',(d,s)=>{
    const {poly,line,oval,plate,eye,check,cross}=d,y=s.bob, spread=s.strike?9:s.wind?-5:[0,2,3,1][s.t];
    // The abandoned host is an intact permission-bearing husk.
    for(const side of [-1,1]) {
      line(67+side*13,66,67+side*27,78,P.brass[1],3);line(67+side*27,78,67+side*29,94,P.brass[3],2);
      poly([[66+side*3,37],[66+side*27,48],[66+side*21,80],[66,91]],P.brass[0]);
      line(66+side*11,49,66+side*17,78,P.brass[2],2);
    }
    oval(66,64,14,24,P.brass);line(66,40,64,85,ink,3);check(68,70,P.jade[4]);
    for(const side of [-1,1]) {
      poly([[60,39+y],[60+side*(40+spread),17+y],[60+side*(35+spread),54+y],[61,71+y]],ink);
      poly([[60,41+y],[60+side*(37+spread),20+y],[60+side*(32+spread),52+y],[61,67+y]],P.ice[1]);
      poly([[60,41+y],[60+side*(35+spread),23+y],[60+side*(22+spread),43+y]],P.ice[3]);
      line(60,42+y,60+side*(30+spread),50+y,P.ice[4]);
      line(60+side*15,35+y,60+side*(25+spread),56+y,P.ice[2]);
      line(57+side*7,23+y,57+side*13,10+y,P.ice[3],2);
    }
    oval(58,49+y,10,24,P.jade);for(let i=0;i<4;i++)line(51,49+i*5+y,64,51+i*5+y,P.jade[0]);
    oval(57,28+y,14,11,P.jade);eye(49,27+y,P.ice);eye(62,27+y,P.ice);
    plate(36,77,17,17,P.ice);cross(44,85,P.coral[3]);
    if(s.strike){line(21,35,8,29,P.ice[4],2);line(23,44,6,47,P.ice[3],2);}
  });
  add(wraith,2,'Desynchronized Hourglass','Two host clocks disagree inside a walking hourglass, one already green while stale red sand still falls.',(d,s)=>{
    const {poly,line,oval,plate,gem,check,cross,r}=d,y=s.bob, lean=s.wind?4:s.strike?-7:0;
    for(const side of [-1,1]){
      line(62+side*18,78,62+side*32,87,P.violet[0],5);line(62+side*32,87,62+side*35,99,P.violet[3],3);
      line(62+side*20,47,62+side*(s.strike?48:33),59,P.brass[0],5);
      gem(62+side*(s.strike?48:33),59,8,P.brass);
    }
    poly([[36+lean,23+y],[88+lean,23+y],[81+lean,43+y],[66+lean,56+y],[82,73+y],[88,89+y],[36,89+y],[42,73+y],[57+lean,56+y],[42+lean,43+y]],ink);
    poly([[40+lean,26+y],[83+lean,26+y],[77+lean,42+y],[63+lean,54+y],[46+lean,41+y]],P.ice[1]);
    poly([[62+lean,58+y],[78,74+y],[82,85+y],[41,85+y],[47,73+y]],P.ice[1]);
    poly([[44+lean,31+y],[78+lean,31+y],[71+lean,43+y],[61+lean,50+y],[51+lean,42+y]],P.coral[2]);
    poly([[43,84+y],[61,66+y],[80,84+y]],P.jade[2]);
    line(49+lean,34+y,72+lean,34+y,P.coral[3],2);
    poly([[61,69+y],[67,77+y],[55,77+y]],P.jade[3]);
    for(let i=0;i<3;i++){line(45+lean+i*3,37+y+i*4,49+lean+i*3,37+y+i*4,P.brass[4]);line(76-i*3,75+y-i*4,79-i*3,75+y-i*4,P.brass[3]);}
    line(62+lean,49+y,62+lean,71+y,P.coral[3],2);r(61+lean,57+s.t*3+y,3,3,P.coral[4]);
    line(44+lean,27+y,48+lean,39+y,P.ice[4],2);line(45,76+y,43,82+y,P.ice[4],2);
    plate(32+lean,15+y,60,12,P.brass);plate(32,85+y,60,11,P.brass);
    oval(44+lean,19+y,9,9,P.jade);check(40+lean,19+y,ivory);oval(80+lean,19+y,9,9,P.red);cross(80+lean,19+y,ivory);
    gem(62,89+y,5,P.violet);
    if(s.strike){for(let i=0;i<4;i++)gem(12+i*8,46+i*7,3,P.coral);}
  });
  add(wraith,3,'Permission Reef','An old cache grows into a coral colony, with three dead branches and a living access pearl that keeps replaying.',(d,s)=>{
    const {line,oval,poly,gem,eye,check}=d, sway=s.strike?-8:s.wind?4:[0,1,3,1][s.t];
    for(const [x,y] of [[39,66],[49,53],[68,54],[77,69]]) {line(60,86,x,y,P.coral[0],11);line(58,84,x-2,y,P.coral[2],7);line(57,81,x-3,y,P.coral[3],2);}
    const branches=[[39,66,24,37],[49,53,48,16],[68,54,83,22],[77,69,101,48]];
    for(let i=0;i<branches.length;i++){
      let [x,y,xx,yy]=branches[i];xx+=sway;
      line(x,y,xx,yy,P.coral[0],10);line(x-2,y,xx-2,yy,P.coral[2],6);line(x-3,y-2,xx-3,yy,P.coral[3],2);
      for(let k=0;k<3;k++) {
        let bx=x+(xx-x)*(k+1)/4,by=y+(yy-y)*(k+1)/4;
        line(bx,by,bx+(i%2?9:-9),by-9,P.coral[1],5);line(bx-1,by,bx+(i%2?8:-10),by-10,P.coral[3],2);
      }
      oval(xx,yy,7,8,i<3?P.steel:P.jade);if(i<3) {line(xx-3,yy-3,xx+3,yy+3,P.steel[0],2);}else check(xx-4,yy,ivory);
    }
    poly([[27,89],[30,72],[46,62],[75,64],[91,80],[96,98],[24,98]],ink);
    poly([[29,93],[35,74],[47,67],[73,68],[87,82],[90,94]],P.violet[1]);
    for(const [x,y,rx] of [[40,83,12],[61,78,17],[79,88,12]])oval(x,y,rx,14,P.coral);
    oval(58,80,16,15,P.ice);eye(55,78,P.violet);line(48,86,64,88,P.ice[0],2);
    for(let i=0;i<3;i++)gem(25+i*28,95,4,P.brass);
    const by=45-s.t*2;oval(59+sway,by,5,5,P.ice);if(s.strike){oval(20,60,8,8,P.ice);check(16,60,P.jade[4]);}
  });
  add(wraith,4,'Split-Signal Beacon','A floating beacon broadcasts success in one direction and stale denial in the other, across two isolated hosts.',(d,s)=>{
    const {poly,line,plate,oval,eye,check,cross,r}=d,y=s.bob;
    const sweep=s.strike?16:s.wind?-5:[0,2,4,2][s.t];
    poly([[53,78+y],[75,78+y],[69,99+y],[64,91+y],[57,102+y]],P.ice[1]);
    poly([[57,79+y],[69,79+y],[63,94+y]],P.ice[4]);
    poly([[49,38+y],[78,38+y],[85,84+y],[41,84+y]],ink);
    poly([[52,41+y],[75,41+y],[81,81+y],[45,81+y]],P.blue[2]);
    poly([[52,41+y],[60,41+y],[55,81+y],[45,81+y]],P.blue[3]);
    for(let i=0;i<3;i++)poly([[49-i*2,50+i*11+y],[78+i,44+i*11+y],[79+i,50+i*11+y],[48-i*2,56+i*11+y]],P.paper[2]);
    plate(39,78+y,49,9,P.brass);plate(42,26+y,43,19,P.brass);r(46,30+y,35,10,ink);
    oval(53,35+y,7,6,P.jade);oval(74,35+y,6,6,P.red);
    poly([[39,25+y],[64,9+y],[88,25+y]],ink);poly([[43,23+y],[64,12+y],[83,23+y]],P.red[2]);line(45,22+y,63,13+y,P.red[4],2);
    line(64,10+y,64,5+y,P.brass[3],2);
    plate(9,38+sweep,22,21,P.jade);check(15,48+sweep,ivory);
    plate(97,44-sweep,22,21,P.red);cross(108,54-sweep,ivory);
    line(32,48+sweep,45,35+y,P.jade[2],2);line(83,35+y,97,54-sweep,P.red[2],2);
    eye(62,64+y,P.ice);
  });
  add(wraith,5,'Replay Gramophone','A haunted gramophone keeps replaying an obsolete access grant from a cracked permission record.',(d,s)=>{
    const {poly,line,oval,plate,gem,eye,check}=d,y=s.bob,reach=s.strike?-9:s.wind?5:0;
    for(const x of [39,82]){line(x,86,x-4,96,P.brass[1],5);gem(x-4,98,5,P.brass);}
    plate(31,61,62,29,P.violet);plate(27,58,70,8,P.brass);
    oval(59,58,26,7,P.steel);oval(59,57,19,4,P.violet);oval(59,57,8,3,P.coral);
    line(59,57,77+s.t,55,P.paper[4]);gem(59,56,3,P.brass);
    line(89,50,88,56,P.brass[0],3);line(88,55,73,60,P.brass[3],2);plate(69,58,7,4,P.steel);
    poly([[81,58],[72,48],[66,38+y],[42+reach,35+y],[36+reach,16+y],[53+reach,19+y],[80,33+y],[88,48],[88,58]],ink);
    poly([[83,57],[76,47],[71,35+y],[50+reach,29+y],[44+reach,20+y],[54+reach,23+y],[77,35+y],[84,48]],P.brass[2]);
    line(83,52,76,36+y,P.brass[4],3);
    poly([[50+reach,20+y],[31+reach,11+y],[18+reach,21+y],[19+reach,43+y],[34+reach,51+y],[53+reach,32+y]],ink);
    poly([[47+reach,22+y],[31+reach,14+y],[21+reach,23+y],[22+reach,41+y],[34+reach,47+y],[49+reach,31+y]],P.brass[3]);
    oval(30+reach,30+y,10,14,P.brass);oval(31+reach,31+y,6,10,P.violet);eye(29+reach,29+y,P.coral);
    plate(39,69,43,14,P.brass);check(47,77,P.jade[4]);line(67,72,74,79,P.coral[3],2);
    line(91,75,104,70,P.brass[3],3);oval(105,69,3,5,P.violet);
    for(let i=0;i<2;i++){const x=15+i*12+s.t%2,y1=52+i*13;gem(x,y1,4,P.ice);line(x+3,y1,x+3,y1-9,P.ice[3],2);}
    if(s.strike){line(9,23,5,18,P.brass[4],2);line(9,35,4,37,P.brass[4],2);}
  });

  add(dropdown,1,'Resolver Matryoshka','Three nesting purchase dolls hide the same region error, with an empty subscription cradle in the smallest.',(d,s)=>{
    const {poly,line,oval,plate,eye,chevron,r}=d;
    const doll=(x,y,w,h,p,small)=>{
      oval(x,y+w*.6,w*.52,w*.6,p);
      poly([[x-w*.4,y+w*.8],[x+w*.4,y+w*.8],[x+w*.65,y+h-5],[x+w*.5,y+h],[x-w*.5,y+h],[x-w*.65,y+h-5]],ink);
      poly([[x-w*.35,y+w*.8],[x+w*.35,y+w*.8],[x+w*.57,y+h-6],[x+w*.45,y+h-3],[x-w*.45,y+h-3],[x-w*.57,y+h-6]],p[2]);
      oval(x-2,y+w*.58,w*.34,w*.35,P.paper);eye(x-3,y+w*.59,P.red);
      plate(x-w*.4,y+h*.57,w*.8,small?13:19,p);chevron(x,y+h*.68,p[4]);
      line(x-w*.45,y+h-7,x+w*.45,y+h-7,p[4],2);
      if(!small){
        poly([[x+w*.29,y+w],[x+w*.35,y+w],[x+w*.52,y+h-8],[x+w*.39,y+h-8]],p[1]);
        line(x-w*.43,y+h*.52,x+w*.43,y+h*.52,p[0],2);
        for(const side of [-1,1]){line(x+side*6,y+h*.43,x+side*10,y+h*.38,p[3],2);}
        chevron(x,y+h*.4,p[4]);
      }
      if(!small)for(const side of [-1,1]){line(x+side*w*.43,y+h*.46,x+side*w*.55,y+h*.71,p[0],3);}
    };
    doll(77,12+s.bob,36,88,P.coral,false);doll(45,s.strike?22:s.wind?44:40,27,61,P.blue,false);doll(s.strike?16:31,69,19,33,P.brass,true);
    r(25+(s.strike?-15:0),90,13,6,ink);line(26+(s.strike?-15:0),94,36+(s.strike?-15:0),94,P.coral[3]);
    if(s.wind)chevron(80,72,P.red[4]);
  });
  add(dropdown,2,'Autofill Pitcher','A carnivorous address flower regrows three dropdown mouths and swallows a payment card before a subscription can form.',(d,s)=>{
    const {poly,line,oval,eye,chevron,plate,r}=d;
    for(const side of [-1,1]){
      poly([[61,91],[61+side*39,76],[61+side*24,97],[61,102]],ink);
      poly([[61,92],[61+side*34,79],[61+side*23,94],[61,99]],P.jade[2]);line(61,96,61+side*29,84,P.jade[4]);
    }
    line(62,93,61,41,P.jade[0],10);line(59,92,58,39,P.jade[3],4);
    const mouths=[[37,48,15],[65,21,19],[91,55,13]];
    mouths.forEach(([x,y,sz],i)=>{
      x+=s.strike?(i===0?-11:3):s.wind?4:([0,1,2,1][s.t]*(i-1));
      line(61,80,x,y+sz,P.jade[1],6);line(59,78,x-2,y+sz,P.jade[3],2);
      oval(x,y+18,sz-3,23,P.violet);oval(x,y,sz,8,P.coral);oval(x,y+1,sz-4,s.strike?7:4,P.violet);
      poly([[x-sz+2,y-3],[x-sz+3,y-13],[x,y-19],[x+sz-2,y-12],[x+sz,y-4],[x+2,y-9]],P.coral[2]);
      line(x-sz+4,y-11,x-1,y-16,P.coral[4],2);
      for(let k=-1;k<=1;k++)poly([[x+k*7-2,y+3],[x+k*7+2,y+3],[x+k*7,y+9]],P.paper[4]);
      chevron(x,y+23,P.violet[4]);
    });
    plate(s.strike?9:18,s.strike?51:73,22,14,P.brass);r(s.strike?12:21,s.strike?55:77,15,3,P.brass[0]);
    eye(59,76,P.brass);
  });
  add(dropdown,3,'Region Ribbon Serpent','A three-headed measuring ribbon disagrees about the same address, marking unique, ambiguous and unknown codes.',(d,s)=>{
    const {poly,line,oval,plate,eye,chevron,r,cross,check}=d;
    const bodies=[[[73,91],[37,94],[24,78],[31,57]],[[73,91],[86,73],[63,57],[61,22]],[[73,91],[100,82],[104,61],[95,43]]];
    bodies.forEach((pts,i)=>{
      const p=[P.brass,P.ice,P.coral][i];
      pts=pts.map(([x,y],j)=>[x+(j===3?(s.strike?-13:s.wind?5:s.bob*(i-1)):0),y]);
      for(let j=0;j<3;j++){line(...pts[j],...pts[j+1],ink,13);line(pts[j][0]-1,pts[j][1]-1,pts[j+1][0]-1,pts[j+1][1]-1,p[2],9);line(pts[j][0]-3,pts[j][1]-3,pts[j+1][0]-3,pts[j+1][1]-3,p[4],2);}
      let [x,y]=pts[3];
      for(let k=0;k<4;k++)line(x-4,y+12+k*5,x+(k%2?0:3),y+12+k*5,p[0]);
      plate(x-15,y-9,27,19,p);eye(x-7,y-2,P.red);chevron(x+5,y+2,p[4]);
      if(i===0)check(x-6,y-15,p[4]);if(i===1){line(x,y-11,x,y-15,p[4],2);line(x,y-15,x-5,y-18,p[4],2);line(x,y-15,x+5,y-18,p[4],2);}if(i===2)cross(x,y-16,p[4]);
    });
    oval(72,90,15,11,P.violet);oval(70,88,7,5,P.brass);line(83,89,96,100,P.violet[3],3);
  });
  add(dropdown,4,'Checkout Jackpot','A slot-machine ogre rerolls three region resolvers while a paid coin falls into an empty subscription tray.',(d,s)=>{
    const {poly,line,oval,plate,eye,chevron,r,gem}=d, y=s.wind?3:s.strike?-3:s.bob;
    for(const x of [40,85]){line(x,87,x,98,P.steel[1],7);plate(x-8,96,17,7,P.steel);}
    plate(30,26+y,66,64,P.violet);plate(35,31+y,55,10,P.brass);
    poly([[38,25+y],[34,14+y],[47,18+y],[61,8+y],[76,18+y],[89,14+y],[86,25+y]],ink);
    poly([[41,23+y],[39,18+y],[48,21+y],[61,12+y],[75,21+y],[85,18+y],[83,23+y]],P.brass[3]);
    for(let i=0;i<3;i++){
      plate(37+i*17,45+y,15,25,P.paper);r(40+i*17,48+y,9,17,P.paper[0]);
      chevron(44+i*17,53+y+(s.strike?i*3:(s.t+i)%3),[P.jade[4],P.brass[4],P.coral[3]][i]);
      line(41+i*17,63+y,47+i*17,63+y,P.paper[3]);
    }
    plate(44,76+y,34,9,P.brass);r(48,78+y,26,5,ink);
    line(97,64+y,108,55+y,P.steel[3],4);line(108,55+y,108,s.strike?76:34,P.steel[3],3);oval(108,s.strike?76:34,6,6,P.red);
    line(28,58+y,17,70,P.violet[3],6);gem(16,75,8,P.brass);
    oval(61,88+(s.t%2)*3,4,5,P.brass);line(61,85+(s.t%2)*3,61,90+(s.t%2)*3,P.brass[0]);
    if(s.strike){line(12,58,5,55,P.brass[4],2);line(19,93,11,99,P.brass[4],2);}
  });
  add(dropdown,5,'Address Origami','Three folded address forms become a sharp paper crane, with the final region field left unresolved.',(d,s)=>{
    const {poly,line,plate,chevron,r,eye}=d,y=s.bob,flap=s.strike?-12:s.wind?8:[0,3,6,3][s.t];
    line(62,75+y,58,99,P.coral[1],3);line(70,75+y,78,98,P.coral[2],3);line(58,99,46,101,P.coral[3],2);line(78,98,87,101,P.coral[3],2);
    poly([[57,56+y],[19,15+flap],[33,66+y],[66,78+y],[105,25-flap],[95,71+y],[70,84+y]],ink);
    poly([[57,59+y],[23,21+flap],[36,65+y],[64,75+y]],P.paper[3]);
    poly([[25,25+flap],[53,58+y],[37,62+y]],P.ice[2]);
    poly([[67,77+y],[101,32-flap],[92,69+y],[70,80+y]],P.paper[4]);
    poly([[69,73+y],[97,38-flap],[83,66+y]],P.violet[2]);
    poly([[61,68+y],[49,43+y],[52,26+y],[42,20+y],[20,36+y],[41,33+y],[41,53+y],[58,80+y]],ink);
    poly([[60,72+y],[46,51+y],[47,30+y],[39,25+y],[25,33+y],[44,31+y],[44,53+y]],P.paper[4]);
    poly([[49,30+y],[45,48+y],[58,67+y],[54,47+y]],P.paper[1]);
    eye(42,29+y,P.violet);
    for(let i=0;i<3;i++){
      line(36+i*3,43+i*5+flap/2,45+i*3,49+i*5+flap/2,P.blue[0]);
      line(85-i*3,52+i*5-flap/3,92-i*3,47+i*5-flap/3,P.violet[0]);
    }
    plate(53,64+y,22,13,P.coral);chevron(64,70+y,P.paper[4]);
    if(s.strike){poly([[13,41],[5,35],[9,48]],P.paper[4]);poly([[20,50],[11,53],[20,58]],P.ice[3]);}
  });

  add(gate,1,'Turnstile Ram','A brass ram admits every claimant through its spinning chest until a process fence stops the next takeover.',(d,s)=>{
    const {poly,line,oval,plate,gem,eye,r}=d,dx=s.strike?-9:s.wind?5:0;
    for(const x of [41,83]){line(x+dx,72,x+dx-3,94,P.steel[0],10);plate(x+dx-12,92,23,10,P.steel);}
    for(const side of [-1,1]){
      oval(63+dx+side*25,30,17,21,P.brass);oval(63+dx+side*26,29,10,14,P.violet);oval(63+dx+side*23,34,6,7,P.brass);
    }
    plate(34+dx,44,59,38,P.steel);
    for(const xx of [39,86])for(const yy of [49,76]){r(xx+dx,yy,3,3,P.brass[3]);r(xx+dx,yy,1,1,ivory);}
    for(const side of [-1,1]){line(63+dx+side*22,56,63+dx+side*22,69,P.steel[0]);line(63+dx+side*19,56,63+dx+side*19,69,P.steel[3]);}
    poly([[44+dx,21],[79+dx,21],[83+dx,44],[63+dx,56],[40+dx,44]],ink);
    poly([[46+dx,24],[76+dx,24],[79+dx,42],[62+dx,51],[43+dx,42]],P.paper[2]);
    poly([[47+dx,24],[60+dx,24],[56+dx,43],[44+dx,40]],P.paper[4]);eye(50+dx,35,P.red);eye(71+dx,35,P.red);
    plate(53+dx,44,20,8,P.brass);r(57+dx,47,3,2,ink);r(66+dx,47,3,2,ink);
    oval(63+dx,66,15,14,P.violet);
    const a=(s.attack?[.4,1.6,2.1][s.t]:s.t*.13);
    for(let k=0;k<3;k++){
      const angle=a+k*Math.PI*2/3,x=63+dx+Math.cos(angle)*23,y=66+Math.sin(angle)*20;
      line(63+dx,66,x,y,ink,7);line(63+dx,65,x,y-1,P.brass[3],4);gem(x,y,4,P.brass);
    }
    gem(63+dx,66,6,P.coral);
    if(s.strike){line(15,67,4,63,P.brass[4],2);line(17,79,5,84,P.brass[3],2);}
  });
  add(gate,2,'Semaphore Heron','A two-signal heron lets workers pass on mismatched flags; both wings must agree before dispatch.',(d,s)=>{
    const {poly,line,oval,plate,gem,eye,check,cross}=d,y=s.bob;
    line(58,73+y,52,99,P.brass[1],3);line(69,74+y,74,98,P.brass[1],3);line(52,99,40,101,P.brass[3],2);line(74,98,85,100,P.brass[3],2);
    const left=s.strike?63:s.wind?29:39+s.bob,right=s.strike?29:42-s.bob;
    line(59,53+y,26,left,ink,7);line(59,52+y,26,left-1,P.brass[3],4);
    line(68,53+y,98,right,ink,7);line(68,52+y,98,right-1,P.brass[3],4);
    plate(9,left-17,24,24,P.jade);check(16,left-5,ivory);plate(94,right-17,24,24,P.red);cross(106,right-5,ivory);
    poly([[48,48+y],[70,40+y],[80,62+y],[69,80+y],[55,75+y]],ink);
    poly([[50,49+y],[68,44+y],[76,62+y],[67,76+y],[57,72+y]],P.blue[2]);
    for(let i=0;i<3;i++)poly([[52+i*5,50+y],[56+i*5,48+y],[61+i*5,68+y],[58+i*5,73+y]],P.blue[i%2?3:1]);
    line(64,45+y,70,29+y,P.paper[0],9);line(62,43+y,67,28+y,P.paper[2],3);line(70,29+y,62,19+y,P.paper[2],8);line(67,28+y,60,20+y,P.paper[4],2);
    oval(60,18+y,11,8,P.paper);poly([[51,18+y],[29,25+y],[53,23+y]],P.brass[2]);line(34,23+y,51,21+y,P.brass[4]);eye(59,17+y,P.red);
    poly([[63,11+y],[73,6+y],[68,16+y]],P.red[3]);gem(65,57+y,5,P.brass);
  });
  add(gate,3,'Airlock Nautilus','A pressure-shell nautilus exposes both airlock doors at once, carrying a worker that should have waited for its predecessor.',(d,s)=>{
    const {poly,line,oval,plate,eye,r}=d,y=s.bob;
    for(let i=0;i<5;i++){
      const xx=32+i*13,yy=91+(i%2)*8;
      line(65,72+y,xx,yy,P.ice[0],8);line(65,71+y,xx-2,yy-2,P.ice[2],5);line(xx-2,yy-2,xx-9,yy+1+s.t%2,P.ice[3],3);
    }
    oval(69,49+y,35,38,P.coral);oval(70,47+y,27,29,P.brass);oval(72,47+y,20,22,P.coral);oval(73,48+y,13,14,P.violet);oval(74,47+y,6,7,P.brass);
    for(let i=0;i<7;i++){
      let a=i*.62-1.9;line(69+Math.cos(a)*28,49+y+Math.sin(a)*30,69+Math.cos(a)*33,49+y+Math.sin(a)*36,P.coral[0],2);
    }
    const open=s.strike?10:s.wind?0:3;
    plate(31-open,39+y,14,35,P.steel);plate(49+open,39+y,14,35,P.steel);r(43-open,43+y,7+open*2,26,ink);
    oval(47,60+y,6,8,P.ice);eye(45,57+y,P.red);
    for(let i=0;i<3;i++)r(34-open,45+i*8+y,6,3,P.jade[3]);
    line(32,70+y,22,84,P.ice[3],5);line(22,84,9,81+(s.strike?-8:0),P.ice[2],4);
    line(33,60+y,18,57+y,P.ice[3],4);oval(17,55+y,5,5,P.ice);eye(16,54+y,P.red);
    if(s.strike){poly([[11,46],[3,40],[5,52]],P.ice[4]);}
  });
  add(gate,4,'Lease Loom Spider','A loom spider assigns overlapping workspace ribbons until each dispatch holds its own lease.',(d,s)=>{
    const {poly,line,oval,plate,gem,eye,chevron,r}=d,y=s.bob;
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const x=64+side*(37+i*3),yy=28+i*19+(s.strike?(i%2?-8:8):s.t%2*2);
      line(64+side*15,44+i*9+y,x,yy,ink,6);line(64+side*15,43+i*9+y,x,yy-1,P.violet[3],3);
      line(x,yy,x+side*9,yy+13,ink,4);line(x,yy,x+side*9,yy+13,P.brass[3],2);
    }
    plate(42,18+y,44,66,P.brass);r(48,24+y,31,52,P.violet[0]);
    for(let i=0;i<5;i++)line(50+i*6,25+y,50+i*6,75+y,P.paper[1]);
    for(let i=0;i<4;i++){const xx=49+(i%2?7:0);r(xx,32+i*10+y,23,4,[P.ice[2],P.coral[2]][i%2]);r(xx,32+i*10+y,23,1,[P.ice[4],P.coral[4]][i%2]);}
    const shuttle=s.strike?23:s.wind?70:51+s.t*4;plate(shuttle,49+y,24,8,P.paper);gem(shuttle+11,53+y,3,P.coral);
    oval(64,85+y,20,15,P.violet);eye(54,82+y,P.coral);eye(69,82+y,P.coral);eye(61,91+y,P.brass);
    for(const x of [49,78]){oval(x,17+y,6,8,P.ice);line(x-3,13+y,x+3,13+y,P.ice[0]);line(x-3,20+y,x+3,20+y,P.ice[0]);}
    poly([[51,97+y],[57,100+y],[54,106+y]],P.brass[3]);poly([[72,97+y],[66,100+y],[69,106+y]],P.brass[3]);
  });
  add(gate,5,'Claim-Fencing Gauntlets','Two disembodied claimants reach for one workspace seal, while the predecessor still grips its process tether.',(d,s)=>{
    const {poly,line,plate,gem,oval,chain,r}=d,grip=s.strike?10:s.wind?-4:[0,1,2,1][s.t];
    chain(96,12,94-grip,29,P.coral);chain(28,14,33+grip,27,P.ice);
    const hand=(x,y,side,p)=>{
      plate(x-11,y,23,17,p);plate(x-13,y+15,27,24,p);
      for(let i=0;i<4;i++) {
        const xx=x-11+i*6,yy=y+34+(i===0||i===3?0:4);
        const len=s.strike?10:s.wind?19:17;plate(xx,yy,6,len,p);r(xx+2,yy+5,3,1,p[0]);r(xx+1,yy+2,2,3,p[3]);if(!s.strike)r(xx+2,yy+11,3,1,p[0]);
      }
      poly([[x+side*11,y+18],[x+side*21,y+24],[x+side*21,y+38],[x+side*14,y+41],[x+side*12,y+32]],ink);
      line(x+side*15,y+23,x+side*17,y+36,p[3],4);
      gem(x,y+24,7,p===P.ice?P.brass:P.violet);
    };
    hand(33+grip,24,1,P.ice);hand(94-grip,26,-1,P.coral);
    gem(64,83,19,P.brass);gem(64,83,12,P.violet);
    plate(56,77,16,13,P.brass);r(59,80,10,7,P.violet[0]);r(59,80,10,2,P.ice[3]);r(61,84,2,2,P.ice[4]);
    line(48,99,80,99,P.brass[1],2);gem(64,102,3,P.brass);
    for(let i=0;i<3;i++){const x=57+i*7;line(x,13,x,42+(i%2)*8,P.violet[2],2);gem(x,46+(i%2)*8,3,P.coral);}
    if(s.strike){line(47,76,38,83,P.brass[4],2);line(80,76,89,84,P.brass[4],2);}
  });
})();
