// PROTOTYPE: five original visual alternatives each for Raid Log bosses 7, 8 and 9.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  const ink = '#101329';
  const P = {
    paper: ['#343453','#69718b','#abbaca','#e8e4d4','#fff6df'],
    blue: ['#152341','#244879','#397cba','#65bbdf','#b6eced'],
    gold: ['#38263d','#77513d','#b78248','#e3bd70','#fff0bc'],
    red: ['#342045','#70324f','#b84b60','#ed7b73','#ffd0a1'],
    mint: ['#172d43','#285966','#428e91','#80c6ac','#d7efd0'],
    purple: ['#291e46','#4b3b73','#8262a0','#bc91c2','#f1cce0'],
    dark: ['#11182c','#243149','#425571','#6c8294','#acc0c3'],
  };
  function painter(c) {
    const ctx = c.getContext('2d');
    const r = (x,y,w,h,col) => { ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
    const poly = (pts,col) => {
      const ys=pts.map(p=>p[1]);
      for(let y=Math.ceil(Math.min(...ys));y<Math.max(...ys);y++) {
        const xs=[];
        pts.forEach(([x,a],i)=>{ const [z,b]=pts[(i+1)%pts.length];if((a<=y&&b>y)||(b<=y&&a>y))xs.push(x+(y-a)*(z-x)/(b-a)); });
        xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)r(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,col);
      }
    };
    const ell=(x,y,rx,ry,col)=>{for(let j=-ry;j<=ry;j++){const w=Math.floor(rx*Math.sqrt(Math.max(0,1-j*j/(ry*ry))));r(x-w,y+j,2*w+1,1,col);}};
    const line=(x,y,a,b,col,w=1)=>{const n=Math.max(Math.abs(a-x),Math.abs(b-y),1);for(let i=0;i<=n;i++)r(x+(a-x)*i/n-w/2,y+(b-y)*i/n-w/2,w,w,col);};
    const orb=(x,y,rx,ry,p)=>{ell(x,y,rx,ry,ink);ell(x,y-1,rx-1,ry-1,p[1]);ell(x-2,y-3,rx-3,ry-4,p[2]);ell(x-4,y-5,Math.max(2,rx-6),Math.max(2,ry-7),p[3]);r(x-5,y-ry+3,4,2,p[4]);};
    const plate=(x,y,w,h,p)=>{r(x,y,w,h,ink);r(x+1,y+1,w-2,h-2,p[1]);r(x+2,y+2,w-5,h-5,p[2]);r(x+2,y+2,w-5,2,p[4]);r(x+2,y+4,2,h-8,p[3]);};
    const eye=(x,y,col=P.gold[4])=>{r(x-1,y-1,7,5,ink);r(x,y,5,2,col);r(x+3,y,1,3,ink);};
    const joint=(x,y,a,b,p,w=5)=>{line(x,y,a,b,ink,w+2);line(x,y,a,b,p[1],w);line(x-1,y-1,a-1,b-1,p[3],2);};
    const panel=(x,y,w,h,p=P.blue)=>{plate(x,y,w,h,P.paper);r(x+3,y+5,w-6,h-8,p[0]);r(x+4,y+6,w-8,2,p[3]);r(x+4,y+10,3,h-14,p[1]);r(x+9,y+10,w-14,2,p[2]);if(h>23)r(x+9,y+15,w-13,3,p[3]);};
    const seal=(x,y,p=P.gold)=>{orb(x,y,6,6,p);line(x-3,y,x,y+2,p[0],2);line(x,y+2,x+4,y-3,p[0],2);};
    const spark=(x,y,p=P.gold)=>{r(x-3,y,7,1,p[3]);r(x,y-3,1,7,p[3]);r(x,y,1,1,p[4]);};
    return {r,poly,ell,line,orb,plate,eye,joint,panel,seal,spark};
  }
  const concepts=[];
  const add=(boss,name,note,draw)=>concepts.push({boss,name,note,draw});
  // Blank Canvas: construction, iteration and signed delivery, in five bodies.
  add('The Blank Canvas','Release crane','A folded specification becomes a steel paper crane carrying a signed release after fourteen revisions.',(d,t,a)=>{
    const {poly,line,panel,seal,r,eye}=d, flap=[0,-3,0,3][t], thrust=a===1?9:a===0?-3:0;
    poly([[45,55],[10,24+flap],[34,32],[58,52],[99,19-flap],[85,56],[62,66]],ink);
    poly([[45,53],[13,27+flap],[38,38],[58,56],[96,23-flap],[82,53],[61,63]],P.paper[2]);
    poly([[14,28+flap],[45,42],[52,56]],P.paper[4]);poly([[59,55],[95,24-flap],[77,52]],P.blue[3]);
    line(59,55,87,31-flap,P.paper[4]);line(22,33+flap,46,48,P.blue[1]);line(73,47,88,30-flap,P.blue[1]);poly([[35,56],[65,48],[76,38],[80,20],[89,16],[93,21],[87,26],[85,47],[68,66],[46,72]],ink);
    poly([[38,57],[64,51],[79,43],[82,22],[88,19],[89,24],[82,49],[65,63],[47,68]],P.paper[3]);
    poly([[39,58],[64,55],[73,48],[64,64],[47,68]],P.blue[1]);poly([[88,19],[104,24+thrust],[88,26]],P.gold[3]);eye(83,22);
    line(48,68,44,82,P.gold[2],3);line(61,66,63,80,P.gold[2],3);panel(38,76,32,22);seal(69,91);if(a===1){line(74,84,94,76,P.gold[3],2);line(77,90,101,86,P.paper[4],2);}if(a===0)r(41,81,20,2,P.gold[4]);
    for(let i=0;i<7;i++){r(22+i*3,11,2,2,P.gold[i<t+2?3:1]);r(22+i*3,15,2,2,P.gold[2]);}
  });
  add('The Blank Canvas','Midnight foundry','A walking kiln forges screenshot plates into a notarized app, with fourteen teeth on its release wheel.',(d,t,a)=>{
    const {r,poly,orb,plate,panel,joint,seal,eye}=d, kick=a===1?12:0;
    for(let i=0;i<3;i++)orb(44+i*10,18-4*i+(t+i)%3,5,4,P.dark);
    plate(40,22,14,20,P.dark);joint(40,75,32,92,P.dark,10);joint(66,75,76,92,P.dark,10);plate(23,91,21,7,P.gold);plate(68,91,21,7,P.gold);
    joint(31,50,18,66,P.gold,8);joint(18,66,13,78,P.gold,8);joint(76,48,91,57-kick,P.gold,8);
    plate(25,36,56,46,P.dark);plate(31,44,42,29,P.gold);r(35,48,34,21,P.red[0]);
    poly([[37,68],[40,54],[45,59],[50,47-t],[54,58],[62,51],[66,68]],P.red[2]);poly([[44,68],[49,57],[53,63],[58,55],[61,68]],P.gold[3]);
    r(28,40,3,35,P.dark[3]);r(74,42,3,34,P.dark[0]);for(let j=0;j<3;j++)r(35+j*12,76,6,2,P.gold[2]);eye(35,38);eye(57,38);panel(78,37-kick,25,27);if(a===1){d.spark(99,17);d.spark(77,27);} seal(88,65-kick);
    for(let i=0;i<14;i++){const q=i*Math.PI/7; r(52+Math.cos(q)*18,80+Math.sin(q)*9,3,3,P.gold[2]);}orb(52,80,12,7,P.gold);r(46,78,12,3,P.paper[4]);
  });
  add('The Blank Canvas','Screenshot moth','A blank silk cocoon unfolds into a moth whose screenshot wings converge on a signed release.',(d,t,a)=>{
    const {poly,line,orb,panel,eye,seal}=d, f=a===0?8:a===1?-5:[0,2,4,2][t];
    poly([[52,45],[21+f,13],[8+f,18],[12+f,56],[34,66],[19+f,84],[39,94],[54,63]],ink);
    poly([[60,45],[88-f,13],[103-f,18],[99-f,56],[77,66],[91-f,84],[72,94],[57,63]],ink);
    poly([[49,46],[23+f,17],[12+f,21],[17+f,52],[43,62]],P.purple[2]);poly([[62,46],[86-f,17],[99-f,21],[94-f,52],[69,62]],P.blue[2]);
    poly([[43,62],[23+f,83],[39,89],[52,63]],P.purple[3]);poly([[69,62],[87-f,83],[72,89],[59,63]],P.mint[3]);
    line(16+f,24,43,56,P.purple[4],2);line(97-f,24,70,56,P.blue[4],2);line(31+f,75,40,83,P.purple[1],3);line(82-f,75,74,83,P.mint[1],3);panel(18+f,27,23,27,P.purple);panel(72-f,27,23,27,P.mint);line(31+f,58,43,77,P.gold[3],2);line(83-f,58,72,77,P.gold[3],2);
    orb(56,61,8,24,P.gold);orb(56,38,10,11,P.dark);eye(49,36);eye(59,36);line(51,29,44,17,P.gold[3],2);line(61,29,68,17,P.gold[3],2);seal(56,72);d.r(54,54+t*3,3,2,P.gold[4]);if(a===1){d.spark(27,65);d.spark(86,66);line(43,86,68,86,P.gold[3],2);}
  });
  add('The Blank Canvas','Revision weaver','A mechanical spider weaves fourteen screenshot rows into an installable app sealed at the hem.',(d,t,a)=>{
    const {joint,orb,panel,line,r,eye,seal}=d;
    for(let i=0;i<4;i++){const y=35+i*12, k=(t+i)%2*3, reach=a===1&&i===0?6:0;joint(45,y,22-i*3,y-12-k,P.purple);joint(22-i*3,y-12-k,10+i*3-reach,y+13,P.dark);joint(67,y,90+i*3,y-12+k,P.purple);joint(90+i*3,y-12+k,102-i*3,y+13,P.dark);}
    orb(56,35,20,22,P.purple);for(let j=0;j<4;j++){line(43+j*7,19,43+j*7,41,P.purple[1]);r(44+j*7,21,2,13,P.purple[3]);}orb(56,55,13,14,P.dark);eye(45,50);eye(60,50);
    panel(36,66,40,31);for(let i=0;i<14;i++)r(40,69+i*2,2,1,P.gold[3]);
    for(let i=0;i<4;i++)line(43+i*8,59,42+i*8,71+(a===0?4:0),P.paper[2]);seal(71,92);r(45+t*4,29,3,3,P.gold[4]);if(a===1){line(37,73,23,81,P.paper[3],2);line(75,73,89,82,P.paper[3],2);}r(48,16,16,3,P.paper[3]);r(44,22,24,3,P.purple[4]);
  });
  add('The Blank Canvas','Waxwing courier','A wax seal snail carries a stack of evolving app windows and ships the finished build on a ribbon.',(d,t,a)=>{
    const {poly,orb,panel,seal,joint,eye,line,r}=d, extend=a===1?9:a===0?-3:0;
    poly([[16,86],[29,72],[69,73],[83,58],[94,58],[97,76],[88,88],[60,96],[20,96],[10,91]],ink);
    poly([[17,86],[32,76],[70,77],[84,61],[92,61],[93,76],[85,85],[59,92],[18,93]],P.mint[2]);line(23,89,72,86,P.mint[4],2);
    orb(48,59,27,29,P.red);orb(48,59,19,21,P.gold);orb(48,59,13,14,P.red);seal(47,58);line(27,70,34,79,P.red[4],2);line(57,80,66,71,P.red[0],3);
    panel(22,14,35,27,P.purple);panel(29,23,36,29);panel(38,33,35,27,P.mint);
    joint(85,64,84+extend,46-t%2,P.mint,3);joint(92,65,100+extend/3,51+t%2,P.mint,3);eye(81+extend,44-t%2);eye(98+extend/3,49+t%2);
    poly([[38,77],[49,78],[44,100],[37,94],[30,99]],P.red[2]);r(36,84+t,9,2,P.gold[3]);if(a===1){seal(98,78);line(82,82,92,80,P.gold[3],2);}
  });
  // Data Bleed: four identities sharing a hidden route.
  add('Data Bleed Doppelganger','Partition jelly','Four isolated glass bells share one hidden nervous system that leaks identical records between them.',(d,t,a)=>{
    const {orb,line,r,eye,poly}=d;
    for(let i=0;i<4;i++){const x=23+i*23,y=33+(i%2)*13, p=[P.blue,P.mint,P.purple,P.gold][i];
      for(let j=0;j<3;j++){let ex=x-8+j*7+(t+j)%3*2;line(x-7+j*7,y+13,ex,79+(j%2)*15,p[1],3);line(ex,79+(j%2)*15,ex-5+(a===1?9:0),98-j*4,p[3],2);}
      orb(x,y,16,21,p);line(x+10,y-10,x+12,y+1,p[4]);poly([[x-11,y+4],[x-2,y-5],[x+10,y+4],[x+9,y+13],[x-9,y+13]],p[0]);eye(x-4,y+3);r(x-5,y-13,7,3,p[4]);if(a===0)r(x-4,y+10,7,3,P.red[2]);if(a===1)line(x,y+16,x-6,y+29,P.red[3],3);}
    for(let i=0;i<3;i++){line(24+i*23,49+(i%2)*13,47+i*23,49+((i+1)%2)*13,P.red[1],4);r(29+i*23+t*3,51+(i%2)*6,4,a===1?7:3,P.red[3]);}
  });
  add('Data Bleed Doppelganger','Carbon pack','Four wolf masks emerge from one carbon copy pelt, exposing the shared identity beneath separate stacks.',(d,t,a)=>{
    const {poly,orb,eye,joint,line,r}=d;
    poly([[24,49],[54,26],[82,44],[94,78],[79,98],[63,83],[49,100],[32,82],[13,91]],ink);
    poly([[27,51],[53,31],[78,47],[88,78],[79,91],[64,75],[49,94],[35,74],[18,84]],P.dark[2]);
    for(let i=0;i<4;i++){const x=28+i*18,y=32+(i%2)*22+(a===1?i*2:0),p=[P.paper,P.blue,P.gold,P.purple][i];
      joint(55,70,x,y+13,P.red,3);poly([[x-11,y+6],[x-13,y-20],[x-2,y-13],[x+10,y-18],[x+12,y+4],[x+3,y+18]],ink);poly([[x-8,y+4],[x-10,y-15],[x-2,y-9],[x+7,y-13],[x+9,y+3],[x+2,y+13]],p[2]);poly([[x-8,y],[x-2,y-6],[x+2,y+12]],p[4]);eye(x-5,y);r(x+1,y+8,4,3,ink);line(x+1,y+13,x+5,y+18+t%2,P.red[3],2);if(a===1){r(x-2,y+10,9,7,ink);for(let k=0;k<3;k++)r(x-1+k*3,y+10,1,3,P.paper[4]);}r(x+5,y-5+(t%3),2,1,p[4]);}
    for(let i=0;i<4;i++){r(40+i*8,76+(i%2)*4,3,9,P.red[3]);line(25+i*17,66,20+i*19,78,P.dark[3],2);}
  });
  add('Data Bleed Doppelganger','Grafted namespace','Four separate terrariums grow from a single root whose repeated identity seeps across their glass boundaries.',(d,t,a)=>{
    const {plate,joint,line,orb,r,poly}=d;
    joint(56,83,50,37,P.gold,12);joint(52,59,22,36,P.gold,6);joint(54,59,88,34,P.gold,6);
    for(let i=0;i<4;i++){const x=12+i*24,y=13+(i%2)*13,p=[P.mint,P.blue,P.purple,P.gold][i];plate(x,y,21,33,p);r(x+4,y+5,13,23,p[0]);joint(x+11,y+29,x+10,y+14,p,3);poly([[x+10,y+20],[x+3,y+13],[x+5,y+8],[x+11,y+14],[x+17,y+7],[x+18,y+16]],p[3]);r(x+7,y+23,8,3,P.red[3]);line(x+17,y+6,x+17,y+20,p[4]);r(x+5+t*2,y+19,2,2,p[3]);if(a===1){r(x+6,y+22,10,5,P.red[3]);line(x+11,y+28,54,67,P.red[2],2);}}
    for(let i=0;i<5;i++){const x=15+i*20;joint(56,74,x,94,P.gold,5);line(x,94,x-6,98,P.gold[3],2);}
    orb(55,68,9,10,P.red);r(51,65,9,3,P.paper[4]);line(55,61,30+t*8,43,P.red[3],a===1?4:2);
  });
  add('Data Bleed Doppelganger','Shared heart','A four chamber specimen pumps the same record through supposedly isolated circulatory loops.',(d,t,a)=>{
    const {orb,line,joint,plate,r,eye}=d, beat=a===1?3:t%2;
    for(let i=0;i<4;i++){let x=28+i*18;line(x,35,x-6,13,P.dark[2],5);line(x-6,13,x+5,8,P.paper[2],3);}
    joint(29,47,13,62,P.red,5);joint(13,62,24,84,P.red,5);joint(82,47,100,63,P.blue,5);joint(100,63,87,85,P.blue,5);
    [[39,39,P.red],[70,39,P.purple],[39,66,P.blue],[69,66,P.mint]].forEach(([x,y,p])=>{orb(x,y,20+beat,23,p);plate(x-7,y-5,14,10,P.dark);r(x-4,y-2,8,3,P.gold[3]);});
    d.poly([[29,73],[40,79],[54,94],[71,84],[83,71],[65,79],[55,86],[45,76]],P.red[1]);line(53,22,53,86,P.paper[3],2);line(22,52,89,52,P.paper[3],2);orb(54,54,9,10,P.red);eye(50,52);line(54,66,57,96,P.red[2],5);line(57,96,69,100,P.red[3],3);r(14,65+t*3,3,4,P.red[4]);r(98,65-t*3,3,4,P.blue[4]);if(a===1){line(19,47,8,37,P.red[3],3);line(91,48,106,38,P.blue[3],3);d.spark(8,34,P.red);d.spark(105,35,P.blue);}
  });
  add('Data Bleed Doppelganger','Fourfold rook','Four ivory process towers stand on one impossible folded base, with red records crossing the partition cuts.',(d,t,a)=>{
    const {poly,plate,r,line,eye}=d;
    poly([[15,73],[53,53],[99,71],[65,99],[15,89]],ink);poly([[17,73],[53,57],[95,72],[63,92]],P.purple[2]);poly([[17,74],[63,92],[63,98],[17,87]],P.purple[1]);poly([[63,92],[95,72],[95,81],[63,98]],P.purple[0]);
    [[24,35],[47,16],[72,31],[49,50]].forEach(([x,y],i)=>{const p=[P.paper,P.blue,P.mint,P.gold][i],lift=a===1&&i===3?-9:0;y+=lift;plate(x,y,19,33,p);for(let j=0;j<3;j++)r(x+j*7,y-5,5,9,p[3]);r(x+15,y+3,3,26,p[1]);r(x+3,y+4,2,22,p[4]);r(x+6,y+10,6,14,p[0]);eye(x+5,y+12,P.red[3]);r(x+3,y+29,13,2,p[4]);});
    line(30,71,62,86,P.red[2],3);line(62,86,84,69,P.red[2],3);r(35+t*5,73+t*2,4,3,P.red[4]);if(a===1){line(26,65,83,65,P.red[3],3);line(26,69,83,69,P.red[1]);}if(a===0)r(54,73,8,4,P.red[4]);
  });
  // Pixel Mimic: exact measurement, type and state parity rather than a chest.
  add('Pixel Mimic','Caliper mantis','A surveyor mantis measures component edges with caliper claws and attacks every mismatched pixel.',(d,t,a)=>{
    const {joint,orb,poly,line,r,eye}=d, reach=a===1?14:a===0?-6:0;
    joint(54,65,30,83,P.mint);joint(30,83,18,98,P.dark);joint(62,65,83,81,P.mint);joint(83,81,96,98,P.dark);
    poly([[52,43],[71,48],[81,69],[65,82],[47,68]],ink);poly([[54,46],[68,50],[76,68],[65,77],[51,66]],P.mint[2]);line(58,48,63,72,P.mint[4],2);line(68,55,73,68,P.mint[0],3);for(let i=0;i<3;i++)line(54,58+i*5,64,62+i*5,P.mint[1]);
    joint(53,48,30,39-reach/2,P.gold,5);joint(30,39-reach/2,15,59-reach,P.gold,4);joint(65,47,88,33,P.gold,5);joint(88,33,99,53-reach,P.gold,4);
    for(const x of [14,91]){r(x,45-reach,7,29,P.paper[2]);r(x-5,45-reach,13,3,P.paper[4]);r(x-5,68-reach,13,3,P.paper[4]);for(let y=49;y<66;y+=4)r(x+3,y-reach,4,1,P.dark[1]);}
    poly([[44,26],[70,25],[62,44],[50,44]],ink);poly([[47,28],[67,28],[60,41],[52,41]],P.mint[3]);eye(47,30);eye(59,29);line(50,25,43,12+t%2,P.gold[3]);line(63,25,73,9-t%2,P.gold[3]);r(55,53+t*3,2,2,P.paper[4]);if(a===1){line(22,48,88,48,P.gold[3]);d.spark(55,48,P.paper);}
  });
  add('Pixel Mimic','Registration ray','A glass ray aligns its screenshot wing layers until the registration marks coincide exactly.',(d,t,a)=>{
    const {poly,line,r,orb,eye}=d, f=[0,2,0,-2][t],off=a===0?7:a===1?0:3;
    poly([[54,33],[22,16+f],[7,32],[19,62],[47,76],[57,68],[86,75],[105,39],[88,17-f],[65,35]],ink);
    poly([[54,38],[23,20+f],[12,33],[23,58],[48,70],[56,62],[84,69],[100,40],[86,22-f],[65,40]],P.blue[1]);
    poly([[53,42],[25,26+f],[18,35],[30,54],[47,61]],P.blue[3]);poly([[63,43],[85,28-f],[94,40],[81,60],[65,59]],P.purple[3]);
    for(let i=0;i<3;i++){line(24+i*6,34+i*8,45+i*3,42+i*9,P.paper[3]);line(68+i*2,43+i*7,87-i*5,37+i*8,P.purple[4]);}
    line(25,31+f,43,42,P.blue[4],2);line(89,34-f,82,53,P.purple[1],2);orb(56,51,9,20,P.paper);r(54,55+t*2,3,2,P.gold[3]);if(a===1){line(28,74,84,74,P.paper[3]);line(28,77,84,77,P.blue[2]);}eye(49,43);eye(59,43);line(56,69,64+f,86,P.blue[3],3);line(64+f,86,53,100,P.blue[3],2);
    for(const [x,y] of [[24,23],[83,25],[29,59],[80,62]]){line(x-4,y,x+4,y,P.gold[4]);line(x,y-4,x,y+4,P.gold[4]);r(x+off,y+off,2,2,P.red[3]);}
  });
  add('Pixel Mimic','Weight warden','A knight made from type specimens weighs a reference glyph against its upgrade while wielding a hover colour swatch.',(d,t,a)=>{
    const {plate,poly,joint,line,r,eye}=d, lift=a===1?15:a===0?-4:0;
    joint(45,73,36,94,P.dark,9);joint(65,73,74,94,P.dark,9);plate(27,93,18,7,P.paper);plate(67,93,18,7,P.paper);
    poly([[39,43],[70,43],[78,72],[56,84],[32,71]],ink);poly([[41,46],[67,46],[73,69],[56,79],[37,68]],P.paper[2]);
    poly([[46,69],[53,50],[59,50],[66,69],[60,69],[58,63],[51,63],[50,69]],P.dark[0]);r(52,58,7,2,P.gold[3]);r(44,69,9,2,P.dark[0]);r(59,69,9,2,P.dark[0]);line(39,48,37,65,P.paper[4],2);line(68,52,72,68,P.paper[1],2);
    plate(43,19,24,24,P.dark);r(47,25,17,3,P.paper[4]);eye(46,31);eye(57,31);r(51,10,8,9,P.gold[2]);r(53,11+t,3,2,P.gold[4]);if(a===1){line(33,17,40,21,P.gold[3],2);line(30,25,39,26,P.gold[4],2);}
    joint(37,49,20,55,P.paper,6);plate(10,43,20,34,P.blue);for(let i=0;i<4;i++)r(14,48+i*6,12,5,[P.blue[1],P.blue[2],P.blue[3],P.purple[3]][i]);
    joint(71,48,90,48-lift,P.paper,6);line(90,64-lift,90,18-lift,P.gold[2],3);line(76,22-lift,103,22-lift,P.gold[3],2);
    for(const x of [78,100]){line(x,23-lift,x,34-lift+t%2,P.paper[2]);plate(x-5,34-lift+t%2,11,8,P.gold);r(x-2,29-lift,4,5,P.paper[3]);}
  });
  add('Pixel Mimic','Parity tailor','A dressmaker stitches the staging pattern onto a patched garment, using screenshot pins to close every visible seam.',(d,t,a)=>{
    const {poly,line,orb,joint,r,eye,plate}=d, spread=a===1?8:0;
    poly([[48,37],[66,37],[75,61],[94,94],[64,90],[53,99],[24,95],[37,62]],ink);
    poly([[49,40],[64,40],[70,62],[87,91],[64,86],[53,94],[30,92],[42,63]],P.purple[2]);poly([[49,42],[55,42],[50,92],[31,91],[43,63]],P.paper[2]);poly([[60,44],[65,46],[72,72],[86,91],[65,86]],P.purple[1]);
    line(42,70,35,88,P.paper[4],2);line(62,81,65,86,P.purple[4],2);for(let i=0;i<10;i++){r(53-i%2,46+i*4,4,1,P.gold[3]);}plate(59,66,12,13,P.blue);r(61,70,7,1,P.paper[3]);r(61,74,7,1,P.paper[3]);
    orb(57,28,11,12,P.paper);eye(49,27);eye(59,27);r(43,17,28,4,P.dark[2]);r(49,10,16,8,P.dark[2]);r(49,16,16,2,P.gold[3]);
    joint(43,47,25-spread,59,P.paper,4);joint(69,47,87+spread,51,P.paper,4);line(17-spread,36,29-spread,76,P.gold[3],2);line(88+spread,33,83+spread,76,P.paper[3],2);
    line(29-spread,76,52,82+t%3,P.gold[2]);line(52,82+t%3,83+spread,76,P.gold[2]);orb(18-spread,39,3,4,P.red);orb(24-spread,53,3,4,P.red);r(55,14,3,1+t,P.gold[3]);if(a===1){line(37,81,77,81,P.paper[4],2);r(53,77,4,9,P.gold[4]);}
  });
  add('Pixel Mimic','Difference specter','A cutout creature is visible only through screenshot differences, and its attack snaps the red and cyan contours into exact parity.',(d,t,a)=>{
    const {poly,line,r,eye}=d, off=a===1?0:a===0?6:2+t%2;
    const points=[[54,10],[70,22],[69,37],[88,41],[99,63],[83,59],[77,82],[87,95],[64,91],[57,74],[44,91],[20,96],[33,77],[30,54],[13,65],[21,42],[41,36],[40,22]];
    poly(points.map(([x,y])=>[x+off,y]),P.red[2]);poly(points.map(([x,y])=>[x-off,y+2]),P.blue[3]);poly(points,ink);
    for(let i=0;i<points.length;i++){const [x,y]=points[i],[u,v]=points[(i+1)%points.length];if(i%3!==1)line(x,y,u,v,P.paper[3]);}
    eye(44,29,P.paper[4]);eye(59,29,P.paper[4]);r(48,43,15,3,P.gold[3]);r(45,50,21,3,P.blue[3]);r(49,57,13,3,P.red[3]);for(let i=0;i<4;i++){r(40+i*8,65,3,2,P.paper[2]);}line(48,18,55,13,P.blue[4]);r(40+t*7,70,3,1,P.gold[2]);if(a===1){line(39,62,47,70,P.gold[4],2);line(47,70,71,43,P.gold[4],2);}
    [[20,24],[86,18],[15,80],[94,85]].forEach(([x,y],i)=>{line(x-3,y,x+3,y,P.gold[3]);line(x,y-3,x,y+3,P.gold[3]);if(a!==1)r(x+off,y+3+(t+i)%2,3,2,P.red[3]);});
  });
  const counts={};
  for(const entry of concepts){
    const n=counts[entry.boss]=(counts[entry.boss]||0)+1;
    for(const mode of ['idle','attack']){
      const frames=Array.from({length:mode==='idle'?4:3},(_,i)=>{
        const canvas=document.createElement('canvas');canvas.width=112;canvas.height=108;
        const ctx=canvas.getContext('2d');if(mode==='attack')ctx.translate(i===0?-2:i===1?2:0,i===0?1:0);
        const d=painter(canvas);entry.draw(d,mode==='idle'?i:0,mode==='attack'?i:-1);
        return canvas;
      });
      window.SpriteSheet.add(`Boss alts (GPT) · ${entry.boss}`,`Alt ${n} · ${entry.name} · ${mode}`,frames,{fps:mode==='idle'?6:4,note:entry.note});
    }
  }
})();
