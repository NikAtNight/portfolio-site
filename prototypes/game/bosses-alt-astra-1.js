// PROTOTYPE: five original silhouette studies for each of the first three bosses.
window.SpriteSheet = window.SpriteSheet || { groups: [], add(group, name, frames, opts = {}) {
  let g = this.groups.find(x => x.name === group); if (!g) this.groups.push(g = { name: group, items: [] });
  const i = g.items.findIndex(x => x.name === name), item = { name, frames, fps: opts.fps || 6, note: opts.note || '' };
  i >= 0 ? (g.items[i] = item) : g.items.push(item);
} };
(() => {
  const P = {
    copper: ['#251c35','#62354b','#ad5c48','#e39967','#ffe0a1'],
    teal: ['#172a40','#21515a','#348e83','#70c7ac','#d9edbb'],
    bone: ['#26253f','#625777','#a69bad','#ddd4c7','#fff1ce'],
    plum: ['#211a39','#53305f','#965080','#d68eac','#ffe0d1'],
    gold: ['#29223f','#65503e','#ae813e','#e4b65c','#ffebaa'],
    blue: ['#151f3c','#294775','#487cb0','#81b5d3','#d6e9e3'],
    red: ['#291d3b','#66364d','#b95361','#f38a76','#ffe2ad'],
    ink: ['#0b1022','#1e2944','#394765','#657592','#b9c6d1'],
    green: ['#182b3e','#2c595d','#5b9682','#a7cf9c','#f1edbd']
  };
  // Integer rasterization keeps every edge hard, including the diagonal facets.
  function painter() {
    const c = document.createElement('canvas'); c.width = 112; c.height = 104;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const dot = (x,y,col) => { g.fillStyle=col; g.fillRect(Math.round(x),Math.round(y),1,1); };
    const rect = (x,y,w,h,col) => { g.fillStyle=col; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
    function shape(points,p) {
      const xs=points.map(v=>v[0]), ys=points.map(v=>v[1]);
      const x0=Math.floor(Math.min(...xs)), x1=Math.ceil(Math.max(...xs)), y0=Math.floor(Math.min(...ys)), y1=Math.ceil(Math.max(...ys));
      const inside=(x,y)=>{let b=false;for(let i=0,j=points.length-1;i<points.length;j=i++) { const a=points[i],z=points[j];if((a[1]>y)!==(z[1]>y)&&x<(z[0]-a[0])*(y-a[1])/(z[1]-a[1])+a[0])b=!b;}return b;};
      for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) if(inside(x+.5,y+.5)) {
        const edge=!inside(x-.5,y+.5)||!inside(x+.5,y-.5)||!inside(x+1.5,y+.5)||!inside(x+.5,y+1.5);
        const t=((x-x0)/(x1-x0||1)*.42+(y-y0)/(y1-y0||1)*.58);
        dot(x,y,p[edge?(inside(x+.5,y-.5)?0:3):t<.22?4:t<.43?3:t<.76?2:1]);
      }
    }
    const box=(x,y,w,h,p)=>shape([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],p);
    const oval=(x,y,rx,ry,p)=>shape(Array.from({length:24},(_,i)=>[x+Math.cos(i*Math.PI/12)*rx,y+Math.sin(i*Math.PI/12)*ry]),p);
    function line(x,y,X,Y,w,p) {const n=Math.max(Math.abs(X-x),Math.abs(Y-y),1);for(let i=0;i<=n;i++){rect(x+(X-x)*i/n-w/2,y+(Y-y)*i/n-w/2,w,w,p[1]);}for(let i=0;i<=n;i++)rect(x+(X-x)*i/n-w/2,y+(Y-y)*i/n-w/2,Math.max(1,w-2),Math.max(1,w-2),p[3]);}
    const eye=(x,y,p=P.red)=>{rect(x-3,y-1,7,4,P.ink[0]);rect(x-2,y,4,2,p[3]);dot(x-2,y,p[4]);};
    const check=(x,y,col=P.teal[4])=>{rect(x,y+3,2,2,col);rect(x+2,y+5,2,2,col);for(let i=0;i<5;i++)rect(x+4+i,y+4-i,2,2,col);};
    const cross=(x,y,col=P.red[3])=>{for(let i=0;i<7;i++){dot(x+i,y+i,col);dot(x+6-i,y+i,col);}};
    const coin=(x,y,r=5)=>{oval(x,y,r,r,P.gold);line(x,y-r+2,x,y+r-2,1,P.bone);};
    const mail=(x,y)=>{box(x,y,14,10,P.bone);line(x+1,y+1,x+7,y+6,1,P.copper);line(x+7,y+6,x+12,y+1,1,P.copper);};
    const lock=(x,y,p=P.gold)=>{oval(x+5,y+3,4,5,p);box(x,y+3,11,10,p);rect(x+5,y+6,2,4,P.ink[0]);};
    const node=(x,y,r=6,p=P.copper)=>{oval(x,y,r,r,p);eye(x-1,y,P.teal);};
    const tooth=(x,y)=>shape([[x,y],[x+4,y],[x+1,y+7]],P.bone);
    return {c,g,dot,rect,shape,box,oval,line,eye,check,cross,coin,mail,lock,node,tooth};
  }
  const concepts=[];
  function add(boss,name,note,draw) {concepts.push({boss,name,note,draw});}
  add('Recursive Hydra','Switchboard matriarch','A copper switchboard grows branching operator arms until a physical breaker stops the recursive calls.',(d,t,a)=>{
    const {shape,box,oval,line,eye,node,rect,lock}=d, k=a===1?7:a===0?-3:0;
    for(let s of [-1,1]) {line(56,60,56+s*23,41,7,P.copper);for(let j=0;j<3;j++){const x=56+s*(27+j*7),y=18+j*18+(j%2?t:0);line(56+s*23,41,x+s*k,y,4,P.copper);node(x+s*k,y,6,P.copper);line(x+s*k,y,x+s*k+s*4,y-9,2,P.teal);}}
    shape([[39,34],[66,30],[77,43],[74,78],[64,91],[35,88],[30,68]],P.copper);
    box(37,42,28,27,P.ink);for(let j=0;j<3;j++)for(let i=0;i<3;i++){oval(42+i*8,48+j*8,2,2,P.gold);}
    eye(42,35,P.teal);eye(57,34,P.teal);shape([[39,73],[66,72],[62,82],[44,85]],P.gold);
    line(39,85,30,95,6,P.ink);line(65,85,76,95,6,P.ink);lock(50,76,P.blue);
    rect(37,46+(t%3)*8,3,2,P.teal[4]);
  });
  add('Recursive Hydra','Nesting regent','A porcelain monarch opens into smaller copies of itself, turning one polite request into an army of delegates.',(d,t,a)=>{
    const {shape,oval,line,eye,box,check}=d;
    function doll(x,y,s,p,open) {shape([[x-13*s,y],[x+13*s,y],[x+19*s,y+34*s],[x+13*s,y+49*s],[x-15*s,y+48*s],[x-20*s,y+34*s]],p);oval(x,y-4*s,13*s,15*s,p);shape([[x-12*s,y-12*s],[x-13*s,y-24*s],[x-4*s,y-18*s],[x,y-27*s],[x+6*s,y-17*s],[x+12*s,y-24*s],[x+11*s,y-10*s]],P.gold);eye(x-5*s,y-5*s,P.plum);eye(x+5*s,y-5*s,P.plum);oval(x,y+24*s,12*s,17*s,P.ink);if(open)line(x-10*s,y+13*s,x+10*s,y+10*s,2,P.gold);}
    doll(62,41,1.1,P.bone,true);doll(a===1?39:51, a===0?61:58,.52,P.plum,true);doll(a===1?24:46,70,.26,P.gold,false);
    for(let i=0;i<3;i++){const x=17+i*14+(a===1?-7:0), y=30+i*18+(i%2?t:0);line(47,63,x,y,1,P.gold);doll(x,y,.23,P.teal,false);}
    shape([[77,50],[88,46-t],[94,51],[83,60]],P.bone);check(59,81,P.gold[4]);
  });
  add('Recursive Hydra','Brood of five','A memo-winged moth releases five larvae, each carrying its own smaller clutch of review requests.',(d,t,a)=>{
    const {shape,oval,line,eye,node,rect}=d;const spread=a===1?7:a===0?-5:t;
    for(let s of [-1,1]) {
      shape([[55,48],[56+s*(36+spread),13],[56+s*48,35],[56+s*33,56],[56+s*44,78],[56+s*14,85],[53,62]],P.plum);
      shape([[55+s*8,46],[56+s*(33+spread),22],[56+s*36,38],[56+s*18,57]],P.bone);
      for(let j=0;j<3;j++)line(56+s*(15+j*5),40+j*3,56+s*(29+j*3),30+j*4,1,P.copper);
      oval(56+s*26,68,7,9,P.copper);oval(56+s*26,67,3,5,P.gold);
      line(54+s*5,31,54+s*14,15-t,2,P.gold);
    }
    oval(55,57,9,25,P.ink);for(let j=0;j<5;j++)boxBand(j);
    function boxBand(j){d.box(49,41+j*7,12,4,P.gold);}
    oval(54,32,10,9,P.copper);eye(49,31,P.teal);eye(58,31,P.teal);
    for(let i=0;i<5;i++){const x=28+i*13,y=89+((i+t)%2)*3;line(53,76,x,y,1,P.plum);node(x,y,4,P.teal);rect(x-2,y-7,1,3,P.gold[3]);for(let side of [-1,1]){line(x,y+2,x+side*4,y+6,1,P.teal);rect(x+side*4-1,y+5,2,2,P.gold[3]);}}
  });
  add('Recursive Hydra','Callstack reef','A walking coral colony forks its bright polyps at every joint while a config clamp grips the trunk.',(d,t,a)=>{
    const {shape,line,oval,node,eye,box,lock}=d;
    shape([[39,61],[68,56],[79,76],[71,90],[24,94],[31,79]],P.blue);
    for(let i=0;i<5;i++) {const x=19+i*17,y=25+(i%2)*15+(i===2?-3:0);line(51,75,x,y+10,7,P.teal);for(let s of [-1,1]){let xx=x+s*(7+(a===1?4:0)),yy=y-8+(t+i)%3;line(x,y+12,xx,yy,4,P.teal);oval(xx,yy,5,7,P.copper);oval(xx,yy-1,2,3,P.bone);}node(x,y+7,5,P.teal);}
    box(35,64,35,10,P.gold);lock(46,65,P.ink);eye(37,82);eye(56,80);
    for(let i=0;i<4;i++)shape([[30+i*13,88],[35+i*13,86],[39+i*13,97],[24+i*13,97]],P.blue);
  });
  add('Recursive Hydra','Fork engine','Five mechanical forks feed a central black engine that duplicates its own sockets until the hard limit catches.',(d,t,a)=>{
    const {shape,box,line,oval,eye,rect}=d;
    const ends=[[24,26],[55,20],[87,27],[93,62],[25,72]];
    ends.forEach(([x,y],i)=>{let dy=(t+i)%2*2;line(56,51,x,y+dy,5,P.gold);for(let s of [-1,1]){line(x,y+dy,x+s*8,y-9+dy,3,P.gold);box(x+s*8-4,y-14+dy,8,7,P.ink);rect(x+s*8-2,y-13+dy,4,2,P.teal[3]);rect(x+s*8-2,y-10+dy,3,2,P.ink[0]);}});
    shape([[44,31],[64,27],[77,43],[75,66],[58,79],[35,65],[32,45]],P.ink);
    shape([[47,37],[62,34],[69,45],[67,61],[55,69],[42,59],[40,45]],P.gold);
    shape([[48,43],[60,40],[64,49],[61,58],[50,61],[45,53]],P.ink);eye(52,49,P.teal);
    box(45,70,21,5,P.gold);for(let j=0;j<4;j++)rect(47+j*5,71,2,3,P.ink[0]);line(45,73,37,91,6,P.gold);line(65,72,77,92,6,P.gold);box(26,91,19,6,P.ink);box(72,92,18,6,P.ink);
    if(a===1){for(let i=0;i<3;i++)box(6+i*10,43+i*8,7,7,P.teal);}else{rect(51,78+t,9,2,P.teal[3]);}
  });
  add('The Unverified Claim','Hollow laureate','A medal-armoured knight wears victory laurels over an empty chest where the missing test evidence should be.',(d,t,a)=>{
    const {shape,box,oval,line,eye,check,cross}=d;
    shape([[38,45],[71,42],[82,79],[66,88],[32,81]],P.blue);
    for(let s of [-1,1]){line(55+s*15,57,55+s*31,71-(a===1?20:0),7,P.gold);line(55+s*9,81,55+s*14,94,7,P.ink);for(let j=0;j<5;j++)oval(55+s*(14-j),17+j*5,3,5,P.gold);}
    oval(55,30,14,16,P.gold);box(41,29,27,7,P.ink);eye(46,32,P.blue);eye(59,32,P.blue);
    shape([[37,45],[72,45],[68,77],[55,86],[40,76]],P.gold);shape([[43,51],[65,51],[62,74],[55,79],[45,73]],[P.ink[0],P.ink[0],P.ink[0],P.ink[1],P.ink[1]]);
    for(let i=0;i<3;i++){box(48,55+i*7,5,5,P.blue);d.rect(49,56+i*7,3,3,P.ink[0]);}
    const sy=a===1?38:a===0?67:62+t;box(13,sy,19,23,P.bone);check(17,sy+6,P.teal[1]);cross(49,69,P.red[3]);
    shape([[73,51],[83,48],[91,68],[85,80],[74,73]],P.blue);
  });
  add('The Unverified Claim','Applause bird','A brass loudspeaker bird announces success while its fan of test indicators remains conspicuously dark.',(d,t,a)=>{
    const {shape,oval,line,box,eye,rect,cross}=d;
    for(let i=0;i<7;i++){const ang=(i-3)*.38, x=58+Math.sin(ang)*42,y=52-Math.cos(ang)*(a===0?31:a===1?39:37)+(i%2?t:0);line(58,63,x,y,5,P.teal);oval(x,y,8,12,P.teal);oval(x,y-2,5,6,P.gold);box(x-2,y-5,5,6,P.ink);}
    oval(59,65,19,21,P.blue);shape([[48,54],[74,62],[65,80],[43,74]],P.teal);
    line(50,79,42,94,4,P.gold);line(66,81,74,94,4,P.gold);line(34,95,47,95,3,P.gold);line(69,95,82,95,3,P.gold);
    line(50,64,39,45,9,P.blue);oval(37,40,11,13,P.blue);eye(34,35,P.gold);
    const x=a===1?9:14;shape([[35,42],[x,29-t],[x,56+t],[36,48]],P.gold);oval(x,43,4,13+t,P.ink);oval(x,42,2,9,P.copper);
    if(a===1){line(4,28,8,31,2,P.bone);line(3,43,7,43,2,P.bone);line(4,58,8,54,2,P.bone);}cross(56,63);
  });
  add('The Unverified Claim','Burden of proof','A crab-shaped balance judges a heavy success medal against an empty cage meant to hold the test results.',(d,t,a)=>{
    const {shape,box,oval,line,eye,coin,check}=d;
    for(let s of [-1,1])for(let j=0;j<3;j++){line(56+s*17,72,56+s*(30+j*5),78+j*6,4,P.copper);line(56+s*(30+j*5),78+j*6,56+s*(35+j*5),91+j*2,3,P.copper);}
    shape([[36,58],[69,55],[80,68],[71,82],[39,85],[28,74]],P.copper);eye(41,65,P.teal);eye(60,63,P.teal);for(let j=0;j<3;j++){box(43+j*8,73,5,5,P.gold);d.rect(44+j*8,74,3,3,P.ink[0]);}
    line(55,61,55,20,6,P.gold);shape([[55,12],[63,24],[55,31],[47,24]],P.gold);
    const tilt=a===1?12:a===0?-5:t;line(19,34+tilt,91,28-tilt,4,P.gold);
    for(let s of [-1,1]){const x=s<0?20:88,y=s<0?34+tilt:28-tilt;line(x-9,y,x-9,y+22,1,P.gold);line(x+9,y,x+9,y+22,1,P.gold);shape([[x-15,y+22],[x+15,y+22],[x+9,y+29],[x-9,y+29]],P.gold);if(s<0){oval(x,y+16,8,8,P.gold);check(x-4,y+11,P.copper[1]);}else{box(x-6,y+9,12,13,P.blue);d.rect(x-4,y+11,8,9,P.ink[0]);line(x-2,y+9,x-2,y+21,1,P.blue);}}
  });
  add('The Unverified Claim','Curtain sovereign','A theatre puppet bows behind a smiling approval mask while cut strings expose the absent verification.',(d,t,a)=>{
    const {shape,box,oval,line,eye,check,cross,rect}=d;
    line(23,12,86,12,3,P.gold);line(55,6,55,19,3,P.gold);
    for(let x of [31,49,74]){line(x,14,x,30+t,1,P.blue);line(x+2,36+t,x+2,43+t,1,P.blue);}
    shape([[42,43],[70,40],[78,70],[92,90],[69,85],[56,97],[39,87],[23,90],[36,66]],P.plum);
    shape([[43,47],[55,60],[42,87],[33,87]],P.copper);shape([[66,48],[58,62],[69,87],[78,87]],P.red);
    oval(55,33+t,14,17,P.bone);rect(45,29+t,8,2,P.ink[0]);rect(59,28+t,7,2,P.ink[0]);shape([[46,37+t],[63,37+t],[58,44+t],[51,44+t]],P.ink);
    const hand=a===1?32:a===0?69:58+t;line(40,50,22,hand+6,5,P.bone);line(70,49,85,63,5,P.bone);box(13,hand,15,18,P.gold);check(15,hand+4,P.copper[1]);
    box(48,61,15,17,P.ink);rect(51,64,9,10,P.ink[0]);cross(52,66);for(let j=0;j<3;j++)oval(55,82+j*5,1,1,P.gold);
  });
  add('The Unverified Claim','Premature trophy','A volatile laboratory trophy foams out a victory sign before its row of test vials has produced a result.',(d,t,a)=>{
    const {shape,box,oval,line,eye,check,rect}=d;
    for(let s of [-1,1]){oval(55+s*24,45,14,20,P.gold);oval(55+s*25,44,9,14,P.ink);}
    box(33,29,44,6,P.gold);shape([[36,35],[74,35],[70,61],[59,72],[59,84],[73,88],[75,95],[34,95],[36,88],[50,84],[50,72],[39,60]],P.gold);
    shape([[41,39],[68,39],[65,60],[54,66],[44,57]],P.teal);eye(47,46,P.bone);eye(60,46,P.bone);
    for(let i=0;i<5;i++){const x=36+i*9,y=26-(i%2)*8-t+(a===0?5:0);oval(x,y,7,6,P.teal);}
    check(49,12-(a===1?5:0),P.teal[4]);line(59,54,52,61,2,P.ink);line(52,61,58,68,2,P.ink);
    for(let i=0;i<3;i++){box(18+i*13,77,8,17,P.blue);box(20+i*13,80,4,11,P.ink);rect(19+i*13,77,6,2,P.bone[3]);}
    if(a===1){line(45,25,23,16,4,P.teal);line(23,16,12,34,3,P.teal);oval(12,36,5,7,P.teal);oval(80,23,3,3,P.teal);}
  });
  add('Phantom Charge','Toll ferryman','A split-hulled ferryman takes the gold fare while the passenger token cannot cross the gap between hosts.',(d,t,a)=>{
    const {shape,box,oval,line,eye,coin,mail,lock}=d;
    line(88,12,77,94,3,P.copper);shape([[76,84],[84,86],[82,98],[74,97]],P.copper);
    shape([[43,26],[61,23],[69,37],[65,65],[78,76],[37,76],[43,56]],P.blue);oval(52,29,9,11,P.bone);eye(47,29,P.teal);shape([[38,21],[57,14],[69,24],[55,22],[43,27]],P.blue);shape([[63,38],[76+t*2,45],[68+t,61],[62,56]],P.blue);
    const fare=a===1?35:a===0?58:51+t;line(45,47,25,fare+4,5,P.blue);coin(24,fare,6);line(64,44,84,47,4,P.blue);
    shape([[11,72],[47,75],[44,91],[28,95],[17,86]],P.copper);shape([[58,76],[99,70],[87,91],[61,94]],P.copper);
    line(12,72,47,75,3,P.gold);line(58,76,99,70,3,P.gold);mail(23,76);lock(72,77,P.gold);
    for(let i=0;i<3;i++)line(29+i*19,98,39+i*19,98+(t%2),1,P.teal);
    line(49,79,52,82,2,P.red);line(55,86,53,90,2,P.red);
  });
  add('Phantom Charge','Deadline scorpion','An hourglass scorpion spends the signup timer while its coin-tipped sting charges before the success marker appears.',(d,t,a)=>{
    const {shape,box,oval,line,eye,coin,lock,rect}=d;
    const pts=a===1?[[74,65],[93,55],[95,37],[76,25],[48,33],[30,48]]:a===0?[[74,65],[91,51],[91,27],[82,14],[67,12],[61,22]]:[[74,65],[91,51],[91,31],[78,18],[60,18],[49,30]];
    for(let i=0;i<pts.length-1;i++)line(...pts[i],...pts[i+1],7,P.plum);
    pts.slice(1).forEach(([x,y])=>oval(x,y,5,5,P.plum));const tip=pts[5];line(tip[0],tip[1],tip[0]-2,tip[1]+4+t,3,P.gold);coin(tip[0]-2,tip[1]+4+t,7);
    for(let s of [-1,1])for(let j=0;j<3;j++){line(51+s*14,72,51+s*(23+j*4),82+j*4,4,P.plum);line(51+s*(23+j*4),82+j*4,51+s*(30+j*4),89+j*3,2,P.plum);}
    oval(52,71,23,16,P.plum);box(42,51,22,4,P.gold);box(42,80,22,4,P.gold);
    shape([[44,55],[62,55],[55,66],[62,80],[44,80],[51,66]],P.blue);shape([[47,57],[59,57],[53,63]],P.gold);shape([[47,78],[53,70+t],[59,78]],P.gold);
    eye(30,67,P.gold);line(31,73,18,66,6,P.plum);shape([[19,57],[12,64],[14,76],[26,79],[26,72],[19,69]],P.plum);lock(69,64,P.ink);
  });
  add('Phantom Charge','Split-host collector','A two-sided vending automaton accepts the email token on one half and debits a coin on its locked billing half.',(d,t,a)=>{
    const {shape,box,oval,line,eye,coin,mail,lock,rect}=d;
    line(35,77,30,94,8,P.blue);line(76,77,82,94,8,P.copper);box(19,93,19,6,P.ink);box(77,93,19,6,P.ink);
    shape([[24,23],[48,17],[51,77],[27,83],[20,67]],P.blue);shape([[61,17],[88,23],[92,68],[82,83],[61,77]],P.copper);
    box(28,29,18,17,P.ink);mail(30,32);box(66,29,18,17,P.ink);lock(70,31);
    eye(35,23,P.teal);eye(76,23,P.red);box(29,54,16,12,P.teal);d.check(32,56);box(66,53,19,13,P.ink);rect(68,56,15,2,P.red[2]);
    line(23,49,12,62,6,P.blue);line(88,48,98,a===0?51:a===1?58:60+t,6,P.copper);coin(a===1?94:98,a===1?84:a===0?54:63+t,6);if(a===1){line(98,65,96,73,2,P.gold);d.rect(68,56,15,2,P.red[4]);}
    line(48,40,53,43,3,P.blue);line(61,49,57,46,3,P.copper);d.cross(51,57);
    for(let y=68;y<77;y+=3){rect(31,y,12,1,P.blue[0]);rect(68,y,12,1,P.copper[0]);}
  });
  add('Phantom Charge','Receipt siphon','A glass siphon jellyfish drains gold through a severed session pipe and trails the receipt of a failed signup.',(d,t,a)=>{
    const {shape,box,oval,line,eye,coin,mail,lock,rect}=d;
    for(let i=0;i<5;i++){const x=29+i*12, dx=((i+t)%3-1)*4;line(x,56,x+dx,73,4,P.teal);line(x+dx,73,x+dx-6,91-(i%2)*7,3,P.blue);}
    shape([[19,50],[25,29],[42,17],[65,15],[82,27],[92,48],[85,60],[24,61]],P.blue);
    shape([[28,46],[33,31],[46,23],[65,21],[79,33],[82,47]],P.teal);
    coin(54,a===1?45:a===0?30:36+t,10);eye(40,50,P.bone);eye(67,50,P.bone);
    line(20,50,11,50,5,P.gold);line(11,50,11,26,5,P.gold);line(11,26,21,26,5,P.gold);mail(13,12);
    line(88,49,101,49,5,P.gold);line(101,49,101,35,5,P.gold);lock(96,15,P.ink);d.cross(97,28);
    shape([[51,59],[67,59],[65,88],[61,91],[58,88],[55,92],[50,89]],P.bone);for(let i=0;i<4;i++)rect(54,64+i*5,9-(i%2)*3,1,P.blue[1]);
    if(a===1){coin(19,79,4);coin(88,82,4);}
  });
  add('Phantom Charge','Escrow angler','An armoured anglerfish lures a signup token toward a locked throat while a separate lower jaw has already swallowed the fee.',(d,t,a)=>{
    const {shape,oval,line,eye,coin,mail,lock,tooth}=d;
    const lure=a===0?7:a===1?-6:0;line(64,40,68,17,3,P.teal);line(68,17,46+lure,9,3,P.teal);line(46+lure,9,29+lure,20+t,3,P.teal);oval(28+lure,26+t,10,11,P.gold);mail(21+lure,22+t);
    shape([[76,43],[100,31],[94,53],[105,68],[79,67]],P.plum);
    shape([[26,44],[42,29],[70,29],[86,44],[87,69],[73,83],[49,85],[30,72],[19,56]],P.teal);
    shape([[23,48],[49,48],[58,58],[49,73],[26,69]],P.ink);eye(40,41,P.gold);
    for(let i=0;i<4;i++)tooth(24+i*7,48);
    const drop=a===1?6:a===0?-2:t;shape([[25,75+drop],[49,79+drop],[70,76+drop],[66,89+drop],[42,93+drop],[22,84+drop]],P.plum);coin(45,83+drop,6);
    lock(60,51,P.gold);shape([[59,67],[71,63],[65,79],[55,83]],P.blue);
    for(let i=0;i<3;i++)line(76+i*3,46,76+i*3,62,1,P.teal);d.box(56,36,6,5,P.bone);d.rect(57,37,4,3,P.ink[0]);
  });
  concepts.forEach(({boss,name,note,draw},i)=>{
    const n=i%5+1;
    for(const mode of ['idle','attack']) {
      const frames=Array.from({length:mode==='idle'?4:3},(_,f)=>{
        const d=painter(), t=mode==='idle'?[0,1,2,1][f]:[1,2,0][f];
        draw(d,t,mode==='attack'?f:-1); return d.c;
      });
      window.SpriteSheet.add(`Boss alts (GPT) · ${boss}`,`Alt ${n} · ${name} · ${mode}`,frames,{fps:mode==='idle'?6:4,note});
    }
  });
})();
